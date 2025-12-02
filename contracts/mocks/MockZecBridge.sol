// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "../interfaces/IZecBridge.sol";

contract MockZecBridge is IZecBridge {
    bytes32[] private _commitments;

    function queueShieldedTransfer(ZecTypes.ShieldedTransfer calldata transfer)
        external
        override
        returns (bytes32 commitment)
    {
        commitment = keccak256(
            abi.encode(
                transfer.vault,
                transfer.recipientDiversifier,
                transfer.recipientPk,
                transfer.metadata,
                transfer.encryptedAmount,
                block.timestamp
            )
        );
        _commitments.push(commitment);
        emit ShieldedTransferQueued(
            transfer.vault,
            transfer.recipientDiversifier,
            transfer.recipientPk,
            transfer.encryptedAmount,
            transfer.metadata
        );
    }

    function getCommitments() external view override returns (bytes32[] memory) {
        return _commitments;
    }
}

