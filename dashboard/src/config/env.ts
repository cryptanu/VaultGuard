export const env = {
  sepoliaRpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL ?? "",
  sepoliaChainId: Number(import.meta.env.VITE_SEPOLIA_CHAIN_ID ?? "11155111"),
  walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "",
  vaultGuardAddress: import.meta.env.VITE_VAULT_GUARD_ADDRESS ?? "",
  zcashBridgeAddress: import.meta.env.VITE_ZCASH_BRIDGE_ADDRESS ?? "",
  vgTokenAddress: (import.meta.env.VITE_VG_TOKEN_ADDRESS ?? "").toLowerCase(),
  mockFhe: import.meta.env.VITE_MOCK_FHE ?? "0"
};

