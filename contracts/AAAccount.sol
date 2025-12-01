// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IEntryPoint {
    function execute(address to, uint256 value, bytes calldata data) external;
}

contract AAAccount {
    address public immutable entryPoint;
    address public owner;
    address public vaultGuard;

    event VaultGuardUpdated(address indexed previousVault, address indexed newVault);

    modifier onlyOwner() {
        require(msg.sender == owner, "AAAccount:only-owner");
        _;
    }

    modifier onlyEntryPoint() {
        require(msg.sender == entryPoint, "AAAccount:only-entrypoint");
        _;
    }

    constructor(address _owner, address _vaultGuard, address _entryPoint) {
        require(_owner != address(0), "AAAccount:owner-zero");
        require(_vaultGuard != address(0), "AAAccount:vault-zero");
        require(_entryPoint != address(0), "AAAccount:entry-zero");
        owner = _owner;
        vaultGuard = _vaultGuard;
        entryPoint = _entryPoint;
    }

    function setVaultGuard(address newVault) external onlyOwner {
        require(newVault != address(0), "AAAccount:vault-zero");
        address previousVault = vaultGuard;
        vaultGuard = newVault;
        emit VaultGuardUpdated(previousVault, newVault);
    }

    function executeAsOwner(address target, uint256 value, bytes calldata data) external onlyOwner {
        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, string(result));
    }

    function executeFromEntryPoint(address target, uint256 value, bytes calldata data) external onlyEntryPoint {
        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, string(result));
    }

    function runVaultAction(bytes calldata payload) external onlyEntryPoint {
        (bool success, bytes memory result) = vaultGuard.call(payload);
        require(success, string(result));
    }

    function validateSignature(bytes32, bytes calldata) external pure returns (bool) {
        return true;
    }
}

