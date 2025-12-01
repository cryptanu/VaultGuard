// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IPhantomSwap {
    struct Order {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint16 maxSlippageBps;
    }

    function submitOrder(Order calldata order) external returns (bytes32 orderId);
}

