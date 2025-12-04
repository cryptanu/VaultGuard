import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRightLeft,
  Clock,
  Copy,
  FileText,
  Lock,
  Shield,
  ShieldCheck,
  ShieldOff,
  Unlock,
  Users,
  Zap
} from "lucide-react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useWriteContract
} from "wagmi";
import { formatUnits, keccak256, padHex, parseUnits, stringToBytes, stringToHex, toHex } from "viem";

import { env } from "./config/env";
import { fhenixHelium } from "./lib/chain";
import { vaultGuardAbi } from "./abis/vaultGuard";
import { useVaultGuard } from "./hooks/useVaultGuard";

type FHEValueProps = {
  value: number | string;
  label?: string;
  isPrivate: boolean;
  className?: string;
};

const FHEValue: React.FC<FHEValueProps> = ({ value, label, isPrivate, className = "" }) => {
  const displayValue = typeof value === "number" ? value.toLocaleString() : value;
  const obscured = useMemo(() => {
    const text = typeof value === "string" ? value : value.toLocaleString();
    return "•".repeat(Math.max(6, Math.min(12, text.length)));
  }, [value]);

  return (
    <div className={`flex flex-col ${className}`}>
      {label && <span className="text-xs text-slate-400 mb-1">{label}</span>}
      <div
        className={`flex items-center gap-2 text-sm font-medium ${
          isPrivate ? "text-purple-300" : "text-white"
        }`}
      >
        {isPrivate ? (
          <>
            <Lock className="w-3 h-3 shrink-0" />
            <span className="font-mono tracking-wider blur-sm select-none">{obscured}</span>
          </>
        ) : (
          <span className="font-mono">{displayValue}</span>
        )}
      </div>
    </div>
  );
};

type ButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
};

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  className = "",
  onClick,
  disabled
}) => {
  const baseStyle =
    "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary: "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700",
    outline: "border border-slate-600 text-slate-400 hover:text-white hover:border-slate-500",
    ghost: "text-slate-400 hover:text-white hover:bg-slate-800/50"
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const shortenHex = (value: string, chars = 4) => {
  if (!value) return "";
  const normalized = value.startsWith("0x") ? value : `0x${value}`;
  return `${normalized.slice(0, 2 + chars)}…${normalized.slice(-chars)}`;
};

const formatTimestamp = (timestamp: bigint | number) => {
  const numeric = typeof timestamp === "number" ? timestamp : Number(timestamp);
  if (!numeric) return "—";
  return new Date(numeric * 1000).toLocaleString();
};

const formatHintAmount = (amount: bigint, decimals: number) => {
  if (amount === 0n) return "0";
  try {
    const parsed = parseFloat(formatUnits(amount, decimals));
    if (!Number.isFinite(parsed)) return "~";
    if (parsed < 0.0001) return "<0.0001";
    return parsed.toLocaleString(undefined, { maximumFractionDigits: 4 });
  } catch {
    return "~";
  }
};

const formatDuration = (seconds: number) => {
  if (seconds <= 0) return "0s";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const App: React.FC = () => {
  const [isPrivate, setIsPrivate] = useState(true);
  const [decrypting, setDecrypting] = useState(false);
  const [manualConnected, setManualConnected] = useState(false);
  const [now, setNow] = useState<number>(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 15_000);
    return () => clearInterval(timer);
  }, []);

  const { address, isConnected } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, chains } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const {
    assets,
    assetMetadataMap,
    streams,
    commitments,
    isLoading,
    isContractBacked
  } = useVaultGuard();

  const vaultAddress = env.vaultGuardAddress;
  const zeroAddress = "0x0000000000000000000000000000000000000000";

  const [depositToken, setDepositToken] = useState<string>("");
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [depositDecimals, setDepositDecimals] = useState<string>("6");

  const [payrollToken, setPayrollToken] = useState<string>("");
  const [payrollAlias, setPayrollAlias] = useState<string>("");
  const [payrollAmount, setPayrollAmount] = useState<string>("");
  const [payrollDurationDays, setPayrollDurationDays] = useState<string>("30");
  const [payrollDecimals, setPayrollDecimals] = useState<string>("6");

  const [selectedStreamId, setSelectedStreamId] = useState<string>("");
  const [claimAlias, setClaimAlias] = useState<string>("");
  const [claimAmount, setClaimAmount] = useState<string>("");
  const [claimDecimals, setClaimDecimals] = useState<string>("6");

  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const walletConnected = isConnected || manualConnected;
  const activeAddress = address ?? (manualConnected ? "0xVaultGuard...AA" : "");

  useEffect(() => {
    if (!depositToken) return;
    const meta = assetMetadataMap[depositToken.toLowerCase()];
    if (meta) {
      setDepositDecimals(String(meta.decimals));
    }
  }, [assetMetadataMap, depositToken]);

  useEffect(() => {
    if (!payrollToken) return;
    const meta = assetMetadataMap[payrollToken.toLowerCase()];
    if (meta) {
      setPayrollDecimals(String(meta.decimals));
    }
  }, [assetMetadataMap, payrollToken]);

  useEffect(() => {
    setSelectedStreamId((prev) => {
      if (prev && streams.some((stream) => String(stream.id) === prev)) {
        return prev;
      }
      return streams.length > 0 ? String(streams[0].id) : "";
    });
  }, [streams]);

  const nowBig = BigInt(now);

  const streamViews = useMemo(() => {
    return streams.map((stream) => {
      const meta =
        assetMetadataMap[stream.token.toLowerCase()] ??
        {
          symbol: "ASSET",
          name: "Unknown Asset",
          decimals: 18,
          priceUsd: 1
        };

      const decimals = meta.decimals ?? 18;
      const cappedNow =
        stream.endTime === 0n
          ? nowBig
          : nowBig < stream.endTime
            ? nowBig
            : stream.endTime;

      const claimableSeconds =
        cappedNow > stream.lastWithdrawalTime ? cappedNow - stream.lastWithdrawalTime : 0n;
      const claimableAmount = stream.rateHintPerSecond * claimableSeconds;
      const claimableDisplay = formatHintAmount(claimableAmount, decimals);
      const ratePerDay = stream.rateHintPerSecond * 86_400n;
      const rateDisplay = formatHintAmount(ratePerDay, decimals);

      let status: "ready" | "streaming" | "complete" = "streaming";
      if (!stream.active) status = "complete";
      else if (claimableSeconds > 0n) status = "ready";

      const totalElapsed =
        stream.lastWithdrawalTime > stream.startTime
          ? Number(stream.lastWithdrawalTime - stream.startTime)
          : 0;

      const totalDuration =
        stream.endTime > stream.startTime ? Number(stream.endTime - stream.startTime) : undefined;

      const remainingDuration =
        totalDuration !== undefined ? Math.max(totalDuration - totalElapsed, 0) : undefined;

      return {
        ...stream,
        tokenSymbol: meta.symbol,
        tokenName: meta.name,
        decimals,
        claimableAmount,
        claimableDisplay,
        rateDisplay,
        status,
        remainingDuration
      };
    });
  }, [assetMetadataMap, nowBig, streams]);

  const commitmentsView = useMemo(() => commitments.slice(-8).reverse(), [commitments]);

  const setStatus = (message: string) => {
    setTxStatus(message);
    setTimeout(() => setTxStatus(null), 6000);
  };

  const handleDeposit = async () => {
    if (!vaultAddress || !depositToken || !depositAmount) {
      setStatus("Please provide token, amount, and decimals.");
      return;
    }
    if (!walletConnected || !address) {
      setStatus("Connect a wallet first.");
      return;
    }

    setIsSubmitting(true);
    try {
      const decimals = Number(depositDecimals) || 6;
      const amountBigInt = parseUnits(depositAmount, decimals);
      const ciphertext = padHex(toHex(amountBigInt, { size: 32 }), { size: 32 });

      await writeContractAsync({
        address: vaultAddress as `0x${string}`,
        abi: vaultGuardAbi,
        functionName: "deposit",
        args: [
          depositToken as `0x${string}`,
          amountBigInt,
          { data: ciphertext, securityZone: 0 }
        ]
      });
      setStatus("Deposit submitted.");
    } catch (error) {
      setStatus(`Deposit failed: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleStream = async () => {
    if (!vaultAddress || !payrollToken || !payrollAlias || !payrollAmount) {
      setStatus("Provide alias, amount, token, and duration.");
      return;
    }
    if (!walletConnected || !address) {
      setStatus("Connect a wallet first.");
      return;
    }

    setIsSubmitting(true);
    try {
      const decimals = Number(payrollDecimals) || 6;
      const days = Number(payrollDurationDays) || 0;
      if (days <= 0) {
        setStatus("Duration must be greater than zero.");
        setIsSubmitting(false);
        return;
      }
      const durationSeconds = BigInt(days) * 24n * 60n * 60n;
      const totalHint = parseUnits(payrollAmount, decimals);
      if (totalHint === 0n) {
        setStatus("Amount must be greater than zero.");
        setIsSubmitting(false);
        return;
      }
      const ratePerSecond = totalHint / durationSeconds;
      if (ratePerSecond === 0n) {
        setStatus("Amount too small relative to duration and decimals.");
        setIsSubmitting(false);
        return;
      }

      const encryptedRecipient = keccak256(stringToBytes(payrollAlias));
      const encryptedRate = padHex(toHex(ratePerSecond, { size: 32 }), { size: 32 });

      await writeContractAsync({
        address: vaultAddress as `0x${string}`,
        abi: vaultGuardAbi,
        functionName: "schedulePayroll",
        args: [
          encryptedRecipient,
          { data: encryptedRate, securityZone: 0 },
          zeroAddress,
          ratePerSecond,
          payrollToken as `0x${string}`,
          durationSeconds
        ]
      });
      setStatus("Streaming payroll scheduled.");
    } catch (error) {
      setStatus(`Schedule failed: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimStream = async () => {
    if (!vaultAddress || !walletConnected || !address) {
      setStatus("Connect a wallet first.");
      return;
    }
    if (!selectedStreamId || !claimAmount || !claimAlias) {
      setStatus("Fill out stream, alias, and amount to claim.");
      return;
    }

    setIsSubmitting(true);
    try {
      const streamIdBig = BigInt(selectedStreamId);
      const decimals = Number(claimDecimals) || 6;
      const amountBigInt = parseUnits(claimAmount, decimals);
      if (amountBigInt === 0n) {
        setStatus("Amount must be greater than zero.");
        setIsSubmitting(false);
        return;
      }

      const ciphertext = padHex(toHex(amountBigInt, { size: 32 }), { size: 32 });
      const transfer = {
        vault: address as `0x${string}`,
        recipientDiversifier: keccak256(stringToBytes(`${claimAlias}-div`)),
        recipientPk: keccak256(stringToBytes(`${claimAlias}-pk`)),
        metadata: stringToHex(`payroll:${claimAlias}`),
        encryptedAmount: keccak256(stringToBytes(`${claimAlias}:${claimAmount}`))
      };

      await writeContractAsync({
        address: vaultAddress as `0x${string}`,
        abi: vaultGuardAbi,
        functionName: "claimPayrollStream",
        args: [
          address as `0x${string}`,
          streamIdBig,
          amountBigInt,
          { data: ciphertext, securityZone: 0 },
          transfer
        ]
      });
      setStatus("Claim submitted to shielded bridge.");
    } catch (error) {
      setStatus(`Claim failed: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const ensureFhenixNetwork = async () => {
    const alreadyOnChain = chains.some((chain) => chain.id === fhenixHelium.id);
    if (!alreadyOnChain) return;
    try {
      await switchChainAsync({ chainId: fhenixHelium.id });
    } catch {
      // ignored
    }
  };

  const handleWalletClick = async () => {
    if (isConnected) {
      disconnect();
      setManualConnected(false);
      return;
    }
    if (connectors.length === 0) {
      setManualConnected((prev) => !prev);
      return;
    }
    try {
      const connector = connectors[0];
      await connectAsync({ connector, chainId: fhenixHelium.id });
      await ensureFhenixNetwork();
      setManualConnected(false);
    } catch {
      setManualConnected(true);
    }
  };

  const togglePrivacy = () => {
    if (!walletConnected || decrypting) return;
    if (isPrivate) {
      setDecrypting(true);
      setTimeout(() => {
        setIsPrivate(false);
        setDecrypting(false);
      }, 600);
    } else {
      setIsPrivate(true);
    }
  };

  const copyToClipboard = (value: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(value).catch(() => {
        setStatus("Unable to copy to clipboard.");
      });
    }
  };

