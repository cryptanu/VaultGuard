// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";

import "../contracts/VaultGuard.sol";
import "../contracts/PayrollEngine.sol";
import "../contracts/bridge/ZecBridgeClient.sol";
import "../contracts/mocks/MockERC20.sol";

contract VaultGuardDeploy is Script {
    function run() external {
        uint256 deployerKey;
        try vm.envUint("PRIVATE_KEY") returns (uint256 key) {
            deployerKey = key;
        } catch {
            deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        }
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);
        MockERC20 token = new MockERC20("VaultGuard Token", "VG", 6);
        PayrollEngine payroll = new PayrollEngine();
        ZecBridgeClient zecBridge = new ZecBridgeClient(deployer);
        VaultGuard vault = new VaultGuard(payroll, zecBridge);
        token.mint(deployer, 1_000_000e6);
        vm.stopBroadcast();

        console2.log("Deployer", deployer);
        console2.log("Token", address(token));
        console2.log("PayrollEngine", address(payroll));
        console2.log("ZecBridgeClient", address(zecBridge));
        console2.log("VaultGuard", address(vault));
    }
}