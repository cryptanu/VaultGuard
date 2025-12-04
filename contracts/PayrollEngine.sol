// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {FHE, euint128, inEuint128} from "@fhenixprotocol/contracts/FHE.sol";

contract PayrollEngine {
    struct PayrollStream {
        bytes32 encryptedRecipient;
        euint128 encryptedRatePerSecond;
        address payable recipientHint;
        uint256 rateHintPerSecond;
        address token;
        uint64 startTime;
        uint64 lastWithdrawalTime;
        uint64 endTime;
        bool active;
    }

    address public vaultGuard;
    bool public vaultConfigured;

    mapping(address => PayrollStream[]) private _streams;

    event PayrollScheduled(address indexed employer, uint256 indexed streamId, address token, uint64 streamDuration);
    event PayrollUpdated(address indexed employer, uint256 indexed streamId, bytes32 recipientHash);
    event PayrollDeactivated(address indexed employer, uint256 indexed streamId);
    event PayrollExecuted(address indexed employer, uint256 indexed streamId, address recipient, uint256 amount);

    modifier onlyVault() {
        require(msg.sender == vaultGuard, "PayrollEngine:only-vault");
        _;
    }

    constructor() {}

    function configureVault(address _vaultGuard) external {
        require(!vaultConfigured, "PayrollEngine:configured");
        require(_vaultGuard != address(0), "PayrollEngine:vault-zero");
        vaultGuard = _vaultGuard;
        vaultConfigured = true;
    }

    function schedulePayroll(
        address employer,
        bytes32 encryptedRecipient,
        inEuint128 calldata encryptedRatePerSecond,
        address payable recipientHint,
        uint256 rateHintPerSecond,
        address token,
        uint64 streamDuration
    ) external onlyVault returns (uint256 streamId) {
        require(rateHintPerSecond > 0, "PayrollEngine:rate-zero");
        require(token != address(0), "PayrollEngine:token-zero");

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = streamDuration == 0 ? 0 : startTime + streamDuration;

        PayrollStream memory stream = PayrollStream({
            encryptedRecipient: encryptedRecipient,
            encryptedRatePerSecond: FHE.asEuint128(encryptedRatePerSecond),
            recipientHint: recipientHint,
            rateHintPerSecond: rateHintPerSecond,
            token: token,
            startTime: startTime,
            lastWithdrawalTime: startTime,
            endTime: endTime,
            active: true
        });

        _streams[employer].push(stream);
        streamId = _streams[employer].length - 1;
        emit PayrollScheduled(employer, streamId, token, streamDuration);
    }

    function updatePayroll(
        address employer,
        uint256 streamId,
        bytes32 encryptedRecipient,
        inEuint128 calldata encryptedRatePerSecond,
        address payable recipientHint,
        uint256 rateHintPerSecond,
        bool active
    ) external onlyVault {
        PayrollStream storage stream = _streams[employer][streamId];
        stream.encryptedRecipient = encryptedRecipient;
        stream.encryptedRatePerSecond = FHE.asEuint128(encryptedRatePerSecond);
        stream.recipientHint = recipientHint;
        stream.rateHintPerSecond = rateHintPerSecond;
        stream.active = active;
        emit PayrollUpdated(employer, streamId, encryptedRecipient);
    }

    function deactivatePayroll(address employer, uint256 streamId) external onlyVault {
        PayrollStream storage stream = _streams[employer][streamId];
        stream.active = false;
        emit PayrollDeactivated(employer, streamId);
    }

    function markStreamWithdrawal(address employer, uint256 streamId, uint64 withdrawalTime) external onlyVault {
        PayrollStream storage stream = _streams[employer][streamId];
        require(stream.active, "PayrollEngine:inactive");
        require(withdrawalTime >= stream.lastWithdrawalTime, "PayrollEngine:time-rewind");
        stream.lastWithdrawalTime = withdrawalTime;
        if (stream.endTime != 0 && withdrawalTime >= stream.endTime) {
            stream.active = false;
        }
    }

    function getScheduleCount(address employer) external view returns (uint256) {
        return _streams[employer].length;
    }

    function getPayrollStream(address employer, uint256 streamId) external view returns (PayrollStream memory) {
        return _streams[employer][streamId];
    }
}

