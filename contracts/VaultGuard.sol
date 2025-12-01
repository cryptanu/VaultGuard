// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./interfaces/IERC20.sol";
import "./interfaces/IPhantomSwap.sol";
import "./PayrollEngine.sol";

interface IThresholdEngine {
    function shouldRebalance(
        address vault,
        uint16 deviationThresholdBps,
        uint16[] calldata targetWeightsBps,
        uint256[] calldata balances
    ) external returns (bool);

    function computeOrders(
        uint16[] calldata targetWeightsBps,
        address[] calldata tokens,
        uint256[] calldata balances,
        uint16 maxSlippageBps
    ) external view returns (IPhantomSwap.Order[] memory);
}

contract VaultGuard {
    uint256 internal constant BPS_DENOMINATOR = 10_000;

    struct VaultConfig {
        address owner;
        address[] authorizedSigners;
        bytes encryptedWeights;
        bytes encryptedThresholds;
        uint16 maxSlippageBps;
        uint16 rebalanceDeviationBps;
        uint16[] targetWeightsBps;
        uint64 lastRebalance;
        bool autoExecute;
        bytes32 vaultId;
    }

    struct VaultSnapshot {
        address token;
        uint256 balance;
        uint16 targetWeightBps;
    }

    address public immutable thresholdEngine;
    PayrollEngine public immutable payrollEngine;
    IPhantomSwap public phantomSwap;

    mapping(address => VaultConfig) private _vaults;
    mapping(address => mapping(address => uint256)) private _vaultBalances;
    mapping(address => address[]) private _vaultTokens;
    mapping(address => mapping(address => bool)) private _tokenTracked;
    mapping(address => bytes32[]) private _auditLog;

    event VaultCreated(address indexed vault, bytes32 configHash);
    event Deposit(address indexed vault, address indexed token, uint256 amount);
    event Withdrawal(address indexed vault, address indexed token, uint256 amount);
    event RebalancingTriggered(address indexed vault, uint64 timestamp);
    event RebalanceExecuted(address indexed vault, bytes32 auditEntry, uint256 orderCount);
    event AuditLogAppended(address indexed vault, bytes32 logEntry);
    event PhantomSwapUpdated(address indexed updater, address indexed newPhantomSwap);
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

    constructor(address _thresholdEngine, PayrollEngine _payrollEngine, IPhantomSwap _phantomSwap) {
        require(_thresholdEngine != address(0), "VaultGuard:threshold-zero");
        require(address(_payrollEngine) != address(0), "VaultGuard:payroll-zero");
        require(address(_phantomSwap) != address(0), "VaultGuard:phantom-zero");
        thresholdEngine = _thresholdEngine;
        payrollEngine = _payrollEngine;
        phantomSwap = _phantomSwap;
        payrollEngine.configureVault(address(this));
    }

    function initializeVault(
        address[] calldata authorizedSigners,
        bytes calldata encryptedWeights,
        bytes calldata encryptedThresholds,
        uint16[] calldata targetWeightsBps,
        uint16 rebalanceDeviationBps,
        uint16 maxSlippageBps,
        bool autoExecute
    ) external returns (bytes32 vaultId) {
        VaultConfig storage config = _vaults[msg.sender];
        require(config.owner == address(0), "VaultGuard:already-initialized");
        require(targetWeightsBps.length > 0, "VaultGuard:weights-empty");

        config.owner = msg.sender;
        config.authorizedSigners = authorizedSigners;
        config.encryptedWeights = encryptedWeights;
        config.encryptedThresholds = encryptedThresholds;
        config.targetWeightsBps = targetWeightsBps;
        config.rebalanceDeviationBps = rebalanceDeviationBps;
        config.maxSlippageBps = maxSlippageBps;
        config.autoExecute = autoExecute;
        config.vaultId = keccak256(abi.encodePacked(msg.sender, block.timestamp, block.prevrandao));

        emit VaultCreated(msg.sender, config.vaultId);
        return config.vaultId;
    }

    function deposit(address token, uint256 amount) external onlyVaultOwner(msg.sender) {
        require(token != address(0), "VaultGuard:token-zero");
        require(amount > 0, "VaultGuard:amount-zero");

        IERC20(token).transferFrom(msg.sender, address(this), amount);

        if (!_tokenTracked[msg.sender][token]) {
            _vaultTokens[msg.sender].push(token);
            _tokenTracked[msg.sender][token] = true;
        }

        _vaultBalances[msg.sender][token] += amount;

        emit Deposit(msg.sender, token, amount);
    }

    function withdraw(address token, uint256 amount) external onlyVaultOwner(msg.sender) {
        uint256 balance = _vaultBalances[msg.sender][token];
        require(balance >= amount, "VaultGuard:insufficient");

        _vaultBalances[msg.sender][token] = balance - amount;
        IERC20(token).transfer(msg.sender, amount);

        emit Withdrawal(msg.sender, token, amount);
    }

    function schedulePayroll(
        bytes32 encryptedRecipient,
        bytes32 encryptedAmount,
        address payable recipientHint,
        uint256 amountHint,
        address token,
        uint64 frequency
    ) external onlyVaultOwner(msg.sender) returns (uint256 entryId) {
        entryId = payrollEngine.schedulePayroll(
            msg.sender,
            encryptedRecipient,
            encryptedAmount,
            recipientHint,
            amountHint,
            token,
            frequency
        );
    }

    function executePayroll(address vault) external onlyAuthorized(vault) {
        PayrollEngine.PayoutInstruction[] memory payouts = payrollEngine.releaseDuePayroll(vault);
        if (payouts.length == 0) {
            return;
        }

        for (uint256 i = 0; i < payouts.length; i++) {
            PayrollEngine.PayoutInstruction memory payout = payouts[i];
            if (payout.amount == 0 || payout.recipient == address(0)) {
                continue;
            }

            uint256 balance = _vaultBalances[vault][payout.token];
            require(balance >= payout.amount, "VaultGuard:payroll-insufficient");

            _vaultBalances[vault][payout.token] = balance - payout.amount;
            IERC20(payout.token).transfer(payout.recipient, payout.amount);
            bytes32 logEntry = keccak256(
                abi.encodePacked(block.timestamp, payout.entryId, payout.recipient, payout.amount)
            );
            _auditLog[vault].push(logEntry);
            emit PayrollExecuted(vault, payout.entryId, payout.recipient, payout.amount);
            emit AuditLogAppended(vault, logEntry);
        }
    }

    function checkAndExecuteRebalancing(address vault) external {
        VaultConfig storage config = _vaults[vault];
        require(config.owner != address(0), "VaultGuard:vault-missing");

        bool authorized = msg.sender == vault || isAuthorizedSigner(vault, msg.sender) || msg.sender == thresholdEngine;
        require(authorized, "VaultGuard:not-authorized");

        (address[] memory tokens, uint256[] memory balances) = _collectBalances(vault);
        if (tokens.length == 0) {
            return;
        }

        bool shouldRebalance = IThresholdEngine(thresholdEngine).shouldRebalance(
            vault,
            config.rebalanceDeviationBps,
            config.targetWeightsBps,
            balances
        );

        if (!shouldRebalance) {
            return;
        }

        emit RebalancingTriggered(vault, uint64(block.timestamp));

        IPhantomSwap.Order[] memory orders = IThresholdEngine(thresholdEngine).computeOrders(
            config.targetWeightsBps,
            tokens,
            balances,
            config.maxSlippageBps
        );

        if (orders.length == 0) {
            return;
        }

        for (uint256 i = 0; i < orders.length; i++) {
            IPhantomSwap.Order memory order = orders[i];
            if (order.amountIn == 0) {
                continue;
            }

            uint256 balance = _vaultBalances[vault][order.tokenIn];
            require(balance >= order.amountIn, "VaultGuard:rebalance-insufficient");
            _vaultBalances[vault][order.tokenIn] = balance - order.amountIn;
            _vaultBalances[vault][order.tokenOut] += order.minAmountOut;
            phantomSwap.submitOrder(order);
        }

        config.lastRebalance = uint64(block.timestamp);
        bytes32 auditEntry = keccak256(
            abi.encodePacked(block.timestamp, orders.length, balances, config.targetWeightsBps)
        );
        _auditLog[vault].push(auditEntry);
        emit RebalanceExecuted(vault, auditEntry, orders.length);
        emit AuditLogAppended(vault, auditEntry);
    }

    function updatePhantomSwap(IPhantomSwap newPhantomSwap) external {
        require(newPhantomSwap != IPhantomSwap(address(0)), "VaultGuard:phantom-zero");
        require(msg.sender == address(payrollEngine) || msg.sender == thresholdEngine, "VaultGuard:update-unauth");
        phantomSwap = newPhantomSwap;
        emit PhantomSwapUpdated(msg.sender, address(newPhantomSwap));
    }

    function getVaultConfig(address vault) external view returns (VaultConfig memory) {
        return _vaults[vault];
    }

    function getVaultTokens(address vault) external view returns (VaultSnapshot[] memory snapshot) {
        address[] memory tokens = _vaultTokens[vault];
        VaultConfig storage config = _vaults[vault];
        snapshot = new VaultSnapshot[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            snapshot[i] = VaultSnapshot({
                token: tokens[i],
                balance: _vaultBalances[vault][tokens[i]],
                targetWeightBps: config.targetWeightsBps.length > i ? config.targetWeightsBps[i] : 0
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

    function _collectBalances(address vault) internal view returns (address[] memory tokens, uint256[] memory balances) {
        tokens = _vaultTokens[vault];
        balances = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            balances[i] = _vaultBalances[vault][tokens[i]];
        }
    }
}

