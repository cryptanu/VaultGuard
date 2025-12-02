// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "./MockFheOps.sol";
import "@fhenixprotocol/contracts/FHE.sol";

abstract contract FheTest is Test {
    function initializeFhe() internal {
        MockFheOps fheos = new MockFheOps();
        vm.etch(address(128), address(fheos).code);
    }

    function encrypt128(uint256 value) internal pure returns (inEuint128 memory) {
        return inEuint128(_uint256ToBytes(value), 0);
    }

    function encrypt64(uint256 value) internal pure returns (inEuint64 memory) {
        return inEuint64(_uint256ToBytes(value), 0);
    }

    function encrypt32(uint256 value) internal pure returns (inEuint32 memory) {
        return inEuint32(_uint256ToBytes(value), 0);
    }

    function encryptBool(uint256 value) internal pure returns (inEbool memory) {
        return inEbool(_uint256ToBytes(value), 0);
    }

    function unseal(string memory value) internal pure returns (uint256 result) {
        bytes memory bytesValue = bytes(value);
        require(bytesValue.length == 32, "FheTest:invalid-length");
        assembly {
            result := mload(add(bytesValue, 32))
        }
    }

    function _uint256ToBytes(uint256 value) private pure returns (bytes memory result) {
        result = new bytes(32);
        assembly {
            mstore(add(result, 32), value)
        }
    }
}

