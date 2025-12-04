import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { sepolia } from "wagmi/chains";

const sepoliaRpcUrl =
  import.meta.env.VITE_SEPOLIA_RPC_URL ??
  "https://ethereum-sepolia-rpc.publicnode.com";

export const wagmiConfig = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(sepoliaRpcUrl),
  },
  connectors: [injected({ shimDisconnect: true })],
});
import { createConfig, http } from "wagmi";

import { ethereumSepolia } from "./chain";
import { env } from "../config/env";

const defaultSepoliaRpc = env.sepoliaRpcUrl || "https://ethereum-sepolia-rpc.publicnode.com";

export const wagmiConfig = createConfig({
  chains: [ethereumSepolia],
  transports: {
    [ethereumSepolia.id]: http(defaultSepoliaRpc)
  }
});

