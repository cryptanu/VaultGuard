// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";

import "../contracts/VaultGuard.sol";
import "../contracts/mocks/MockERC20.sol";
import "../contracts/interfaces/IZecBridge.sol";
import "../test/utils/FheTest.sol";

contract SimulateSepoliaStream is Script, FheTest {
    address internal constant DEPLOYER = 0x392c053E0502591E6a7c9003FD8F54990b1cEE98;
    address internal constant VAULT_GUARD = 0x77e7498060bFCD775bEfA28674C9653ed18B0215;
    address internal constant PAYROLL_ENGINE = 0xe2eC4E271d88060741b386eE6D8bcAfC09c5C684;
    address internal constant ZEC_BRIDGE = 0x5215d854224B0F6ceB99D38862DCF1091A14511D;
    address internal constant VG_TOKEN = 0xA86573b0EAbA64ba84f4bcAD655c9EF45d833F90;

    function run() external {
        string memory rpcUrl = vm.envString("SEPOLIA_RPC_URL");
        uint256 forkId = vm.createFork(rpcUrl);
        vm.selectFork(forkId);

        initializeFhe();

        VaultGuard vault = VaultGuard(VAULT_GUARD);
        MockERC20 token = MockERC20(VG_TOKEN);

        console2.log("=== Sepolia Stream Simulation ===");
        console2.log("Deployer balance (initial)", token.balanceOf(DEPLOYER));

        _ensureVaultInitialized(vault);
        _ensureAllowance(vault, token);

        uint256 depositAmount = 100_000e6;
        vm.startPrank(DEPLOYER);
        vault.deposit(VG_TOKEN, depositAmount, encrypt128(depositAmount));
        vm.stopPrank();
        console2.log("Deposited", depositAmount);

        uint64 duration = 7 days;
        uint256 salary = 70_000e6;
        uint256 ratePerSecond = salary / duration;

        vm.prank(DEPLOYER);
        uint256 streamId = vault.schedulePayroll(
            keccak256("sepolia-worker"),
            encrypt128(ratePerSecond),
            payable(address(0)),
            ratePerSecond,
            VG_TOKEN,
            duration
        );
        console2.log("Stream scheduled", streamId);

        vm.warp(block.timestamp + duration);
        uint256 claimAmount = ratePerSecond * duration;
        ZecTypes.ShieldedTransfer memory transfer = ZecTypes.ShieldedTransfer({
            vault: DEPLOYER,
            recipientDiversifier: keccak256("demo-diversifier"),
            recipientPk: keccak256("demo-recipient"),
            metadata: bytes("demo-payroll"),
            encryptedAmount: keccak256("demo-amount")
        });

        vm.prank(DEPLOYER);
        vault.claimPayrollStream(DEPLOYER, streamId, claimAmount, encrypt128(claimAmount), transfer);
        console2.log("Claimed amount", claimAmount);

        uint256 bridgeBalance = token.balanceOf(ZEC_BRIDGE);
        console2.log("ZecBridge balance after claim", bridgeBalance);

        bytes32[] memory commitments = vault.getEncryptedAuditLog(DEPLOYER);
        console2.log("Audit log entries", commitments.length);
    }

    function _ensureVaultInitialized(VaultGuard vault) internal {
        try vault.getVaultConfig(DEPLOYER) returns (VaultGuard.VaultConfig memory config) {
            if (config.owner == address(0)) {
                vm.prank(DEPLOYER);
                vault.initializeVault(new address[](0));
            }
        } catch {
            vm.prank(DEPLOYER);
            vault.initializeVault(new address[](0));
        }
    }

    function _ensureAllowance(VaultGuard vault, MockERC20 token) internal {
        if (token.allowance(DEPLOYER, address(vault)) == 0) {
            vm.prank(DEPLOYER);
            token.approve(address(vault), type(uint256).max);
        }
    }
}

