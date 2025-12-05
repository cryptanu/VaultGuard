// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";

import "../interfaces/IZecBridge.sol";

/// @title ZecBridgeClient
/// @notice Lightweight on-chain queue that models a production Zcash shielded bridge.
///         VaultGuard enqueues shielded transfers and an off-chain relayer consumes them,
///         executing the corresponding Zcash transactions and marking items as processed.
contract ZecBridgeClient is IZecBridge, Ownable {
    struct QueuedTransfer {
        ZecTypes.ShieldedTransfer transfer;
        uint64 timestamp;
        bytes32 commitment;
        bool processed;
        bytes32 zcashTxId;
    }

    QueuedTransfer[] private _queue;

    event TransferProcessed(uint256 indexed index, bytes32 commitment, bytes32 zcashTxId);

    constructor(address owner_) Ownable(owner_) {}

    /// @inheritdoc IZecBridge
    function queueShieldedTransfer(ZecTypes.ShieldedTransfer calldata transfer)
        external
        override
        returns (bytes32 commitment)
    {
        require(transfer.vault != address(0), "ZecBridge:vault-zero");
        require(transfer.recipientPk != bytes32(0), "ZecBridge:pk-zero");

        commitment = keccak256(
            abi.encode(
                transfer.vault,
                transfer.recipientDiversifier,
                transfer.recipientPk,
                transfer.metadata,
                transfer.encryptedAmount,
                block.number,
                block.prevrandao
            )
        );

        _queue.push(
            QueuedTransfer({
                transfer: transfer,
                timestamp: uint64(block.timestamp),
                commitment: commitment,
                processed: false,
                zcashTxId: bytes32(0)
            })
        );

        emit ShieldedTransferQueued(
            transfer.vault,
            transfer.recipientDiversifier,
            transfer.recipientPk,
            transfer.encryptedAmount,
            transfer.metadata
        );
    }

    /// @inheritdoc IZecBridge
    function getCommitments() external view override returns (bytes32[] memory commitments) {
        uint256 length = _queue.length;
        commitments = new bytes32[](length);
        for (uint256 i = 0; i < length; i++) {
            commitments[i] = _queue[i].commitment;
        }
    }

    function queueLength() external view returns (uint256) {
        return _queue.length;
    }

    function getQueuedTransfer(uint256 index)
        external
        view
        returns (
            ZecTypes.ShieldedTransfer memory transfer,
            uint64 timestamp,
            bool processed,
            bytes32 commitment,
            bytes32 zcashTxId
        )
    {
        require(index < _queue.length, "ZecBridge:out-of-bounds");
        QueuedTransfer storage entry = _queue[index];
        return (entry.transfer, entry.timestamp, entry.processed, entry.commitment, entry.zcashTxId);
    }

    function markTransferProcessed(uint256 index, bytes32 zcashTxId) external onlyOwner {
        require(index < _queue.length, "ZecBridge:out-of-bounds");
        QueuedTransfer storage entry = _queue[index];
        require(!entry.processed, "ZecBridge:already-processed");
        entry.processed = true;
        entry.zcashTxId = zcashTxId;
        emit TransferProcessed(index, entry.commitment, zcashTxId);
    }
}

