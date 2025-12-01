/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FHENIX_RPC_URL?: string;
  readonly VITE_FHENIX_CHAIN_ID?: string;
  readonly VITE_VAULT_GUARD_ADDRESS?: string;
  readonly VITE_PHANTOM_SWAP_ADDRESS?: string;
  readonly VITE_ZCASH_BRIDGE_ADDRESS?: string;
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

