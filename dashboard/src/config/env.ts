export const env = {
  fhenixRpcUrl: import.meta.env.VITE_FHENIX_RPC_URL ?? "",
  fhenixChainId: Number(import.meta.env.VITE_FHENIX_CHAIN_ID ?? "8008135"),
  walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "",
  vaultGuardAddress: import.meta.env.VITE_VAULT_GUARD_ADDRESS ?? "",
  phantomSwapAddress: import.meta.env.VITE_PHANTOM_SWAP_ADDRESS ?? "",
  zcashBridgeAddress: import.meta.env.VITE_ZCASH_BRIDGE_ADDRESS ?? ""
};

