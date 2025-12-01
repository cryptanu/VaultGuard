// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "../interfaces/IPhantomSwap.sol";

contract MockPhantomSwap is IPhantomSwap {
    Order public lastOrder;
    uint256 public ordersSubmitted;

    event OrderReceived(Order order, bytes32 orderId);

    function submitOrder(Order calldata order) external override returns (bytes32 orderId) {
        lastOrder = order;
        ordersSubmitted += 1;
        orderId = keccak256(abi.encode(order.tokenIn, order.tokenOut, order.amountIn, block.timestamp));
        emit OrderReceived(order, orderId);
    }

    function getLastOrder() external view returns (Order memory order) {
        order = lastOrder;
    }
}

