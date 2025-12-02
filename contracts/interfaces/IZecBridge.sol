// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

library ZecTypes {
    struct ShieldedTransfer {
        address vault;
        bytes32 recipientDiversifier;
        bytes32 recipientPk;
        bytes metadata;
        bytes32 encryptedAmount;
    }
}

interface IZecBridge {
    event ShieldedTransferQueued(
        address indexed vault,
        bytes32 indexed recipientDiversifier,
        bytes32 recipientPk,
        bytes32 encryptedAmount,
        bytes commitment
    );

    function queueShieldedTransfer(ZecTypes.ShieldedTransfer calldata transfer) external returns (bytes32 commitment);
    function getCommitments() external view returns (bytes32[] memory);
}

