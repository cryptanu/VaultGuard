// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";

import "../contracts/VaultGuard.sol";
import "../contracts/ThresholdEngine.sol";
import "../contracts/PayrollEngine.sol";
import "../contracts/mocks/MockERC20.sol";
import "../contracts/mocks/MockPhantomSwap.sol";
import "../contracts/mocks/MockZecBridge.sol";
import "./utils/FheTest.sol";
import "./utils/PermissionHelper.sol";
import {Permission} from "@fhenixprotocol/contracts/access/Permissioned.sol";
import {ZecTypes} from "../contracts/interfaces/IZecBridge.sol";

contract VaultGuardTest is Test, FheTest {
    VaultGuard private vault;
    ThresholdEngine private thresholdEngine;
    PayrollEngine private payrollEngine;
    MockPhantomSwap private phantomSwap;

    MockERC20 private ethToken;
    MockERC20 private usdcToken;
    MockERC20 private wbtcToken;
    MockZecBridge private zecBridge;

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

        thresholdEngine = new ThresholdEngine();
        payrollEngine = new PayrollEngine(address(0));
        phantomSwap = new MockPhantomSwap();
        zecBridge = new MockZecBridge();
        vault = new VaultGuard(address(thresholdEngine), payrollEngine, phantomSwap, zecBridge);
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
        assertEq(config.rebalanceDeviationBps, 500);
        assertEq(config.targetWeightsBps.length, 3);
        assertTrue(config.autoExecute);

        Permission memory permission = permissionHelper.generate(owner, ownerPrivateKey);
        string[] memory sealedWeights = vault.getEncryptedTargetWeights(owner, permission);
        assertEq(sealedWeights.length, 3);
        assertEq(unseal(sealedWeights[0]), 4500);
    }

    function testRebalanceTriggersOrders() public {
        vm.startPrank(owner);
        vault.deposit(address(ethToken), 700 ether, encrypt128(700 ether));
        vault.deposit(address(usdcToken), 200 ether, encrypt128(200 ether));
        vault.deposit(address(wbtcToken), 100 ether, encrypt128(100 ether));
        vm.stopPrank();

        Permission memory permission = permissionHelper.generate(owner, ownerPrivateKey);
        string memory sealedBalance = vault.encryptedBalanceOf(owner, address(ethToken), permission);
        assertEq(unseal(sealedBalance), 700 ether);

        vm.prank(owner);
        vault.checkAndExecuteRebalancing(owner);

        assertEq(phantomSwap.ordersSubmitted(), 1);
        IPhantomSwap.Order memory order = phantomSwap.getLastOrder();
        assertEq(order.tokenIn, address(ethToken));
        assertEq(order.tokenOut, address(usdcToken));
        assertEq(order.maxSlippageBps, 50);

        bytes32[] memory auditLog = vault.getEncryptedAuditLog(owner);
        assertEq(auditLog.length, 1);
    }

    function testPayrollExecutionDisbursesFunds() public {
        vm.startPrank(owner);
        vault.deposit(address(usdcToken), 500 ether, encrypt128(500 ether));
        vault.schedulePayroll(
            keccak256("employee1"),
            keccak256("5000USDC"),
            payable(employee),
            50 ether,
            address(usdcToken),
            30 days
        );
        vm.stopPrank();

        vm.warp(block.timestamp + 31 days);
        ZecTypes.ShieldedTransfer[] memory transfers = new ZecTypes.ShieldedTransfer[](1);
        transfers[0] = ZecTypes.ShieldedTransfer({
            vault: owner,
            recipientDiversifier: keccak256("diversifier"),
            recipientPk: keccak256("pk"),
            metadata: bytes("payroll"),
            encryptedAmount: keccak256("50usdc")
        });

        vm.prank(owner);
        vault.executePayroll(owner, transfers);

        assertEq(usdcToken.balanceOf(address(zecBridge)), 50 ether);
        bytes32[] memory auditLog = vault.getEncryptedAuditLog(owner);
        assertGt(auditLog.length, 0);
    }

    function _seedOwnerBalances() private {
        ethToken.mint(owner, 1_000 ether);
        usdcToken.mint(owner, 1_000 ether);
        wbtcToken.mint(owner, 1_000 ether);
    }

    function _initializeVault() private {
        address[] memory signers = new address[](1);
        signers[0] = signer;

        uint16[] memory targetWeightsBps = new uint16[](3);
        targetWeightsBps[0] = 4500;
        targetWeightsBps[1] = 3500;
        targetWeightsBps[2] = 2000;

        inEuint128[] memory encryptedWeights = new inEuint128[](3);
        encryptedWeights[0] = encrypt128(targetWeightsBps[0]);
        encryptedWeights[1] = encrypt128(targetWeightsBps[1]);
        encryptedWeights[2] = encrypt128(targetWeightsBps[2]);

        vm.prank(owner);
        vault.initializeVault(
            signers,
            encryptedWeights,
            encrypt128(500),
            targetWeightsBps,
            500,
            50,
            true
        );

        vm.startPrank(owner);
        ethToken.approve(address(vault), type(uint256).max);
        usdcToken.approve(address(vault), type(uint256).max);
        wbtcToken.approve(address(vault), type(uint256).max);
        vm.stopPrank();
    }
}

