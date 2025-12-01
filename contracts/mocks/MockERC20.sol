// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "../interfaces/IERC20.sol";

contract MockERC20 is IERC20 {
    string public name;
    string public symbol;
    uint8 public immutable decimals;
    uint256 private _totalSupply;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 value) external override returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 value) external override returns (bool) {
        _allowances[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external override returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        require(currentAllowance >= value, "allowance-too-low");
        _allowances[from][msg.sender] = currentAllowance - value;
        _transfer(from, to, value);
        emit Approval(from, msg.sender, _allowances[from][msg.sender]);
        return true;
    }

    function mint(address to, uint256 value) external {
        _totalSupply += value;
        _balances[to] += value;
        emit Transfer(address(0), to, value);
    }

    function burn(address from, uint256 value) external {
        uint256 balance = _balances[from];
        require(balance >= value, "balance-too-low");
        _balances[from] = balance - value;
        _totalSupply -= value;
        emit Transfer(from, address(0), value);
    }

    function _transfer(address from, address to, uint256 value) internal {
        uint256 balance = _balances[from];
        require(balance >= value, "balance-too-low");
        _balances[from] = balance - value;
        _balances[to] += value;
        emit Transfer(from, to, value);
    }
}

