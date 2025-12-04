// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";

import "../contracts/VaultGuard.sol";
import "../contracts/PayrollEngine.sol";
import "../contracts/mocks/MockZecBridge.sol";

contract VaultGuardDeploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);
        PayrollEngine payroll = new PayrollEngine();
        MockZecBridge zecBridge = new MockZecBridge();
        VaultGuard vault = new VaultGuard(payroll, zecBridge);
        payroll.configureVault(address(vault));
        vm.stopBroadcast();

        console2.log("Deployer", deployer);
        console2.log("PayrollEngine", address(payroll));
        console2.log("MockZecBridge", address(zecBridge));
        console2.log("VaultGuard", address(vault));
    }
}