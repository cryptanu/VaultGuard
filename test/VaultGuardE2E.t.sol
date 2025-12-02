// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";

import "../contracts/VaultGuard.sol";
import "../contracts/ThresholdEngine.sol";
import "../contracts/PayrollEngine.sol";
import "../contracts/mocks/MockERC20.sol";
import "../contracts/mocks/MockPhantomSwap.sol";
import "../contracts/mocks/MockZecBridge.sol";
import "../contracts/interfaces/IZecBridge.sol";
import "./utils/FheTest.sol";
import "./utils/PermissionHelper.sol";
import {Permission} from "@fhenixprotocol/contracts/access/Permissioned.sol";
import {ZecTypes} from "../contracts/interfaces/IZecBridge.sol";

contract VaultGuardE2ETest is Test, FheTest {
    VaultGuard private vault;
    ThresholdEngine private thresholdEngine;
    PayrollEngine private payrollEngine;
    MockPhantomSwap private phantomSwap;
    MockZecBridge private zecBridge;

    MockERC20 private usdcToken;

    PermissionHelper private permissionHelper;

    address private owner;
    uint256 private ownerPrivateKey;
    address private employee = address(0xC0DE);

    function setUp() public {
        initializeFhe();

        ownerPrivateKey = 0xA11CE;
        owner = vm.addr(ownerPrivateKey);

        thresholdEngine = new ThresholdEngine();
        payrollEngine = new PayrollEngine(address(0));
        phantomSwap = new MockPhantomSwap();
        zecBridge = new MockZecBridge();

        vault = new VaultGuard(address(thresholdEngine), payrollEngine, phantomSwap, zecBridge);
        permissionHelper = new PermissionHelper(address(vault));

        usdcToken = new MockERC20("USD Coin", "USDC", 6);

        usdcToken.mint(owner, 1_000_000e6);

        _initializeVault();
    }

    function testEndToEndPayrollFlow() public {
        vm.startPrank(owner);
        vault.deposit(address(usdcToken), 500_000e6, encrypt128(500_000e6));

        uint256 salary = 50_000e6;
        vault.schedulePayroll(
            keccak256("employee1"),
            keccak256("50000USDC"),
            payable(address(0)), // shielded payout
            salary,
            address(usdcToken),
            30 days
        );
        assertEq(payrollEngine.getScheduleCount(owner), 1);
        vm.stopPrank();

        vm.warp(block.timestamp + 31 days);

        ZecTypes.ShieldedTransfer[] memory transfers = new ZecTypes.ShieldedTransfer[](1);
        transfers[0] = ZecTypes.ShieldedTransfer({
            vault: owner,
            recipientDiversifier: keccak256("diversifier"),
            recipientPk: keccak256("pk"),
            metadata: bytes("payroll:employee1"),
            encryptedAmount: keccak256("50000usdc")
        });

        vm.recordLogs();
        vm.prank(owner);
        vault.executePayroll(owner, transfers);
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

        assertEq(usdcToken.balanceOf(address(zecBridge)), 50_000e6);
        bytes32[] memory commitments = zecBridge.getCommitments();
        assertEq(commitments.length, 1);

        Permission memory permission = permissionHelper.generate(owner, ownerPrivateKey);
        string[] memory sealedWeights = vault.getEncryptedTargetWeights(owner, permission);
        assertEq(sealedWeights.length, 3);
        assertEq(unseal(sealedWeights[0]), 4500);

        bytes32[] memory auditLog = vault.getEncryptedAuditLog(owner);
        assertEq(auditLog.length, 1);
    }

    function _initializeVault() private {
        address[] memory signers = new address[](1);
        signers[0] = owner;

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

        vm.prank(owner);
        usdcToken.approve(address(vault), type(uint256).max);
    }
}

