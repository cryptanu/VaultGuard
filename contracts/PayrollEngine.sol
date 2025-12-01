// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./interfaces/IERC20.sol";

contract PayrollEngine {
    struct PayrollEntry {
        bytes32 encryptedRecipient;
        bytes32 encryptedAmount;
        address payable recipientHint;
        uint256 amountHint;
        address token;
        uint64 frequency;
        uint64 lastPaymentTime;
        bool active;
    }

    struct PayoutInstruction {
        uint256 entryId;
        address token;
        address recipient;
        uint256 amount;
        bytes32 encryptedRecipient;
        bytes32 encryptedAmount;
    }

    address public vaultGuard;
    bool public vaultConfigured;

    mapping(address => PayrollEntry[]) private _schedules;

    event PayrollScheduled(address indexed employer, uint256 indexed entryId, address token, uint64 frequency);
    event PayrollUpdated(address indexed employer, uint256 indexed entryId, bytes32 recipientHash);
    event PayrollDeactivated(address indexed employer, uint256 indexed entryId);
    event PayrollExecuted(address indexed employer, uint256 indexed entryId, address recipient, uint256 amount);

    modifier onlyVault() {
        require(msg.sender == vaultGuard, "PayrollEngine:only-vault");
        _;
    }

    constructor(address _vaultGuard) {
        if (_vaultGuard != address(0)) {
            vaultGuard = _vaultGuard;
            vaultConfigured = true;
        }
    }

    function configureVault(address _vaultGuard) external {
        require(!vaultConfigured, "PayrollEngine:configured");
        require(_vaultGuard != address(0), "PayrollEngine:vault-zero");
        vaultGuard = _vaultGuard;
        vaultConfigured = true;
    }

    function schedulePayroll(
        address employer,
        bytes32 encryptedRecipient,
        bytes32 encryptedAmount,
        address payable recipientHint,
        uint256 amountHint,
        address token,
        uint64 frequencySeconds
    ) external onlyVault returns (uint256 entryId) {
        PayrollEntry memory entry = PayrollEntry({
            encryptedRecipient: encryptedRecipient,
            encryptedAmount: encryptedAmount,
            recipientHint: recipientHint,
            amountHint: amountHint,
            token: token,
            frequency: frequencySeconds,
            lastPaymentTime: uint64(block.timestamp),
            active: true
        });

        _schedules[employer].push(entry);
        entryId = _schedules[employer].length - 1;
        emit PayrollScheduled(employer, entryId, token, frequencySeconds);
    }

    function releaseDuePayroll(address employer)
        external
        onlyVault
        returns (PayoutInstruction[] memory instructions)
    {
        PayrollEntry[] storage entries = _schedules[employer];
        uint256 dueCount;
        uint256 timestamp = block.timestamp;

        for (uint256 i = 0; i < entries.length; i++) {
            if (_isDue(entries[i], timestamp)) {
                dueCount++;
            }
        }

        instructions = new PayoutInstruction[](dueCount);
        if (dueCount == 0) {
            return instructions;
        }

        uint256 instructionIndex;
        for (uint256 i = 0; i < entries.length; i++) {
            PayrollEntry storage entry = entries[i];
            if (!_isDue(entry, timestamp)) {
                continue;
            }

            entry.lastPaymentTime = uint64(timestamp);
            instructions[instructionIndex] = PayoutInstruction({
                entryId: i,
                token: entry.token,
                recipient: entry.recipientHint,
                amount: entry.amountHint,
                encryptedRecipient: entry.encryptedRecipient,
                encryptedAmount: entry.encryptedAmount
            });
            emit PayrollExecuted(employer, i, entry.recipientHint, entry.amountHint);
            instructionIndex++;
        }
    }

    function updatePayroll(
        address employer,
        uint256 entryId,
        bytes32 encryptedRecipient,
        bytes32 encryptedAmount,
        address payable recipientHint,
        uint256 amountHint,
        bool active
    ) external onlyVault {
        PayrollEntry storage entry = _schedules[employer][entryId];
        entry.encryptedRecipient = encryptedRecipient;
        entry.encryptedAmount = encryptedAmount;
        entry.recipientHint = recipientHint;
        entry.amountHint = amountHint;
        entry.active = active;
        emit PayrollUpdated(employer, entryId, encryptedRecipient);
    }

    function deactivatePayroll(address employer, uint256 entryId) external onlyVault {
        PayrollEntry storage entry = _schedules[employer][entryId];
        entry.active = false;
        emit PayrollDeactivated(employer, entryId);
    }

    function getScheduleCount(address employer) external view returns (uint256) {
        return _schedules[employer].length;
    }

    function getPayrollEntry(address employer, uint256 entryId) external view returns (PayrollEntry memory) {
        return _schedules[employer][entryId];
    }

    function _isDue(PayrollEntry storage entry, uint256 timestamp) private view returns (bool) {
        if (!entry.active) {
            return false;
        }
        if (entry.recipientHint == address(0) || entry.amountHint == 0) {
            return false;
        }
        return timestamp >= entry.lastPaymentTime + entry.frequency;
    }
}

