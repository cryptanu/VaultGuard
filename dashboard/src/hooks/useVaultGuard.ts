import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";

import { env } from "../config/env";
import { vaultGuardAbi } from "../abis/vaultGuard";
import { zecBridgeAbi } from "../abis/zecBridge";

const staticTokenMetadata: Record<
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

type BridgeTransfer = {
  index: number;
  vault: `0x${string}`;
  commitment: `0x${string}`;
  timestamp: bigint;
  processed: boolean;
  zcashTxId: `0x${string}`;
  recipientDiversifier: `0x${string}`;
  recipientPk: `0x${string}`;
  encryptedAmount: `0x${string}`;
  metadata: `0x${string}`;
};

export const useVaultGuard = () => {
  const { address } = useAccount();
  const contractAddress = env.vaultGuardAddress;
  const enabled = Boolean(contractAddress && contractAddress.startsWith("0x") && address);

  const resolveMetadata = (token: string) => {
    const lowered = token.toLowerCase();
    if (env.vgTokenAddress && lowered === env.vgTokenAddress) {
      return {
        symbol: "VG",
        name: "VaultGuard Token",
        decimals: 6,
        priceUsd: 1
      };
    }
    return (
      staticTokenMetadata[lowered] ?? {
        symbol: "ASSET",
        name: "Unknown Asset",
        decimals: 18,
        priceUsd: 1
      }
    );
  };

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
      return [];
    }

    return (assetsData as { token: string; encryptedBalance: `0x${string}` }[])
      .filter((asset) => asset.token !== "0x0000000000000000000000000000000000000000")
      .map((asset) => {
        const metadata = resolveMetadata(asset.token);
        return {
          token: asset.token,
          encryptedBalance: asset.encryptedBalance,
          ...metadata
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

  const { data: queueLengthData } = useReadContract({
    address: (zecBridgeAddress ?? undefined) as `0x${string}` | undefined,
    abi: zecBridgeAbi,
    functionName: "queueLength",
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

  const queueLength = Number(queueLengthData ?? 0n);

  const bridgeContracts = useMemo(() => {
    if (!zecBridgeAddress || queueLength === 0) {
      return [];
    }

    return Array.from({ length: queueLength }, (_, index) => ({
      address: zecBridgeAddress as `0x${string}`,
      abi: zecBridgeAbi,
      functionName: "getQueuedTransfer" as const,
      args: [BigInt(index)]
    }));
  }, [queueLength, zecBridgeAddress]);

  const {
    data: bridgeMetadata,
    isLoading: bridgeLoading
  } = useReadContracts({
    contracts: bridgeContracts,
    query: {
      enabled: bridgeContracts.length > 0
    }
  });

  const bridgeTransfers = useMemo<BridgeTransfer[]>(() => {
    if (!bridgeMetadata || bridgeMetadata.length === 0) {
      return [];
    }

    return bridgeMetadata
      .map((entry, index) => {
        if (!entry || entry.status !== "success" || !entry.result) {
          return null;
        }

        const result = entry.result as readonly [
          {
            vault: `0x${string}`;
            recipientDiversifier: `0x${string}`;
            recipientPk: `0x${string}`;
            metadata: `0x${string}`;
            encryptedAmount: `0x${string}`;
          },
          bigint,
          boolean,
          `0x${string}`,
          `0x${string}`
        ];

        const [transfer, timestamp, processed, commitment, zcashTxId] = result;

        return {
          index,
          vault: transfer.vault,
          commitment,
          timestamp: BigInt(timestamp ?? 0),
          processed: Boolean(processed),
          zcashTxId,
          recipientDiversifier: transfer.recipientDiversifier,
          recipientPk: transfer.recipientPk,
          encryptedAmount: transfer.encryptedAmount,
          metadata: transfer.metadata
        };
      })
      .filter(Boolean) as BridgeTransfer[];
  }, [bridgeMetadata]);

  return {
    assets,
    assetMetadataMap,
    streams,
    commitments,
    bridgeTransfers,
    isLoading: assetsLoading || streamsLoading || commitmentsLoading || bridgeLoading,
    isContractBacked: enabled && Boolean(assetsData)
  };
};

