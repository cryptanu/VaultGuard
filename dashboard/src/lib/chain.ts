import { defineChain } from "viem";

import { env } from "../config/env";

const defaultRpcUrl = env.sepoliaRpcUrl || "https://ethereum-sepolia-rpc.publicnode.com";

export const ethereumSepolia = defineChain({
  id: env.sepoliaChainId,
  name: "Ethereum Sepolia",
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "SEP",
    decimals: 18
  },
  rpcUrls: {
    default: { http: [defaultRpcUrl] },
    public: { http: [defaultRpcUrl] }
  },
  blockExplorers: {
    default: {
      name: "Etherscan",
      url: "https://sepolia.etherscan.io"
    }
  }
});

