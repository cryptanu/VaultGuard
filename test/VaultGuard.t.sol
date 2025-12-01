// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";

import "../contracts/VaultGuard.sol";
import "../contracts/ThresholdEngine.sol";
import "../contracts/PayrollEngine.sol";
import "../contracts/mocks/MockERC20.sol";
import "../contracts/mocks/MockPhantomSwap.sol";

contract VaultGuardTest is Test {
    VaultGuard private vault;
    ThresholdEngine private thresholdEngine;
    PayrollEngine private payrollEngine;
    MockPhantomSwap private phantomSwap;

    MockERC20 private ethToken;
    MockERC20 private usdcToken;
    MockERC20 private wbtcToken;

    address private owner = address(0xA11CE);
    address private signer = address(0xB0B);
    address private employee = address(0xC0DE);

    function setUp() public {
        thresholdEngine = new ThresholdEngine();
        payrollEngine = new PayrollEngine(address(0));
        phantomSwap = new MockPhantomSwap();
        vault = new VaultGuard(address(thresholdEngine), payrollEngine, phantomSwap);

        ethToken = new MockERC20("Ethereum", "ETH", 18);
        usdcToken = new MockERC20("USD Coin", "USDC", 18);
        wbtcToken = new MockERC20("Wrapped BTC", "WBTC", 18);

        _seedOwnerBalances();
        _initializeVault();
    }

    function testInitializeVaultStoresConfig() public {
        VaultGuard.VaultConfig memory config = vault.getVaultConfig(owner);
        assertEq(config.owner, owner);
        assertEq(config.authorizedSigners.length, 1);
        assertEq(config.authorizedSigners[0], signer);
        assertEq(config.rebalanceDeviationBps, 500);
        assertEq(config.targetWeightsBps.length, 3);
        assertTrue(config.autoExecute);
    }

    function testRebalanceTriggersOrders() public {
        vm.startPrank(owner);
        vault.deposit(address(ethToken), 700 ether);
        vault.deposit(address(usdcToken), 200 ether);
        vault.deposit(address(wbtcToken), 100 ether);
        vm.stopPrank();

        vm.prank(owner);
        vault.checkAndExecuteRebalancing(owner);

        assertEq(phantomSwap.ordersSubmitted(), 1);
        IPhantomSwap.Order memory order = phantomSwap.getLastOrder();
        assertEq(order.tokenIn, address(ethToken));
        assertEq(order.tokenOut, address(usdcToken));
        assertEq(order.maxSlippageBps, 50);

        (VaultGuard.VaultSnapshot[] memory snapshot) = vault.getVaultTokens(owner);
        assertEq(snapshot[0].balance, 450 ether);
        assertEq(snapshot[1].balance, 450 ether);
        assertEq(snapshot[2].balance, 100 ether);

        bytes32[] memory auditLog = vault.getEncryptedAuditLog(owner);
        assertEq(auditLog.length, 1);
    }

    function testPayrollExecutionDisbursesFunds() public {
        vm.startPrank(owner);
        vault.deposit(address(usdcToken), 500 ether);
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
        vm.prank(owner);
        vault.executePayroll(owner);

        assertEq(usdcToken.balanceOf(employee), 50 ether);
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

        vm.prank(owner);
        vault.initializeVault(
            signers,
            abi.encode(targetWeightsBps),
            abi.encode(uint16(500)),
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

