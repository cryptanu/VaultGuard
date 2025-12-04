import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

import { ethereumSepolia } from "./chain";
import { env } from "../config/env";

const rpcUrl =
  env.sepoliaRpcUrl || "https://ethereum-sepolia-rpc.publicnode.com";

export const wagmiConfig = createConfig({
  chains: [ethereumSepolia],
  transports: {
    [ethereumSepolia.id]: http(rpcUrl),
  },
  connectors: [injected({ shimDisconnect: true })],
});
