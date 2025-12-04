import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";

import { env } from "../config/env";
import { vaultGuardAbi } from "../abis/vaultGuard";
import { zecBridgeAbi } from "../abis/zecBridge";

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
  encryptedBalance: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  priceUsd: number;
  targetWeightBps?: number;
};

type VaultStream = {
  id: number;
  encryptedRecipient: `0x${string}`;
  token: `0x${string}`;
  rateHintPerSecond: bigint;
  startTime: bigint;
  lastWithdrawalTime: bigint;
  endTime: bigint;
  active: boolean;
};

const fallbackAssets: VaultAsset[] = [
  {
    token: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    encryptedBalance: ("0x" + "0".repeat(64)) as `0x${string}`,
    ...tokenMetadata["0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"]
  },
  {
    token: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    encryptedBalance: ("0x" + "0".repeat(64)) as `0x${string}`,
    ...tokenMetadata["0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"]
  },
  {
    token: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    encryptedBalance: ("0x" + "0".repeat(64)) as `0x${string}`,
    ...tokenMetadata["0x2260fac5e5542a773aa44fbcfedf7c193bc2c599"]
  }
];

export const useVaultGuard = () => {
  const { address } = useAccount();
  const contractAddress = env.vaultGuardAddress;
  const enabled = Boolean(contractAddress && contractAddress.startsWith("0x") && address);

  const {
    data: assetsData,
    isLoading: assetsLoading
  } = useReadContract({
    address: contractAddress as `0x${string}` | undefined,
    abi: vaultGuardAbi,
    functionName: "getVaultTokens",
    args: address ? [address] : undefined,
    query: {
      enabled
    }
  });

  const { data: zecBridgeAddress } = useReadContract({
    address: contractAddress as `0x${string}` | undefined,
    abi: vaultGuardAbi,
    functionName: "zecBridge",
    query: {
      enabled
    }
  });

  const { data: streamCountData } = useReadContract({
    address: contractAddress as `0x${string}` | undefined,
    abi: vaultGuardAbi,
    functionName: "getStreamCount",
    args: address ? [address] : undefined,
    query: {
      enabled
    }
  });

  const assets = useMemo<VaultAsset[]>(() => {
    if (!enabled || !assetsData) {
      return fallbackAssets;
    }

    return (assetsData as { token: string; encryptedBalance: `0x${string}` }[]).map((asset) => {
      const metadata = tokenMetadata[asset.token.toLowerCase()] ?? {
        symbol: "ASSET",
        name: "Unknown Asset",
        decimals: 18,
        priceUsd: 1
      };
      return {
        token: asset.token,
        encryptedBalance: asset.encryptedBalance,
        ...metadata,
        targetWeightBps: 0
      };
    });
  }, [assetsData, enabled]);

  const assetMetadataMap = useMemo<Record<string, VaultAsset>>(() => {
    return assets.reduce<Record<string, VaultAsset>>((acc, asset) => {
      acc[asset.token.toLowerCase()] = asset;
      return acc;
    }, {});
  }, [assets]);

  const streamCount = Number(streamCountData ?? 0n);

  const streamContracts = useMemo(() => {
    if (!enabled || !address || !contractAddress || streamCount === 0) {
      return [];
    }

    return Array.from({ length: streamCount }, (_, index) => ({
      address: contractAddress as `0x${string}`,
      abi: vaultGuardAbi,
      functionName: "getStreamMetadata" as const,
      args: [address, BigInt(index)]
    }));
  }, [address, contractAddress, enabled, streamCount]);

  const {
    data: streamMetadata,
    isLoading: streamsLoading
  } = useReadContracts({
    contracts: streamContracts,
    query: {
      enabled: streamContracts.length > 0
    }
  });

  const { data: commitmentsData, isLoading: commitmentsLoading } = useReadContract({
    address: (zecBridgeAddress ?? undefined) as `0x${string}` | undefined,
    abi: zecBridgeAbi,
    functionName: "getCommitments",
    query: {
      enabled: Boolean(zecBridgeAddress)
    }
  });

  const streams = useMemo<VaultStream[]>(() => {
    if (!streamMetadata || streamMetadata.length === 0) {
      return [];
    }

    return streamMetadata
      .map((entry, index) => {
        if (!entry || entry.status !== "success" || !entry.result) {
          return null;
        }
        const result = entry.result as readonly [
          `0x${string}`,
          `0x${string}`,
          bigint,
          bigint,
          bigint,
          bigint,
          boolean
        ];
        const [
          encryptedRecipient,
          token,
          rateHintPerSecond,
          startTime,
          lastWithdrawalTime,
          endTime,
          active
        ] = result;

        return {
          id: index,
          encryptedRecipient,
          token,
          rateHintPerSecond: BigInt(rateHintPerSecond ?? 0),
          startTime: BigInt(startTime ?? 0),
          lastWithdrawalTime: BigInt(lastWithdrawalTime ?? 0),
          endTime: BigInt(endTime ?? 0),
          active: Boolean(active)
        };
      })
      .filter(Boolean) as VaultStream[];
  }, [streamMetadata]);

  const commitments = useMemo<`0x${string}`[]>(() => {
    if (!commitmentsData) {
      return [];
    }
    return commitmentsData as `0x${string}`[];
  }, [commitmentsData]);

  return {
    assets,
    assetMetadataMap,
    streams,
    commitments,
    isLoading: assetsLoading || streamsLoading || commitmentsLoading,
    isContractBacked: enabled && Boolean(assetsData)
  };
};

