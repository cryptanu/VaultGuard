// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./interfaces/IERC20.sol";
import "./PayrollEngine.sol";
import "./interfaces/IZecBridge.sol";
import {FHE, euint128, inEuint128} from "@fhenixprotocol/contracts/FHE.sol";
import {Permission, Permissioned} from "@fhenixprotocol/contracts/access/Permissioned.sol";

contract VaultGuard is Permissioned {
    struct VaultConfig {
        address owner;
        address[] authorizedSigners;
        bytes32 vaultId;
    }

    struct VaultSnapshot {
        address token;
        bytes32 encryptedBalance;
    }

    PayrollEngine public immutable payrollEngine;
    IZecBridge public zecBridge;

    mapping(address => VaultConfig) private _vaults;
    mapping(address => mapping(address => uint256)) private _vaultBalances;
    mapping(address => mapping(address => euint128)) private _encryptedBalances;
    mapping(address => address[]) private _vaultTokens;
    mapping(address => mapping(address => bool)) private _tokenTracked;
    mapping(address => bytes32[]) private _auditLog;

    event VaultCreated(address indexed vault, bytes32 configHash);
    event Deposit(address indexed vault, address indexed token, uint256 amount);
    event Withdrawal(address indexed vault, address indexed token, uint256 amount);
    event AuditLogAppended(address indexed vault, bytes32 logEntry);
    event PayrollExecuted(address indexed vault, uint256 indexed entryId, address recipient, uint256 amount);

    modifier onlyVaultOwner(address vault) {
        require(_vaults[vault].owner == vault, "VaultGuard:not-owner");
        _;
    }

    modifier onlyAuthorized(address vault) {
        if (msg.sender != vault && msg.sender != address(this)) {
            require(isAuthorizedSigner(vault, msg.sender), "VaultGuard:not-authorized");
        }
        _;
    }

    constructor(PayrollEngine _payrollEngine, IZecBridge _zecBridge) {
        require(address(_payrollEngine) != address(0), "VaultGuard:payroll-zero");
        require(address(_zecBridge) != address(0), "VaultGuard:zec-zero");
        payrollEngine = _payrollEngine;
        zecBridge = _zecBridge;
        payrollEngine.configureVault(address(this));
    }

    function initializeVault(address[] calldata authorizedSigners) external returns (bytes32 vaultId) {
        VaultConfig storage config = _vaults[msg.sender];
        require(config.owner == address(0), "VaultGuard:already-initialized");

        config.owner = msg.sender;
        config.authorizedSigners = authorizedSigners;
        config.vaultId = keccak256(abi.encodePacked(msg.sender, block.timestamp, block.prevrandao));

        emit VaultCreated(msg.sender, config.vaultId);
        return config.vaultId;
    }

    function deposit(
        address token,
        uint256 amount,
        inEuint128 calldata encryptedAmount
    ) external onlyVaultOwner(msg.sender) {
        require(token != address(0), "VaultGuard:token-zero");
        require(amount > 0, "VaultGuard:amount-zero");

        IERC20(token).transferFrom(msg.sender, address(this), amount);

        if (!_tokenTracked[msg.sender][token]) {
            _vaultTokens[msg.sender].push(token);
            _tokenTracked[msg.sender][token] = true;
        }

        _vaultBalances[msg.sender][token] += amount;
        euint128 currentEncrypted = _encryptedBalances[msg.sender][token];
        euint128 encAmount = FHE.asEuint128(encryptedAmount);
        if (FHE.isInitialized(currentEncrypted)) {
            _encryptedBalances[msg.sender][token] = currentEncrypted + encAmount;
        } else {
            _encryptedBalances[msg.sender][token] = encAmount;
        }

        emit Deposit(msg.sender, token, amount);
    }

    function withdraw(
        address token,
        uint256 amount,
        inEuint128 calldata encryptedAmount
    ) external onlyVaultOwner(msg.sender) {
        uint256 balance = _vaultBalances[msg.sender][token];
        require(balance >= amount, "VaultGuard:insufficient");

        _vaultBalances[msg.sender][token] = balance - amount;
        IERC20(token).transfer(msg.sender, amount);
        euint128 currentEncrypted = _encryptedBalances[msg.sender][token];
        euint128 encAmount = FHE.asEuint128(encryptedAmount);
        if (FHE.isInitialized(currentEncrypted)) {
            euint128 permitted = FHE.select(encAmount.lte(currentEncrypted), encAmount, FHE.asEuint128(0));
            _encryptedBalances[msg.sender][token] = currentEncrypted - permitted;
        }

        emit Withdrawal(msg.sender, token, amount);
    }

    function schedulePayroll(
        bytes32 encryptedRecipient,
        inEuint128 calldata encryptedRatePerSecond,
        address payable recipientHint,
        uint256 rateHintPerSecond,
        address token,
        uint64 streamDuration
    ) external onlyVaultOwner(msg.sender) returns (uint256 streamId) {
        streamId = payrollEngine.schedulePayroll(
            msg.sender,
            encryptedRecipient,
            encryptedRatePerSecond,
            recipientHint,
            rateHintPerSecond,
            token,
            streamDuration
        );
    }

    function claimPayrollStream(
        address vault,
        uint256 streamId,
        uint256 amountHint,
        inEuint128 calldata encryptedAmount,
        ZecTypes.ShieldedTransfer calldata transfer
    )
        external
        onlyAuthorized(vault)
    {
        require(amountHint > 0, "VaultGuard:amount-zero");
        require(transfer.vault == vault, "VaultGuard:transfer-vault-mismatch");

        PayrollEngine.PayrollStream memory stream = payrollEngine.getPayrollStream(vault, streamId);
        require(stream.active, "VaultGuard:stream-inactive");
        require(stream.token != address(0), "VaultGuard:stream-missing");

        uint64 effectiveTime = stream.endTime != 0 && block.timestamp > stream.endTime
            ? stream.endTime
            : uint64(block.timestamp);
        uint64 lastWithdrawal = stream.lastWithdrawalTime;
        require(effectiveTime > lastWithdrawal, "VaultGuard:nothing-accrued");

        uint256 elapsed = effectiveTime - lastWithdrawal;
        require(amountHint <= stream.rateHintPerSecond * elapsed, "VaultGuard:amount-exceeds-rate");

        mapping(address => uint256) storage balances = _vaultBalances[vault];
        uint256 available = balances[stream.token];
        require(available >= amountHint, "VaultGuard:payroll-insufficient");
        balances[stream.token] = available - amountHint;

        _decreaseEncryptedBalance(vault, stream.token, encryptedAmount);

        payrollEngine.markStreamWithdrawal(vault, streamId, effectiveTime);

        IERC20(stream.token).transfer(address(zecBridge), amountHint);
        bytes32 commitment = zecBridge.queueShieldedTransfer(transfer);
        bytes32 logEntry = keccak256(
            abi.encodePacked(block.timestamp, streamId, commitment, transfer.encryptedAmount)
        );
        _auditLog[vault].push(logEntry);
        emit PayrollExecuted(vault, streamId, address(0), amountHint);
        emit AuditLogAppended(vault, logEntry);
    }

    function getStreamCount(address vault) external view returns (uint256) {
        return payrollEngine.getScheduleCount(vault);
    }

    function getStreamMetadata(address vault, uint256 streamId)
        external
        view
        returns (
            bytes32 encryptedRecipient,
            address token,
            uint256 rateHintPerSecond,
            uint64 startTime,
            uint64 lastWithdrawalTime,
            uint64 endTime,
            bool active
        )
    {
        PayrollEngine.PayrollStream memory stream = payrollEngine.getPayrollStream(vault, streamId);
        encryptedRecipient = stream.encryptedRecipient;
        token = stream.token;
        rateHintPerSecond = stream.rateHintPerSecond;
        startTime = stream.startTime;
        lastWithdrawalTime = stream.lastWithdrawalTime;
        endTime = stream.endTime;
        active = stream.active;
    }

    function updateZecBridge(IZecBridge newBridge) external {
        require(address(newBridge) != address(0), "VaultGuard:zec-zero");
        require(msg.sender == address(payrollEngine), "VaultGuard:update-unauth");
        zecBridge = newBridge;
    }

    function getVaultConfig(address vault) external view returns (VaultConfig memory) {
        return _vaults[vault];
    }

    function encryptedBalanceOf(
        address vault,
        address token,
        Permission calldata permission
    ) external view onlyPermitted(permission, vault) returns (string memory) {
        return FHE.sealoutput(_encryptedBalances[vault][token], permission.publicKey);
    }

    function getVaultTokens(address vault) external view returns (VaultSnapshot[] memory snapshot) {
        address[] memory tokens = _vaultTokens[vault];
        snapshot = new VaultSnapshot[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            snapshot[i] = VaultSnapshot({
                token: tokens[i],
                encryptedBalance: bytes32(euint128.unwrap(_encryptedBalances[vault][tokens[i]]))
            });
        }
    }

    function getEncryptedAuditLog(address vault) external view returns (bytes32[] memory) {
        return _auditLog[vault];
    }

    function isAuthorizedSigner(address vault, address signer) public view returns (bool) {
        VaultConfig storage config = _vaults[vault];
        if (signer == config.owner) {
            return true;
        }
        for (uint256 i = 0; i < config.authorizedSigners.length; i++) {
            if (config.authorizedSigners[i] == signer) {
                return true;
            }
        }
        return false;
    }

    function _decreaseEncryptedBalance(address vault, address token, inEuint128 calldata encryptedAmount) internal {
        euint128 currentEncrypted = _encryptedBalances[vault][token];
        if (FHE.isInitialized(currentEncrypted)) {
            euint128 encAmount = FHE.asEuint128(encryptedAmount);
            euint128 permitted = FHE.select(encAmount.lte(currentEncrypted), encAmount, FHE.asEuint128(0));
            _encryptedBalances[vault][token] = currentEncrypted - permitted;
        }
    }
}

