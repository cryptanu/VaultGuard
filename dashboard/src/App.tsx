import React, { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Copy,
  Droplets,
  Eye,
  EyeOff,
  FileText,
  Ghost,
  Lock,
  Shield,
  Users,
  Wallet,
  Waves,
  Zap
} from "lucide-react";
import {
  useAccount,
  useChains,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useWriteContract
} from "wagmi";
import { erc20Abi, isAddress, parseUnits } from "viem";

import { vaultGuardAbi } from "./abis/vaultGuard";
import { env } from "./config/env";
import { useVaultGuard } from "./hooks/useVaultGuard";

type EncryptedPayload = {
  data: `0x${string}`;
  securityZone: number;
};

type FormStatus = {
  state: "idle" | "pending" | "success" | "error";
  message?: string;
  txHash?: `0x${string}`;
};

const shortenHex = (value: string, chars = 4) => {
  if (!value || value.length < 2 + chars * 2) return value;
  return `${value.slice(0, 2 + chars)}…${value.slice(-chars)}`;
};

const isZeroHash = (value: string) => {
  if (!value) return true;
  const normalized = value.startsWith("0x") ? value.slice(2) : value;
  return /^0+$/.test(normalized);
};

const formatTimestamp = (value: bigint) => {
  if (value === 0n) return "—";
  return new Date(Number(value) * 1000).toLocaleString();
};

const copyToClipboard = async (text: string, notify: (status: FormStatus) => void) => {
  try {
    await navigator.clipboard.writeText(text);
    notify({ state: "success", message: "Copied to clipboard." });
  } catch (error) {
    notify({ state: "error", message: (error as Error).message });
  }
};

