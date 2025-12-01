// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./interfaces/IPhantomSwap.sol";

contract ThresholdEngine {
    uint256 internal constant BPS_DENOMINATOR = 10_000;

    event DeviationCalculated(address indexed vault, uint16 deviationBps);

    function shouldRebalance(
        address vault,
        uint16 deviationThresholdBps,
        uint16[] calldata targetWeightsBps,
        uint256[] calldata balances
    ) external returns (bool) {
        uint16 deviation = _maxDeviation(targetWeightsBps, balances);
        emit DeviationCalculated(vault, deviation);
        return deviation >= deviationThresholdBps;
    }

    function computeOrders(
        uint16[] calldata targetWeightsBps,
        address[] calldata tokens,
        uint256[] calldata balances,
        uint16 maxSlippageBps
    ) external pure returns (IPhantomSwap.Order[] memory orders) {
        require(tokens.length == balances.length, "ThresholdEngine:length-mismatch");
        require(targetWeightsBps.length == balances.length, "ThresholdEngine:weights-mismatch");

        uint256 totalValue = _totalBalance(balances);
        if (totalValue == 0) {
            return orders;
        }

        uint256 overweightCount = 0;
        for (uint256 i = 0; i < balances.length; i++) {
            if (_weightBps(balances[i], totalValue) > targetWeightsBps[i]) {
                overweightCount++;
            }
        }

        orders = new IPhantomSwap.Order[](overweightCount);
        if (overweightCount == 0) {
            return orders;
        }

        address settlementToken = tokens.length > 1 ? tokens[1] : tokens[0];
        uint256 index = 0;
        for (uint256 i = 0; i < balances.length; i++) {
            uint256 currentWeight = _weightBps(balances[i], totalValue);
            uint16 targetWeight = targetWeightsBps[i];
            if (currentWeight <= targetWeight) {
                continue;
            }

            uint256 excessBps = currentWeight - targetWeight;
            uint256 amountToSwap = (excessBps * totalValue) / BPS_DENOMINATOR;
            IPhantomSwap.Order memory order = orders[index];
            order.tokenIn = tokens[i];
            order.tokenOut = settlementToken;
            order.amountIn = amountToSwap;
            order.minAmountOut = amountToSwap;
            order.maxSlippageBps = maxSlippageBps;
            orders[index] = order;
            index++;
        }
    }

    function _maxDeviation(uint16[] calldata targetWeightsBps, uint256[] calldata balances) internal pure returns (uint16) {
        require(targetWeightsBps.length == balances.length, "ThresholdEngine:weights-length");
        uint256 totalValue = _totalBalance(balances);
        if (totalValue == 0) {
            return 0;
        }

        uint16 maxDeviation;
        for (uint256 i = 0; i < balances.length; i++) {
            uint256 currentWeight = _weightBps(balances[i], totalValue);
            uint16 targetWeight = targetWeightsBps[i];
            uint16 deviation = currentWeight > targetWeight
                ? uint16(currentWeight - targetWeight)
                : uint16(targetWeight - currentWeight);
            if (deviation > maxDeviation) {
                maxDeviation = deviation;
            }
        }
        return maxDeviation;
    }

    function _weightBps(uint256 balance, uint256 total) internal pure returns (uint256) {
        if (total == 0) {
            return 0;
        }
        return (balance * BPS_DENOMINATOR) / total;
    }

    function _totalBalance(uint256[] calldata balances) internal pure returns (uint256 total) {
        for (uint256 i = 0; i < balances.length; i++) {
            total += balances[i];
        }
    }
}

