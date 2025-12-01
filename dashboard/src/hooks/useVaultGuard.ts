import { useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";

import { env } from "../config/env";
import { vaultGuardAbi } from "../abis/vaultGuard";

const tokenMetadata: Record<
  string,
  { symbol: string; name: string; decimals: number; priceUsd: number }
> = {
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": {
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    priceUsd: 2300
  },
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    priceUsd: 1
  },
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": {
    symbol: "WBTC",
    name: "Wrapped BTC",
    decimals: 8,
    priceUsd: 42000
  }
};

type VaultAsset = {
  token: string;
  balance: bigint;
  targetWeightBps: number;
  symbol: string;
  name: string;
  decimals: number;
  priceUsd: number;
};

const fallbackAssets: VaultAsset[] = [
  {
    token: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    balance: BigInt(Math.floor(45.2 * 1e18)),
    targetWeightBps: 4500,
    ...tokenMetadata["0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"]
  },
  {
    token: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    balance: BigInt(104500 * 1e6),
    targetWeightBps: 3500,
    ...tokenMetadata["0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"]
  },
  {
    token: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    balance: BigInt(Math.floor(1.5 * 1e8)),
    targetWeightBps: 2000,
    ...tokenMetadata["0x2260fac5e5542a773aa44fbcfedf7c193bc2c599"]
  }
];

export const useVaultGuard = () => {
  const { address } = useAccount();
  const contractAddress = env.vaultGuardAddress;
  const enabled = Boolean(contractAddress && contractAddress.startsWith("0x") && address);

  const { data: assetsData, isLoading } = useReadContract({
    address: contractAddress as `0x${string}` | undefined,
    abi: vaultGuardAbi,
    functionName: "getVaultTokens",
    args: address ? [address] : undefined,
    query: {
      enabled
    }
  });

  const assets = useMemo<VaultAsset[]>(() => {
    if (!enabled || !assetsData) {
      return fallbackAssets;
    }

    return (assetsData as { token: string; balance: bigint; targetWeightBps: number }[]).map((asset) => {
      const metadata = tokenMetadata[asset.token.toLowerCase()] ?? {
        symbol: "ASSET",
        name: "Unknown Asset",
        decimals: 18,
        priceUsd: 1
      };
      return {
        token: asset.token,
        balance: asset.balance,
        targetWeightBps: asset.targetWeightBps,
        ...metadata
      };
    });
  }, [assetsData, enabled]);

  return {
    assets,
    isLoading,
    isContractBacked: enabled && Boolean(assetsData)
  };
};