const parseEncryptedPayload = (hex: string, securityZone: string): EncryptedPayload => {
  const data = (hex.startsWith("0x") ? hex : `0x${hex}`) as `0x${string}`;
  const zone = Number(securityZone || "0");
  return { data, securityZone: zone };
};

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "zcash";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  onClick,
  type = "button",
  disabled
}) => {
  const baseStyle =
    "rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeClasses: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  const variantClasses: Record<ButtonVariant, string> = {
    primary: "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700",
    outline: "border border-slate-600 text-slate-400 hover:text-white hover:border-slate-500",
    ghost: "text-slate-400 hover:text-white hover:bg-slate-800/50",
    zcash: "bg-yellow-500 hover:bg-yellow-400 text-black font-semibold shadow-lg shadow-yellow-900/20"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

interface FHEValueProps {
  label?: string;
  value: string | number | bigint;
  masked: boolean;
  isCurrency?: boolean;
  isRate?: boolean;
  className?: string;
  inline?: boolean;
}

const FHEValue: React.FC<FHEValueProps> = ({
  label,
  value,
  masked,
  isCurrency = false,
  isRate = false,
  className = "",
  inline = false
}) => {
  const formatted = (() => {
    if (typeof value === "number") {
      return isCurrency ? value.toLocaleString("en-US", { style: "currency", currency: "USD" }) : value.toLocaleString();
    }
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  })();

  const display = isRate ? `${formatted} / sec` : formatted;
  const Wrapper = inline ? "span" : "div";

  return (
    <Wrapper className={`flex flex-col ${inline ? "inline-flex" : ""} ${className}`}>
      {label && <span className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</span>}
      <div className={`flex items-center gap-2 font-mono text-sm ${masked ? "text-purple-300" : "text-slate-100"}`}>
        {masked ? (
          <>
            <Lock className="h-3 w-3" />
            <span className="tracking-wider">••••••••</span>
            <span className="text-[10px] uppercase text-purple-400/80">FHE</span>
          </>
        ) : (
          <span className="truncate">{display}</span>
        )}
      </div>
    </Wrapper>
  );
};

const App = () => {
  const { address, isConnected, chainId } = useAccount();
  const chains = useChains();
  const { connectAsync, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const { assets, streams, commitments, bridgeTransfers, isLoading: isVaultLoading } = useVaultGuard();

  const [currentView, setCurrentView] = useState<"treasury" | "streams" | "audit">("treasury");
  const [maskEncrypted, setMaskEncrypted] = useState(true);
  const [status, setStatus] = useState<FormStatus>({ state: "idle" });

  const [depositToken, setDepositToken] = useState(env.vgTokenAddress);
  const [depositAmount, setDepositAmount] = useState("1000");
  const [depositEncrypted, setDepositEncrypted] = useState("0x");
  const [depositZone, setDepositZone] = useState("0");

  const [streamRecipient, setStreamRecipient] = useState("0x");
  const [streamRecipientHint, setStreamRecipientHint] = useState("0x0000000000000000000000000000000000000000");
  const [streamRateHint, setStreamRateHint] = useState("0");
  const [streamEncryptedRate, setStreamEncryptedRate] = useState("0x");
  const [streamRateZone, setStreamRateZone] = useState("0");
  const [streamDurationDays, setStreamDurationDays] = useState("30");
  const [streamToken, setStreamToken] = useState(env.vgTokenAddress);

  const [claimStreamId, setClaimStreamId] = useState("");
  const [claimAmountHint, setClaimAmountHint] = useState("0");
  const [claimEncryptedAmount, setClaimEncryptedAmount] = useState("0x");
  const [claimAmountZone, setClaimAmountZone] = useState("0");
  const [claimDiversifier, setClaimDiversifier] = useState("0x");
  const [claimRecipientPk, setClaimRecipientPk] = useState("0x");
  const [claimMetadata, setClaimMetadata] = useState("0x");
  const [claimEncryptedCommitment, setClaimEncryptedCommitment] = useState("0x");

  const connector = connectors[0];
  const sepolia = useMemo(() => chains.find((chain) => chain.id === env.sepoliaChainId), [chains]);

  useEffect(() => {
    if (!isConnected) return;
    if (env.vgTokenAddress) {
      setStreamToken(env.vgTokenAddress);
      setDepositToken(env.vgTokenAddress);
    }
  }, [isConnected]);

  const ensureSepolia = async () => {
    if (chainId === env.sepoliaChainId || !sepolia) return;
    try {
      await switchChainAsync({ chainId: sepolia.id });
    } catch (error) {
      setStatus({ state: "error", message: (error as Error).message });
    }
  };

  const handleConnect = async () => {
    if (isConnected) {
      disconnect();
      setStatus({ state: "idle" });
      return;
    }
    if (!connector) {
      setStatus({ state: "error", message: "No wallet connector configured." });
      return;
    }
    try {
      setStatus({ state: "pending", message: "Connecting wallet…" });
      await connectAsync({ connector, chainId: env.sepoliaChainId });
      await ensureSepolia();
      setStatus({ state: "success", message: "Wallet connected." });
    } catch (error) {
      setStatus({ state: "error", message: (error as Error).message });
    }
  };

  const activeAsset = useMemo(() => {
    if (!depositToken) return undefined;
    return assets.find((asset) => asset.token.toLowerCase() === depositToken.toLowerCase());
  }, [assets, depositToken]);

  const parseAmount = (value: string, decimals = 18) => {
    const trimmed = value.trim();
    if (!trimmed || Number(trimmed) <= 0) throw new Error("Amount must be positive.");
    return parseUnits(trimmed, decimals);
  };

  const ensureValidAddress = (value: string, label: string) => {
    if (!value || !isAddress(value, { strict: false })) {
      setStatus({ state: "error", message: `${label} must be a valid 20-byte hex address.` });
      return false;
    }
    return true;
  };

  const handleApprove = async () => {
    if (!ensureValidAddress(depositToken, "Token address")) {
      return;
    }
    try {
      const decimals = activeAsset?.decimals ?? 6;
      const amount = parseAmount(depositAmount, decimals);
      setStatus({ state: "pending", message: "Submitting ERC20 approval…" });
      const txHash = await writeContractAsync({
        address: depositToken as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [env.vaultGuardAddress as `0x${string}`, amount]
      });
      setStatus({ state: "success", message: "Approval transaction broadcast.", txHash });
    } catch (error) {
      setStatus({ state: "error", message: (error as Error).message });
    }
  };

  const handleDeposit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ensureValidAddress(depositToken, "Token address")) {
      return;
    }
    try {
      const decimals = activeAsset?.decimals ?? 6;
      const amount = parseAmount(depositAmount, decimals);
      const encryptedPayload = parseEncryptedPayload(depositEncrypted, depositZone);
      setStatus({ state: "pending", message: "Submitting encrypted deposit…" });
      const txHash = await writeContractAsync({
        address: env.vaultGuardAddress as `0x${string}`,
        abi: vaultGuardAbi,
        functionName: "deposit",
        args: [depositToken as `0x${string}`, amount, encryptedPayload]
      });
      setStatus({ state: "success", message: "Deposit transaction broadcast.", txHash });
    } catch (error) {
      setStatus({ state: "error", message: (error as Error).message });
    }
  };

  const handleScheduleStream = async (event: FormEvent) => {
    event.preventDefault();
    if (!ensureValidAddress(streamToken, "Stream token address")) {
      return;
    }
    if (!streamRecipient || streamRecipient === "0x") {
      setStatus({ state: "error", message: "Encrypted recipient is required." });
      return;
    }
    try {
      const encryptedRate = parseEncryptedPayload(streamEncryptedRate, streamRateZone);
      const rateHint = BigInt(streamRateHint || "0");
      const durationSeconds = BigInt(Math.max(0, Number(streamDurationDays || "0") * 24 * 60 * 60));
      setStatus({ state: "pending", message: "Scheduling payroll stream…" });
      const txHash = await writeContractAsync({
        address: env.vaultGuardAddress as `0x${string}`,
        abi: vaultGuardAbi,
        functionName: "schedulePayroll",
        args: [
          streamRecipient as `0x${string}`,
          encryptedRate,
          streamRecipientHint as `0x${string}`,
          rateHint,
          streamToken as `0x${string}`,
          durationSeconds
        ]
      });
      setStatus({ state: "success", message: "Stream scheduled.", txHash });
    } catch (error) {
      setStatus({ state: "error", message: (error as Error).message });
    }
  };

  const handleClaimStream = async (event: FormEvent) => {
    event.preventDefault();
    if (!address) {
      setStatus({ state: "error", message: "Connect an authorized wallet." });
      return;
    }
    try {
      const streamIndex = BigInt(claimStreamId || "0");
      const hintAmount = BigInt(claimAmountHint || "0");
      const encryptedAmount = parseEncryptedPayload(claimEncryptedAmount, claimAmountZone);

      if (!claimDiversifier || !claimRecipientPk || !claimEncryptedCommitment) {
        throw new Error("Shielded transfer metadata (diversifier, PK, encrypted amount) is required.");
      }

      const transfer = {
        vault: address as `0x${string}`,
        recipientDiversifier: claimDiversifier as `0x${string}`,
        recipientPk: claimRecipientPk as `0x${string}`,
        metadata: (claimMetadata || "0x") as `0x${string}`,
        encryptedAmount: claimEncryptedCommitment as `0x${string}`
      };

      setStatus({ state: "pending", message: "Claiming stream via Zcash bridge…" });
      const txHash = await writeContractAsync({
        address: env.vaultGuardAddress as `0x${string}`,
        abi: vaultGuardAbi,
        functionName: "claimPayrollStream",
        args: [address as `0x${string}`, streamIndex, hintAmount, encryptedAmount, transfer]
      });
      setStatus({ state: "success", message: "Claim submitted.", txHash });
    } catch (error) {
      setStatus({ state: "error", message: (error as Error).message });
    }
  };

  const toggleMask = () => setMaskEncrypted((prev) => !prev);

  const activeStreamCount = useMemo(() => streams.filter((stream) => stream.active).length, [streams]);
  const pendingBridgeTransfers = useMemo(
    () => bridgeTransfers.filter((transfer) => !transfer.processed).length,
    [bridgeTransfers]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside className="fixed left-0 top-0 h-full w-56 border-r border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/90 shadow-lg shadow-purple-900/30">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm uppercase tracking-widest text-purple-300/80">VaultGuard</div>
            <div className="text-xs text-slate-400">Encrypted treasury orchestration</div>
          </div>
        </div>
        <nav className="px-4 py-6 space-y-2">
          <button
            onClick={() => setCurrentView("treasury")}
            className={`w-full rounded-lg px-4 py-3 text-left text-sm font-medium transition-all ${
              currentView === "treasury"
                ? "bg-purple-600/20 text-purple-200"
                : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <Wallet className="mr-2 inline-flex h-4 w-4" />
            Treasury
          </button>
          <button
            onClick={() => setCurrentView("streams")}
            className={`w-full rounded-lg px-4 py-3 text-left text-sm font-medium transition-all ${
              currentView === "streams"
                ? "bg-purple-600/20 text-purple-200"
                : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <Waves className="mr-2 inline-flex h-4 w-4" />
            Streams & Drips
          </button>
          <button
            onClick={() => setCurrentView("audit")}
            className={`w-full rounded-lg px-4 py-3 text-left text-sm font-medium transition-all ${
              currentView === "audit"
                ? "bg-purple-600/20 text-purple-200"
                : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <FileText className="mr-2 inline-flex h-4 w-4" />
            Compliance
          </button>
        </nav>
        <div className="px-5 py-6 border-t border-slate-800">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-xs text-slate-400">
            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-widest text-yellow-500">
              <Zap className="h-3 w-3" />
              NEAR Intent Layer
            </div>
            <p>
              VaultGuard can route settlement through NEAR intents, handing the final transfer to a shielded Zcash
              address without revealing the recipient on Ethereum.
            </p>
          </div>
        </div>
      </aside>

      <main className="ml-56 min-h-screen">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/60 px-8 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="text-sm uppercase tracking-widest text-slate-500">View</span>
            <span className="text-lg font-semibold capitalize text-white">{currentView}</span>
            {isVaultLoading && <span className="ml-3 animate-pulse text-xs text-slate-500">Refreshing encrypted state…</span>}
          </div>
          <div className="flex items-center gap-3">
            {isConnected && (
              <button
                onClick={toggleMask}
                className="flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-purple-500/40 hover:text-white"
              >
                {maskEncrypted ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {maskEncrypted ? "Show hints" : "Hide hints"}
              </button>
            )}
            <button
              onClick={handleConnect}
              disabled={isConnecting || isSwitching}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-purple-900/20 transition hover:bg-purple-500 disabled:cursor-wait disabled:opacity-60"
            >
              <Wallet className="h-4 w-4" />
              {isConnected ? shortenHex(address ?? "0x", 6) : "Connect Wallet"}
            </button>
          </div>
        </header>

        {status.state !== "idle" && (
          <div
            className={`mx-8 mt-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
              status.state === "error"
                ? "border-red-900/60 bg-red-950/60 text-red-300"
                : status.state === "success"
                  ? "border-emerald-900/60 bg-emerald-950/60 text-emerald-200"
                  : "border-slate-700 bg-slate-900/60 text-slate-300"
            }`}
          >
            {status.state === "pending" && <Ghost className="h-4 w-4 animate-pulse" />}
            {status.state === "success" && <CheckCircle2 className="h-4 w-4" />}
            {status.state === "error" && <Lock className="h-4 w-4" />}
            <div>
              <div>{status.message}</div>
              {status.txHash && (
                <button
                  type="button"
                  onClick={() =>
                    window.open(`https://sepolia.etherscan.io/tx/${status.txHash}`, "_blank", "noopener,noreferrer")
                  }
                  className="mt-1 text-xs text-purple-300 underline underline-offset-4"
                >
                  View on Etherscan
                </button>
              )}
            </div>
          </div>
        )}

        <section className="px-8 py-10">
          {!isConnected ? (
            <div className="flex h-[60vh] flex-col items-center justify-center space-y-4 rounded-3xl border border-slate-800 bg-slate-900/50">
              <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-6">
                <Lock className="h-10 w-10 text-slate-400" />
              </div>
              <h2 className="text-2xl font-semibold text-white">Connect to access encrypted vault data</h2>
              <p className="max-w-lg text-center text-sm text-slate-400">
                VaultGuard keeps balances fully homomorphic encrypted. Connect an authorized wallet on Sepolia to view
                the treasury state, schedule new payroll drips, and claim Zcash-settled payouts.
              </p>
              <button
                onClick={handleConnect}
                className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-purple-900/30 transition hover:bg-purple-500"
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <>
              {currentView === "treasury" && (
                <div className="grid gap-8 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
                  <div className="space-y-6">
                    <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 shadow-xl shadow-black/30">
                      <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
                      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-purple-300/90">
                            <Shield className="h-4 w-4" />
                            Encrypted Treasury
                          </div>
                          <h2 className="text-3xl font-semibold text-white">Private vault overview</h2>
                          <p className="mt-2 max-w-xl text-sm text-slate-400">
                            Balances remain ciphertext on-chain. Toggle “Show hints” to reveal ciphertext metadata; no
                            plaintext value is ever rendered client-side.
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-400">
                          <div className="text-[11px] uppercase tracking-widest text-slate-500">Vault address</div>
                          <div className="mt-1 font-mono text-sm text-white">{shortenHex(address ?? "0x", 6)}</div>
                          <button
                            type="button"
                            className="mt-2 inline-flex items-center gap-2 text-xs text-purple-200"
                            onClick={() => copyToClipboard(address ?? "", setStatus)}
                          >
                            <Copy className="h-3 w-3" />
                            Copy
                          </button>
                        </div>
                      </div>
                      <div className="mt-8 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500">
                            <Waves className="h-3 w-3 text-blue-300" />
                            Active Streams
                          </div>
                          <FHEValue
                            className="mt-3 text-2xl font-semibold"
                            value={activeStreamCount}
                            masked={maskEncrypted}
                          />
                          <p className="mt-2 text-xs text-slate-500">
                            Encrypted drips currently flowing to recipients.
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500">
                            <Zap className="h-3 w-3 text-yellow-400" />
                            Shielded Queue
                          </div>
                          <FHEValue
                            className="mt-3 text-2xl font-semibold"
                            value={pendingBridgeTransfers}
                            masked={maskEncrypted}
                          />
                          <p className="mt-2 text-xs text-slate-500">
                            Transfers awaiting relay to the Zcash shielded pool.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {assets.length === 0 ? (
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-400 sm:col-span-2 xl:col-span-3">
                          No assets tracked yet. Approve your VG token, encrypt the deposit with `cofhejs`, and submit the
                          payload using the actions panel.
                        </div>
                      ) : (
                        assets.map((asset) => (
                          <div key={asset.token} className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-purple-500/40">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="inline-flex items-center gap-2">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-slate-200">
                                    {asset.symbol.slice(0, 3).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold text-white">{asset.name}</div>
                                    <div className="text-xs text-slate-500">{asset.symbol}</div>
                                  </div>
                                </div>
                              </div>
                              <div className="rounded-full bg-purple-500/10 p-2 text-purple-300">
                                <Lock className="h-4 w-4" />
                              </div>
                            </div>
                            <div className="mt-6 space-y-2">
                              <FHEValue label="Encrypted balance" value={asset.encryptedBalance} masked={maskEncrypted} />
                              <div className="text-[11px] font-mono uppercase tracking-widest text-slate-600">
                                {shortenHex(asset.token, 6)}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <form
                      onSubmit={handleDeposit}
                      className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-black/20"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                            Encrypted deposit
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Approve your treasury token, then submit the ciphertext payload generated via `cofhejs`.
                          </p>
                        </div>
                        <div className="rounded-lg bg-blue-500/10 p-2 text-blue-300">
                          <Droplets className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <label className="flex flex-col gap-2 text-xs text-slate-400">
                          <span>Token address</span>
                          <input
                            value={depositToken}
                        onChange={(event) => setDepositToken(event.target.value.trim())}
                            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                            placeholder="0x…"
                          />
                        </label>
                        <label className="flex flex-col gap-2 text-xs text-slate-400">
                          <span>Amount (hint)</span>
                          <input
                            value={depositAmount}
                            onChange={(event) => setDepositAmount(event.target.value)}
                            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                            placeholder="1000"
                          />
                        </label>
                        <label className="sm:col-span-2 flex flex-col gap-2 text-xs text-slate-400">
                          <span>Encrypted amount (bytes)</span>
                          <textarea
                            value={depositEncrypted}
                            onChange={(event) => setDepositEncrypted(event.target.value)}
                            className="h-24 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-purple-200 focus:border-purple-500 focus:outline-none"
                            placeholder="0x..."
                          />
                        </label>
                        <label className="flex flex-col gap-2 text-xs text-slate-400">
                          <span>Security zone</span>
                          <input
                            value={depositZone}
                            onChange={(event) => setDepositZone(event.target.value)}
                            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                            placeholder="0"
                          />
                        </label>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <Button variant="outline" type="button" onClick={handleApprove}>
                          <Activity className="h-4 w-4" />
                          Approve token
                        </Button>
                        <Button type="submit" variant="primary">
                          <Droplets className="h-4 w-4" />
                          Submit deposit
                        </Button>
                      </div>
                    </form>

                    <form
                      onSubmit={handleScheduleStream}
                      className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-black/20"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                            Schedule new stream
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Encrypt the per-second flow with `cofhejs`, then provide optional recipient hints for UI
                            discovery.
                          </p>
                        </div>
                        <div className="rounded-lg bg-purple-500/10 p-2 text-purple-300">
                          <Users className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <label className="flex flex-col gap-2 text-xs text-slate-400">
                          <span>Encrypted recipient (bytes32)</span>
                          <input
                            value={streamRecipient}
                            onChange={(event) => setStreamRecipient(event.target.value)}
                            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-mono text-purple-200 focus:border-purple-500 focus:outline-none"
                            placeholder="0x..."
                          />
                        </label>
                        <label className="flex flex-col gap-2 text-xs text-slate-400">
                          <span>Recipient hint (optional)</span>
                          <input
                            value={streamRecipientHint}
                            onChange={(event) => setStreamRecipientHint(event.target.value)}
                            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                          />
                        </label>
                        <label className="flex flex-col gap-2 text-xs text-slate-400">
                          <span>Rate hint (per second)</span>
                          <input
                            value={streamRateHint}
                            onChange={(event) => setStreamRateHint(event.target.value)}
                            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                            placeholder="0"
                          />
                        </label>
                        <label className="flex flex-col gap-2 text-xs text-slate-400">
                          <span>Duration (days)</span>
                          <input
                            value={streamDurationDays}
                            onChange={(event) => setStreamDurationDays(event.target.value)}
                            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                            placeholder="30"
                          />
                        </label>
                        <label className="flex flex-col gap-2 text-xs text-slate-400">
                          <span>Token address</span>
                          <input
                            value={streamToken}
                            onChange={(event) => setStreamToken(event.target.value)}
                            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                            placeholder="0x..."
                          />
                        </label>
                        <label className="flex flex-col gap-2 text-xs text-slate-400">
                          <span>Rate security zone</span>
                          <input
                            value={streamRateZone}
                            onChange={(event) => setStreamRateZone(event.target.value)}
                            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                            placeholder="0"
                          />
                        </label>
                        <label className="sm:col-span-2 flex flex-col gap-2 text-xs text-slate-400">
                          <span>Encrypted rate (bytes)</span>
                          <textarea
                            value={streamEncryptedRate}
                            onChange={(event) => setStreamEncryptedRate(event.target.value)}
                            className="h-24 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-purple-200 focus:border-purple-500 focus:outline-none"
                            placeholder="0x..."
                          />
                        </label>
                      </div>
                      <div className="mt-5">
                        <Button type="submit" variant="primary">
                          <Users className="h-4 w-4" />
                          Create stream
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {currentView === "streams" && (
                <div className="space-y-10">
                  <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl shadow-black/20">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Waves className="h-4 w-4 text-blue-300" />
                          Streaming Payroll
                        </div>
                        <h2 className="mt-1 text-2xl font-semibold text-white">
                          Drip encrypted salaries, settle privately in Zcash
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm text-slate-400">
                          Schedule a stream by encrypting the per-second rate with `cofhejs`, then share the stream ID
                          with your recipient. They can present their Zcash recipient metadata to pull funds on demand.
                        </p>
                      </div>
                    </div>
                    <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-950 text-xs uppercase tracking-widest text-slate-400">
                          <tr>
                            <th className="px-4 py-3 text-left">ID</th>
                            <th className="px-4 py-3 text-left">Token</th>
                            <th className="px-4 py-3 text-left">Rate Hint</th>
                            <th className="px-4 py-3 text-left">Window</th>
                            <th className="px-4 py-3 text-left">Encrypted Recipient</th>
                            <th className="px-4 py-3 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                          {streams.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                                No active streams. Schedule one below once you have an encrypted rate payload.
                              </td>
                            </tr>
                          )}
                          {streams.map((stream) => {
                            const symbol =
                              assets.find((asset) => asset.token.toLowerCase() === stream.token.toLowerCase())?.symbol ??
                              "ASSET";
                            return (
                              <tr key={stream.id} className="hover:bg-slate-800/40">
                                <td className="px-4 py-3 font-mono text-xs text-slate-400">#{stream.id}</td>
                                <td className="px-4 py-3 text-white">{symbol}</td>
                                <td className="px-4 py-3">
                                  <FHEValue
                                    value={stream.rateHintPerSecond}
                                    masked={maskEncrypted}
                                    isRate
                                    className="font-mono text-xs"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-xs text-slate-400">
                                    {formatTimestamp(stream.startTime)} → {formatTimestamp(stream.endTime)}
                                  </div>
                                  <div className="text-[10px] text-slate-600">
                                    Last withdrawal · {formatTimestamp(stream.lastWithdrawalTime)}
                                  </div>
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-purple-300">
                                  {maskEncrypted ? "0x••••" : shortenHex(stream.encryptedRecipient, 6)}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] ${
                                      stream.active
                                        ? "bg-emerald-500/10 text-emerald-300"
                                        : "bg-slate-800 text-slate-400"
                                    }`}
                                  >
                                    <Activity className="h-3 w-3" />
                                    {stream.active ? "Active" : "Closed"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <form
                    onSubmit={handleScheduleStream}
                    className="grid gap-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 md:grid-cols-2"
                  >
                    <div className="md:col-span-2 flex items-center gap-2 text-sm font-semibold text-white">
                      <Users className="h-5 w-5 text-purple-300" />
                      Schedule New Stream
                    </div>
                    <label className="flex flex-col gap-2 text-xs text-slate-400">
                      Encrypted Recipient (bytes32)
                      <input
                        value={streamRecipient}
                        onChange={(event) => setStreamRecipient(event.target.value)}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-mono text-purple-200 focus:border-purple-500 focus:outline-none"
                        placeholder="0x..."
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs text-slate-400">
                      Recipient Hint (optional address)
                      <input
                        value={streamRecipientHint}
                        onChange={(event) => setStreamRecipientHint(event.target.value)}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs text-slate-400">
                      Rate Hint Per Second
                      <input
                        value={streamRateHint}
                        onChange={(event) => setStreamRateHint(event.target.value)}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                        placeholder="0"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs text-slate-400">
                      Stream Duration (days)
                      <input
                        value={streamDurationDays}
                        onChange={(event) => setStreamDurationDays(event.target.value)}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs text-slate-400">
                      Token Address
                      <input
                        value={streamToken}
                        onChange={(event) => setStreamToken(event.target.value.trim())}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                      />
                    </label>
                    <label className="md:col-span-2 flex flex-col gap-2 text-xs text-slate-400">
                      Encrypted Rate (bytes from cofhejs)
                      <textarea
                        value={streamEncryptedRate}
                        onChange={(event) => setStreamEncryptedRate(event.target.value)}
                        className="h-24 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-purple-200 focus:border-purple-500 focus:outline-none"
                        placeholder="0x..."
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs text-slate-400">
                      Rate Security Zone
                      <input
                        value={streamRateZone}
                        onChange={(event) => setStreamRateZone(event.target.value)}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                        placeholder="0"
                      />
                    </label>
                    <div className="flex flex-col gap-2 text-xs text-slate-400">
                      <span>Action</span>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-purple-900/30 transition hover:bg-purple-500"
                      >
                        <Users className="h-4 w-4" />
                        Schedule Stream
                      </button>
                    </div>
                  </form>

                  <form
                    onSubmit={handleClaimStream}
                    className="grid gap-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 md:grid-cols-2"
                  >
                    <div className="md:col-span-2 flex items-center gap-2 text-sm font-semibold text-white">
                      <Ghost className="h-5 w-5 text-yellow-300" />
                      Claim Stream to Shielded Pool
                    </div>
                    <label className="flex flex-col gap-2 text-xs text-slate-400">
                      Stream ID
                      <input
                        value={claimStreamId}
                        onChange={(event) => setClaimStreamId(event.target.value)}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                        placeholder="0"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs text-slate-400">
                      Amount Hint (plaintext)
                      <input
                        value={claimAmountHint}
                        onChange={(event) => setClaimAmountHint(event.target.value)}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                        placeholder="0"
                      />
                    </label>
                    <label className="md:col-span-2 flex flex-col gap-2 text-xs text-slate-400">
                      Encrypted Amount (bytes)
                      <textarea
                        value={claimEncryptedAmount}
                        onChange={(event) => setClaimEncryptedAmount(event.target.value)}
                        className="h-20 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-purple-200 focus:border-purple-500 focus:outline-none"
                        placeholder="0x..."
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs text-slate-400">
                      Amount Security Zone
                      <input
                        value={claimAmountZone}
                        onChange={(event) => setClaimAmountZone(event.target.value)}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                        placeholder="0"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs text-slate-400">
                      Zcash Diversifier (bytes32)
                      <input
                        value={claimDiversifier}
                        onChange={(event) => setClaimDiversifier(event.target.value)}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-mono text-purple-200 focus:border-purple-500 focus:outline-none"
                        placeholder="0x..."
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs text-slate-400">
                      Zcash Recipient PK (bytes32)
                      <input
                        value={claimRecipientPk}
                        onChange={(event) => setClaimRecipientPk(event.target.value)}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-mono text-purple-200 focus:border-purple-500 focus:outline-none"
                        placeholder="0x..."
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs text-slate-400">
                      Commitment Metadata (optional bytes)
                      <input
                        value={claimMetadata}
                        onChange={(event) => setClaimMetadata(event.target.value)}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-mono text-purple-200 focus:border-purple-500 focus:outline-none"
                        placeholder="0x"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs text-slate-400">
                      Encrypted Shielded Amount (bytes32)
                      <input
                        value={claimEncryptedCommitment}
                        onChange={(event) => setClaimEncryptedCommitment(event.target.value)}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-mono text-purple-200 focus:border-purple-500 focus:outline-none"
                        placeholder="0x..."
                      />
                    </label>
                    <div className="flex flex-col gap-2 text-xs text-slate-400">
                      <span>Action</span>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-yellow-900/30 transition hover:bg-yellow-400"
                      >
                        <ArrowRight className="h-4 w-4" />
                        Claim to Shielded Pool
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {currentView === "audit" && (
                <div className="space-y-8">
                  <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-slate-300" />
                      <h2 className="text-xl font-semibold text-white">Shielded Commitments</h2>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      Each claim queues a Zcash commitment. Auditors with the correct viewing keys can reconcile these
                      ciphertexts without plaintext leakage.
                    </p>
                    <div className="mt-6 space-y-3">
                      {commitments.length === 0 && (
                        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-500">
                          No commitments yet. Once a payroll claim is confirmed the bridge will emit a commitment hash
                          here.
                        </div>
                      )}
                      {commitments.map((commitment, index) => (
                        <div
                          key={`${commitment}-${index}`}
                          className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3"
                        >
                          <div>
                            <div className="text-xs uppercase tracking-widest text-slate-500">Commitment #{index + 1}</div>
                            <div className="font-mono text-sm text-purple-200">
                              <FHEValue value={commitment} masked={maskEncrypted} className="font-mono text-xs" />
                            </div>
                          </div>
                          <button
                            onClick={() => copyToClipboard(commitment, setStatus)}
                            className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-purple-500/40 hover:text-white"
                          >
                            Copy
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
                    <div className="flex items-center gap-3">
                      <Activity className="h-5 w-5 text-slate-300" />
                      <h2 className="text-xl font-semibold text-white">Bridge Queue</h2>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      Off-chain relayers consume these transfers, execute the corresponding shielded payouts, and mark
                      them as processed once the Zcash transaction is finalized.
                    </p>
                    <div className="mt-6 space-y-3">
                      {bridgeTransfers.length === 0 && (
                        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-500">
                          Queue is empty. New payroll claims will appear here awaiting settlement.
                        </div>
                      )}
                      {bridgeTransfers.map((transfer) => {
                        const hasTx = !isZeroHash(transfer.zcashTxId);
                        return (
                          <div
                            key={`${transfer.commitment}-${transfer.index}`}
                            className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-4 md:flex-row md:items-start md:justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                {transfer.processed ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                ) : (
                                  <Activity className="h-4 w-4 text-yellow-300" />
                                )}
                                <span
                                  className={`text-sm font-semibold ${
                                    transfer.processed ? "text-emerald-300" : "text-yellow-200"
                                  }`}
                                >
                                  {transfer.processed ? "Processed" : "Queued"}
                                </span>
                                <span className="text-xs text-slate-500">#{transfer.index}</span>
                              </div>
                              <div className="mt-2 font-mono text-sm text-purple-200">
                                <FHEValue
                                  value={transfer.commitment}
                                  masked={maskEncrypted}
                                  className="font-mono text-xs"
                                />
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                Diversifier · {shortenHex(transfer.recipientDiversifier, 6)} · Recipient ·{" "}
                                {shortenHex(transfer.recipientPk, 6)}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                Queued {formatTimestamp(transfer.timestamp)}
                                {hasTx && <> · Zcash tx {shortenHex(transfer.zcashTxId, 6)}</>}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                Encrypted amount ·{" "}
                                <FHEValue
                                  value={transfer.encryptedAmount}
                                  masked={maskEncrypted}
                                  inline
                                  className="font-mono"
                                />
                              </div>
                              {!isZeroHash(transfer.metadata) && (
                                <div className="mt-1 text-xs text-slate-500">
                                  Metadata ·{" "}
                                  <FHEValue
                                    value={transfer.metadata}
                                    masked={maskEncrypted}
                                    inline
                                    className="font-mono"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => copyToClipboard(transfer.commitment, setStatus)}
                                className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-purple-500/40 hover:text-white"
                              >
                                Copy Commitment
                              </button>
                              <button
                                onClick={() => copyToClipboard(transfer.encryptedAmount, setStatus)}
                                className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-purple-500/40 hover:text-white"
                              >
                                Copy Amount
                              </button>
                              {!isZeroHash(transfer.metadata) && (
                                <button
                                  onClick={() => copyToClipboard(transfer.metadata, setStatus)}
                                  className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-purple-500/40 hover:text-white"
                                >
                                  Copy Metadata
                                </button>
                              )}
                              {hasTx && (
                                <button
                                  onClick={() => copyToClipboard(transfer.zcashTxId, setStatus)}
                                  className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-purple-500/40 hover:text-white"
                                >
                                  Copy Zcash Tx
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;