/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SEPOLIA_RPC_URL?: string;
  readonly VITE_SEPOLIA_CHAIN_ID?: string;
  readonly VITE_VAULT_GUARD_ADDRESS?: string;
  readonly VITE_ZCASH_BRIDGE_ADDRESS?: string;
  readonly VITE_VG_TOKEN_ADDRESS?: string;
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
  readonly VITE_MOCK_FHE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

