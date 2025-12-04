export const vaultGuardAbi = [
  {
    type: "function",
    name: "payrollEngine",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "zecBridge",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
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
          { name: "encryptedBalance", type: "bytes32" }
        ],
        type: "tuple[]"
      }
    ]
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
    name: "getEncryptedAuditLog",
    stateMutability: "view",
    inputs: [{ name: "vault", type: "address" }],
    outputs: [{ name: "", type: "bytes32[]" }]
  },
  {
    type: "function",
    name: "getStreamCount",
    stateMutability: "view",
    inputs: [{ name: "vault", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "getStreamMetadata",
    stateMutability: "view",
    inputs: [
      { name: "vault", type: "address" },
      { name: "streamId", type: "uint256" }
    ],
    outputs: [
      { name: "encryptedRecipient", type: "bytes32" },
      { name: "token", type: "address" },
      { name: "rateHintPerSecond", type: "uint256" },
      { name: "startTime", type: "uint64" },
      { name: "lastWithdrawalTime", type: "uint64" },
      { name: "endTime", type: "uint64" },
      { name: "active", type: "bool" }
    ]
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
      {
        name: "encryptedRatePerSecond",
        type: "tuple",
        components: [
          { name: "data", type: "bytes" },
          { name: "securityZone", type: "int32" }
        ]
      },
      { name: "recipientHint", type: "address" },
      { name: "rateHintPerSecond", type: "uint256" },
      { name: "token", type: "address" },
      { name: "streamDuration", type: "uint64" }
    ],
    outputs: [{ name: "streamId", type: "uint256" }]
  },
  {
    type: "function",
    name: "claimPayrollStream",
    stateMutability: "nonpayable",
    inputs: [
      { name: "vault", type: "address" },
      { name: "streamId", type: "uint256" },
      { name: "amountHint", type: "uint256" },
      {
        name: "encryptedAmount",
        type: "tuple",
        components: [
          { name: "data", type: "bytes" },
          { name: "securityZone", type: "int32" }
        ]
      },
      {
        name: "transfer",
        type: "tuple",
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

