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
          { name: "encryptedTargetWeights", type: "uint256[]" },
          { name: "encryptedDeviation", type: "uint256" },
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
          { name: "encryptedBalance", type: "bytes32" },
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
    name: "encryptedBalanceOf",
    stateMutability: "view",
    inputs: [
      { name: "vault", type: "address" },
      { name: "token", type: "address" },
      {
        name: "permission",
        type: "tuple",
        components: [
          { name: "publicKey", type: "bytes32" },
          { name: "signature", type: "bytes" }
        ]
      }
    ],
    outputs: [{ name: "", type: "string" }]
  },
  {
    type: "function",
    name: "getEncryptedTargetWeights",
    stateMutability: "view",
    inputs: [
      { name: "vault", type: "address" },
      {
        name: "permission",
        type: "tuple",
        components: [
          { name: "publicKey", type: "bytes32" },
          { name: "signature", type: "bytes" }
        ]
      }
    ],
    outputs: [{ name: "", type: "string[]" }]
  },
  {
    type: "function",
    name: "getEncryptedDeviation",
    stateMutability: "view",
    inputs: [
      { name: "vault", type: "address" },
      {
        name: "permission",
        type: "tuple",
        components: [
          { name: "publicKey", type: "bytes32" },
          { name: "signature", type: "bytes" }
        ]
      }
    ],
    outputs: [{ name: "", type: "string" }]
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
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      {
        name: "encryptedAmount",
        type: "tuple",
        components: [
          { name: "data", type: "bytes" },
          { name: "securityZone", type: "int32" }
        ]
      }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "schedulePayroll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "encryptedRecipient", type: "bytes32" },
      { name: "encryptedAmount", type: "bytes32" },
      { name: "recipientHint", type: "address" },
      { name: "amountHint", type: "uint256" },
      { name: "token", type: "address" },
      { name: "frequency", type: "uint64" }
    ],
    outputs: [{ name: "entryId", type: "uint256" }]
  },
  {
    type: "function",
    name: "executePayroll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "vault", type: "address" },
      {
        name: "transfers",
        type: "tuple[]",
        components: [
          { name: "vault", type: "address" },
          { name: "recipientDiversifier", type: "bytes32" },
          { name: "recipientPk", type: "bytes32" },
          { name: "metadata", type: "bytes" },
          { name: "encryptedAmount", type: "bytes32" }
        ]
      }
    ],
    outputs: []
  }
] as const;

