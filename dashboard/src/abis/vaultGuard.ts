export const vaultGuardAbi = [
  {
    type: "function",
    name: "getVaultConfig",
    stateMutability: "view",
    inputs: [{ name: "vault", type: "address" }],
    outputs: [
      {
        components: [
          { name: "owner", type: "address" },
          { name: "authorizedSigners", type: "address[]" },
          { name: "encryptedWeights", type: "bytes" },
          { name: "encryptedThresholds", type: "bytes" },
          { name: "maxSlippageBps", type: "uint16" },
          { name: "rebalanceDeviationBps", type: "uint16" },
          { name: "targetWeightsBps", type: "uint16[]" },
          { name: "lastRebalance", type: "uint64" },
          { name: "autoExecute", type: "bool" },
          { name: "vaultId", type: "bytes32" }
        ],
        type: "tuple"
      }
    ]
  },
  {
    type: "function",
    name: "getVaultTokens",
    stateMutability: "view",
    inputs: [{ name: "vault", type: "address" }],
    outputs: [
      {
        components: [
          { name: "token", type: "address" },
          { name: "balance", type: "uint256" },
          { name: "targetWeightBps", type: "uint16" }
        ],
        type: "tuple[]"
      }
    ]
  },
  {
    type: "function",
    name: "getEncryptedAuditLog",
    stateMutability: "view",
    inputs: [{ name: "vault", type: "address" }],
    outputs: [{ name: "", type: "bytes32[]" }]
  },
  {
    type: "function",
    name: "checkAndExecuteRebalancing",
    stateMutability: "nonpayable",
    inputs: [{ name: "vault", type: "address" }],
    outputs: []
  },
  {
    type: "function",
    name: "executePayroll",
    stateMutability: "nonpayable",
    inputs: [{ name: "vault", type: "address" }],
    outputs: []
  }
] as const;

