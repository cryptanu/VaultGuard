// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@fhenixprotocol/contracts/access/Permissioned.sol";

contract PermissionHelper is Test {
    address private immutable verifyingContract;
    bytes32 private immutable hashedName;
    bytes32 private immutable hashedVersion;

    bytes32 private constant TYPE_HASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    constructor(address contractAddress) {
        verifyingContract = contractAddress;
        hashedName = keccak256(bytes("Fhenix Permission"));
        hashedVersion = keccak256(bytes("1.0"));
    }

    function generate(address owner, uint256 ownerPrivateKey) external view returns (Permission memory) {
        owner;
        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(keccak256("Permissioned(bytes32 publicKey)"), bytes32(0)))
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, digest);
        bytes memory signature = bytes.concat(r, s, bytes1(v));
        return Permission({publicKey: bytes32(0), signature: signature});
    }

    function _hashTypedDataV4(bytes32 structHash) private view returns (bytes32) {
        return MessageHashUtils.toTypedDataHash(_buildDomainSeparator(), structHash);
    }

    function _buildDomainSeparator() private view returns (bytes32) {
        return keccak256(abi.encode(TYPE_HASH, hashedName, hashedVersion, block.chainid, verifyingContract));
    }
}

