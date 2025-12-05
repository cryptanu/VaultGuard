// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";

import "../contracts/VaultGuard.sol";
import "../contracts/PayrollEngine.sol";
import "../contracts/mocks/MockERC20.sol";
import "../contracts/bridge/ZecBridgeClient.sol";
import "../contracts/interfaces/IZecBridge.sol";
import "./utils/FheTest.sol";
import "./utils/PermissionHelper.sol";
import {Permission} from "@fhenixprotocol/contracts/access/Permissioned.sol";
import {ZecTypes} from "../contracts/interfaces/IZecBridge.sol";

contract VaultGuardE2ETest is Test, FheTest {
    VaultGuard private vault;
    PayrollEngine private payrollEngine;
    ZecBridgeClient private zecBridge;

    MockERC20 private usdcToken;

    PermissionHelper private permissionHelper;

    address private owner;
    uint256 private ownerPrivateKey;
    address private employee = address(0xC0DE);

    function setUp() public {
        initializeFhe();

        ownerPrivateKey = 0xA11CE;
        owner = vm.addr(ownerPrivateKey);

        payrollEngine = new PayrollEngine();
        zecBridge = new ZecBridgeClient(address(this));

        vault = new VaultGuard(payrollEngine, zecBridge);
        permissionHelper = new PermissionHelper(address(vault));

        usdcToken = new MockERC20("USD Coin", "USDC", 6);

        usdcToken.mint(owner, 1_000_000e6);

        _initializeVault();
    }

    function testEndToEndPayrollFlow() public {
        vm.startPrank(owner);
        vault.deposit(address(usdcToken), 500_000e6, encrypt128(500_000e6));

        uint64 streamDuration = 30 days;
        uint256 salary = 50_000e6;
        uint256 ratePerSecond = salary / streamDuration;
        uint256 streamId = vault.schedulePayroll(
            keccak256("employee1"),
            encrypt128(ratePerSecond),
            payable(address(0)), // shielded payout
            ratePerSecond,
            address(usdcToken),
            streamDuration
        );
        assertEq(payrollEngine.getScheduleCount(owner), 1);
        vm.stopPrank();

        vm.warp(block.timestamp + streamDuration);
        uint256 expectedAmount = ratePerSecond * streamDuration;

        ZecTypes.ShieldedTransfer memory transfer = ZecTypes.ShieldedTransfer({
            vault: owner,
            recipientDiversifier: keccak256("diversifier"),
            recipientPk: keccak256("pk"),
            metadata: bytes("payroll:employee1"),
            encryptedAmount: keccak256("50000usdc")
        });

        vm.recordLogs();
        vm.prank(owner);
        vault.claimPayrollStream(owner, streamId, expectedAmount, encrypt128(expectedAmount), transfer);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 shieldedEventSig = keccak256(
            "ShieldedTransferQueued(address,bytes32,bytes32,bytes32,bytes)"
        );
        uint256 shieldedEvents;
        bytes32 payrollExecutedSig = keccak256(
            "PayrollExecuted(address,uint256,address,uint256)"
        );
        uint256 payrollEvents;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics.length > 0 && logs[i].topics[0] == shieldedEventSig) {
                shieldedEvents++;
            }
            if (logs[i].topics.length > 0 && logs[i].topics[0] == payrollExecutedSig) {
                payrollEvents++;
            }
        }
        assertEq(shieldedEvents, 1);
        assertEq(payrollEvents, 1);

        assertEq(usdcToken.balanceOf(address(zecBridge)), expectedAmount);
        bytes32[] memory commitments = zecBridge.getCommitments();
        assertEq(commitments.length, 1);

        bytes32[] memory auditLog = vault.getEncryptedAuditLog(owner);
        assertEq(auditLog.length, 1);
    }

    function _initializeVault() private {
        address[] memory signers = new address[](1);
        signers[0] = owner;

        vm.prank(owner);
        vault.initializeVault(signers);

        vm.prank(owner);
        usdcToken.approve(address(vault), type(uint256).max);
    }
}

