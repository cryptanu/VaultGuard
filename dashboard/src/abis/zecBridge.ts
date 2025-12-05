export const zecBridgeAbi = [
  {
    type: "function",
    name: "getCommitments",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32[]" }]
  },
  {
    type: "function",
    name: "queueLength",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "getQueuedTransfer",
    stateMutability: "view",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [
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
      },
      { name: "timestamp", type: "uint64" },
      { name: "processed", type: "bool" },
      { name: "commitment", type: "bytes32" },
      { name: "zcashTxId", type: "bytes32" }
    ]
  },
  {
    type: "function",
    name: "markTransferProcessed",
    stateMutability: "nonpayable",
    inputs: [
      { name: "index", type: "uint256" },
      { name: "zcashTxId", type: "bytes32" }
    ],
    outputs: []
  },
  {
    type: "event",
    name: "TransferProcessed",
    inputs: [
      { name: "index", type: "uint256", indexed: true },
      { name: "commitment", type: "bytes32", indexed: false },
      { name: "zcashTxId", type: "bytes32", indexed: false }
    ],
    anonymous: false
  }
] as const;
