// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";

import "../contracts/VaultGuard.sol";
import "../contracts/PayrollEngine.sol";
import "../contracts/mocks/MockERC20.sol";
import "../contracts/bridge/ZecBridgeClient.sol";
import "./utils/FheTest.sol";
import "./utils/PermissionHelper.sol";
import {Permission} from "@fhenixprotocol/contracts/access/Permissioned.sol";
import {ZecTypes} from "../contracts/interfaces/IZecBridge.sol";

contract VaultGuardTest is Test, FheTest {
    VaultGuard private vault;
    PayrollEngine private payrollEngine;

    MockERC20 private ethToken;
    MockERC20 private usdcToken;
    MockERC20 private wbtcToken;
    ZecBridgeClient private zecBridge;

    PermissionHelper private permissionHelper;

    address private owner;
    uint256 private ownerPrivateKey;
    address private signer;
    address private employee = address(0xC0DE);

    function setUp() public {
        initializeFhe();

        ownerPrivateKey = 0xA11CE;
        owner = vm.addr(ownerPrivateKey);
        signer = vm.addr(0xB0B);

        payrollEngine = new PayrollEngine();
        zecBridge = new ZecBridgeClient(address(this));
        vault = new VaultGuard(payrollEngine, zecBridge);
        permissionHelper = new PermissionHelper(address(vault));

        ethToken = new MockERC20("Ethereum", "ETH", 18);
        usdcToken = new MockERC20("USD Coin", "USDC", 18);
        wbtcToken = new MockERC20("Wrapped BTC", "WBTC", 18);

        _seedOwnerBalances();
        _initializeVault();
    }

    function testInitializeVaultStoresConfig() public view {
        VaultGuard.VaultConfig memory config = vault.getVaultConfig(owner);
        assertEq(config.owner, owner);
        assertEq(config.authorizedSigners.length, 1);
        assertEq(config.authorizedSigners[0], signer);

        Permission memory permission = permissionHelper.generate(owner, ownerPrivateKey);
        string memory sealedBalance = vault.encryptedBalanceOf(owner, address(usdcToken), permission);
        assertEq(unseal(sealedBalance), 0);
    }

    function testPayrollExecutionDisbursesFunds() public {
        vm.startPrank(owner);
        vault.deposit(address(usdcToken), 500 ether, encrypt128(500 ether));

        uint64 streamDuration = 30 days;
        uint256 salary = 60 ether;
        uint256 ratePerSecond = salary / streamDuration;
        vault.schedulePayroll(
            keccak256("employee1"),
            encrypt128(ratePerSecond),
            payable(employee),
            ratePerSecond,
            address(usdcToken),
            streamDuration
        );
        vm.stopPrank();

        vm.warp(block.timestamp + streamDuration);
        uint256 expectedAmount = ratePerSecond * streamDuration;
        ZecTypes.ShieldedTransfer memory transfer = ZecTypes.ShieldedTransfer({
            vault: owner,
            recipientDiversifier: keccak256("diversifier"),
            recipientPk: keccak256("pk"),
            metadata: bytes("payroll"),
            encryptedAmount: keccak256("60usdc")
        });

        vm.prank(owner);
        vault.claimPayrollStream(owner, 0, expectedAmount, encrypt128(expectedAmount), transfer);

        assertEq(usdcToken.balanceOf(address(zecBridge)), expectedAmount);
        bytes32[] memory auditLog = vault.getEncryptedAuditLog(owner);
        assertGt(auditLog.length, 0);
    }

    function testPartialStreamWithdrawal() public {
        vm.startPrank(owner);
        vault.deposit(address(usdcToken), 100 ether, encrypt128(100 ether));

        uint64 streamDuration = 3600; // 1 hour
        uint256 ratePerSecond = 1e15; // 0.001 token/sec
        uint256 streamId = vault.schedulePayroll(
            keccak256("stream-employee"),
            encrypt128(ratePerSecond),
            payable(employee),
            ratePerSecond,
            address(usdcToken),
            streamDuration
        );
        vm.stopPrank();

        uint64 halfDuration = streamDuration / 2;
        vm.warp(block.timestamp + halfDuration);
        uint256 firstClaim = ratePerSecond * halfDuration;
        ZecTypes.ShieldedTransfer memory transfer1 = ZecTypes.ShieldedTransfer({
            vault: owner,
            recipientDiversifier: keccak256("diversifier1"),
            recipientPk: keccak256("pk1"),
            metadata: bytes("payroll:partial1"),
            encryptedAmount: keccak256("partial1")
        });

        vm.prank(owner);
        vault.claimPayrollStream(owner, streamId, firstClaim, encrypt128(firstClaim), transfer1);
        assertEq(usdcToken.balanceOf(address(zecBridge)), firstClaim);

        vm.warp(block.timestamp + halfDuration);
        uint256 secondClaim = ratePerSecond * halfDuration;
        ZecTypes.ShieldedTransfer memory transfer2 = ZecTypes.ShieldedTransfer({
            vault: owner,
            recipientDiversifier: keccak256("diversifier2"),
            recipientPk: keccak256("pk2"),
            metadata: bytes("payroll:partial2"),
            encryptedAmount: keccak256("partial2")
        });

        vm.prank(owner);
        vault.claimPayrollStream(owner, streamId, secondClaim, encrypt128(secondClaim), transfer2);
        assertEq(usdcToken.balanceOf(address(zecBridge)), firstClaim + secondClaim);
    }

    function testBridgeQueueLifecycle() public {
        vm.startPrank(owner);
        vault.deposit(address(usdcToken), 10_000 ether, encrypt128(10_000 ether));

        uint64 streamDuration = 1 days;
        uint256 salary = 1_000 ether;
        uint256 ratePerSecond = salary / streamDuration;
        uint256 streamId = vault.schedulePayroll(
            keccak256("bridge-employee"),
            encrypt128(ratePerSecond),
            payable(address(0)),
            ratePerSecond,
            address(usdcToken),
            streamDuration
        );
        vm.stopPrank();

        vm.warp(block.timestamp + streamDuration);
        uint256 claimAmount = ratePerSecond * streamDuration;
        ZecTypes.ShieldedTransfer memory transfer = ZecTypes.ShieldedTransfer({
            vault: owner,
            recipientDiversifier: keccak256("bridge-diversifier"),
            recipientPk: keccak256("bridge-pk"),
            metadata: abi.encodePacked("salary:", streamId),
            encryptedAmount: keccak256("bridge-amount")
        });

        vm.prank(owner);
        vault.claimPayrollStream(owner, streamId, claimAmount, encrypt128(claimAmount), transfer);

        (, , bool processed, bytes32 commitment, bytes32 txId) = zecBridge.getQueuedTransfer(0);
        assertFalse(processed);
        assertEq(commitment, zecBridge.getCommitments()[0]);
        assertEq(txId, bytes32(0));

        bytes32 zcashTxId = keccak256("zcash-tx");
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", owner));
        zecBridge.markTransferProcessed(0, zcashTxId);

        vm.prank(address(this));
        zecBridge.markTransferProcessed(0, zcashTxId);
        (, , bool processedAfter, , bytes32 recordedTxId) = zecBridge.getQueuedTransfer(0);
        assertTrue(processedAfter);
        assertEq(recordedTxId, zcashTxId);
    }

    function _seedOwnerBalances() private {
        ethToken.mint(owner, 1_000_000 ether);
        usdcToken.mint(owner, 1_000_000 ether);
        wbtcToken.mint(owner, 1_000_000 ether);
    }

    function _initializeVault() private {
        address[] memory signers = new address[](1);
        signers[0] = signer;

        vm.prank(owner);
        vault.initializeVault(signers);

        vm.startPrank(owner);
        ethToken.approve(address(vault), type(uint256).max);
        usdcToken.approve(address(vault), type(uint256).max);
        wbtcToken.approve(address(vault), type(uint256).max);
        vm.stopPrank();
    }
}

