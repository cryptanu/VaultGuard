// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";

import "../contracts/VaultGuard.sol";
import "../contracts/ThresholdEngine.sol";
import "../contracts/PayrollEngine.sol";
import "../contracts/interfaces/IPhantomSwap.sol";

contract VaultGuardDeploy is Script {
    function run() external {
        address phantomSwapAddr = vm.envAddress("PHANTOM_SWAP_ADDRESS");

        vm.startBroadcast();
        ThresholdEngine threshold = new ThresholdEngine();
        PayrollEngine payroll = new PayrollEngine(address(0));
        VaultGuard vault = new VaultGuard(address(threshold), payroll, IPhantomSwap(phantomSwapAddr));
        vm.stopBroadcast();

        console2.log("ThresholdEngine", address(threshold));
        console2.log("PayrollEngine", address(payroll));
        console2.log("VaultGuard", address(vault));
    }
}

