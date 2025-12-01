import React, { useMemo, useState } from "react";
import {
  Activity,
  ArrowRightLeft,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Ghost,
  Lock,
  Settings,
  Shield,
  Users,
  Wallet
} from "lucide-react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain
} from "wagmi";

import { fhenixHelium } from "./lib/chain";
import { useVaultGuard } from "./hooks/useVaultGuard";

type FHEValueProps = {
  value: number | string;
  label?: string;
  isPrivate: boolean;
  isCurrency?: boolean;
  className?: string;
};

const FHEValue: React.FC<FHEValueProps> = ({
  value,
  label,
  isPrivate,
  isCurrency = false,
  className = ""
}) => {
  const numericValue = typeof value === "number" ? value : Number(value);
  const displayValue = isCurrency && typeof value === "number"
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
      }).format(value)
    : typeof value === "number"
      ? value.toLocaleString()
      : value;

  const obscured = useMemo(() => {
    const stringValue =
      typeof value === "string" ? value : value.toLocaleString();
    return "•".repeat(Math.min(stringValue.length, 10));
  }, [value]);

  return (
    <div className={`flex flex-col ${className}`}>
      {label && <span className="text-xs text-slate-400 mb-1">{label}</span>}
      <div
        className={`relative transition-all duration-300 ${isPrivate ? "text-purple-400" : "text-white"}`}
      >
        {isPrivate ? (
          <div
            className="flex items-center gap-2 select-none group cursor-help"
            title="Encrypted on-chain"
          >
            <Lock className="w-3 h-3" />
            <span className="blur-sm tracking-wider font-mono">
              {obscured}
            </span>
            <span className="text-xs opacity-50 font-mono hidden group-hover:inline-block text-purple-300">
              0x...enc
            </span>
          </div>
        ) : (
          <span className="font-medium tracking-tight animate-in fade-in duration-500">
            {isCurrency && !Number.isNaN(numericValue) ? displayValue : displayValue}
          </span>
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
    "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary: "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700",
    outline: "border border-slate-600 text-slate-400 hover:text-white hover:border-slate-500",
    ghost: "text-slate-400 hover:text-white hover:bg-slate-800/50"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

type DashboardAsset = {
  token: string;
  symbol: string;
  name: string;
  balance: number;
  price: number;
  allocation: number;
};

type DashboardViewProps = {
  isPrivate: boolean;
  assets: DashboardAsset[];
  onShieldAssets: () => void;
  isContractBacked: boolean;
};

const DashboardView: React.FC<DashboardViewProps> = ({
  isPrivate,
  assets,
  onShieldAssets,
  isContractBacked
}) => {
  const totalValue = useMemo(
    () => assets.reduce((acc, asset) => acc + asset.balance * asset.price, 0),
    [assets]
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl backdrop-blur-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <Shield className="w-6 h-6" />
            </div>
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                isPrivate
                  ? "bg-purple-900/30 text-purple-300 border border-purple-800"
                  : "bg-green-900/30 text-green-300 border border-green-800"
              }`}
            >
              {isPrivate ? "Encrypted View" : "Decrypted View"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{isContractBacked ? "Live on-chain data" : "Demo dataset"}</span>
            {isContractBacked && <span className="text-green-400 font-medium">Connected</span>}
          </div>
          <FHEValue
            label="Total Vault Value"
            value={totalValue}
            isPrivate={isPrivate}
            isCurrency
            className="text-3xl font-bold"
          />
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl backdrop-blur-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Activity className="w-6 h-6" />
            </div>
          </div>
          <div className="text-slate-400 text-sm mb-1">Next Rebalance Trigger</div>
          <div className="text-xl font-semibold text-white">
            {isPrivate ? (
              <div className="flex items-center gap-2 text-purple-400">
                <Lock className="w-4 h-4" /> <span>Threshold Encrypted</span>
              </div>
            ) : (
              <span>± 5.0% Deviation</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onShieldAssets}
          className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl backdrop-blur-sm flex flex-col justify-center items-center text-center hover:bg-slate-800/50 transition-colors group"
        >
          <div className="p-3 bg-yellow-500/10 rounded-full text-yellow-500 mb-3 group-hover:scale-110 transition-transform">
            <Ghost className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-white">Shield Assets</h3>
          <p className="text-xs text-slate-400 mt-1">Bridge transparent assets to Zcash pool</p>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h3 className="font-semibold text-lg text-white">Vault Composition</h3>
          <Button variant="outline" className="text-xs h-8">
            Manage Allocation
          </Button>
        </div>
        <div className="p-6 space-y-4">
          {assets.map((asset) => (
            <div key={asset.symbol} className="group">
              <div className="flex justify-between items-end mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300">
                    {asset.symbol[0]}
                  </div>
                  <div>
                    <div className="font-medium text-white">{asset.name}</div>
                    <div className="text-xs text-slate-500">{asset.symbol}</div>
                  </div>
                </div>
                <div className="text-right">
                  <FHEValue
                    value={asset.balance * asset.price}
                    isPrivate={isPrivate}
                    isCurrency
                    className="font-mono text-sm"
                  />
                  <FHEValue
                    value={`${asset.allocation}%`}
                    isPrivate={isPrivate}
                    className="text-xs text-slate-500"
                  />
                </div>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    isPrivate ? "bg-purple-900/50 blur-[2px]" : "bg-purple-600 blur-none"
                  }`}
                  style={{ width: `${asset.allocation}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

type PayrollViewProps = {
  isPrivate: boolean;
};

const PayrollView: React.FC<PayrollViewProps> = ({ isPrivate }) => {
  const employees = useMemo(
    () => [
      { id: 1, name: "Core Dev Lead", address: "0x71C...9A2", amount: 5000, token: "USDC", status: "Scheduled" },
      { id: 2, name: "Marketing DAO", address: "0x3B2...11F", amount: 12.5, token: "ETH", status: "Processing" },
      { id: 3, name: "Security Audit", address: "0x99A...B4C", amount: 25000, token: "USDC", status: "Sent" }
    ],
    []
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Encrypted Payroll</h2>
          <p className="text-slate-400 text-sm">
            Manage recurring payments without leaking salaries on-chain.
          </p>
        </div>
        <Button>
          <Users className="w-4 h-4" /> Add Recipient
        </Button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-slate-400 uppercase text-xs font-semibold">
            <tr>
              <th className="p-4">Recipient Alias</th>
              <th className="p-4">Wallet Address (Hash)</th>
              <th className="p-4">Amount (FHE)</th>
              <th className="p-4">Next Payment</th>
              <th className="p-4">Status</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="p-4 font-medium text-white">{emp.name}</td>
                <td className="p-4 font-mono text-slate-500 flex items-center gap-2">
                  {emp.address} <Copy className="w-3 h-3 cursor-pointer hover:text-white" />
                </td>
                <td className="p-4">
                  <div
                    className={`inline-block px-3 py-1 rounded-md ${
                      isPrivate ? "bg-purple-500/10 border border-purple-500/20" : ""
                    }`}
                  >
                    <FHEValue value={`${emp.amount} ${emp.token}`} isPrivate={isPrivate} />
                  </div>
                </td>
                <td className="p-4 text-slate-400">Oct 1, 2025</td>
                <td className="p-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      emp.status === "Sent"
                        ? "bg-green-500/10 text-green-400"
                        : emp.status === "Processing"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    {emp.status === "Sent" && <CheckCircle2 className="w-3 h-3" />}
                    {emp.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <Settings className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

type SettingsViewProps = {
  isPrivate: boolean;
};

const SettingsView: React.FC<SettingsViewProps> = ({ isPrivate }) => {
  const [sliderVal, setSliderVal] = useState<number>(40);

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-white">Vault Logic Configuration</h2>
        <p className="text-slate-400 text-sm">
          These rules are encrypted using FHE. Nodes execute them blindly without knowing your strategy.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-8">
        <div>
          <div className="flex justify-between mb-4">
            <label className="text-white font-medium">ETH Target Allocation</label>
            <div className="text-purple-400 font-mono bg-purple-900/20 px-2 py-1 rounded">
              {isPrivate ? <span className="blur-sm">**%</span> : `${sliderVal}%`}
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderVal}
            onChange={(e) => setSliderVal(parseInt(e.target.value, 10))}
            disabled={isPrivate}
            className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
              isPrivate ? "bg-slate-700" : "bg-purple-600"
            }`}
          />
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>0% (Bearish)</span>
            <span>100% (Max Exposure)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Rebalance Trigger Threshold</label>
            <div
              className={`p-3 rounded-lg border border-slate-700 bg-slate-950 flex items-center justify-between ${
                isPrivate ? "opacity-50" : ""
              }`}
            >
              <span className="text-white font-mono">{isPrivate ? "****" : "5.0"}</span>
              <span className="text-slate-500 text-xs">% Deviation</span>
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Max Slippage (PhantomSwap)</label>
            <div className="p-3 rounded-lg border border-slate-700 bg-slate-950 flex items-center justify-between">
              <span className="text-white font-mono">0.5</span>
              <span className="text-slate-500 text-xs">%</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <Button className="w-full justify-center" disabled={isPrivate}>
            {isPrivate ? (
              <>
                <Lock className="w-4 h-4" /> Unlock to Edit Logic
              </>
            ) : (
              "Update Encrypted Rules"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<"dashboard" | "payroll" | "settings" | "audit">("dashboard");
  const [isPrivate, setIsPrivate] = useState<boolean>(true);
  const [isShieldModalOpen, setIsShieldModalOpen] = useState<boolean>(false);
  const [decrypting, setDecrypting] = useState<boolean>(false);
  const [manualConnected, setManualConnected] = useState<boolean>(false);

  const { address, isConnected } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, chains } = useSwitchChain();
  const { assets: vaultAssets, isContractBacked } = useVaultGuard();

  const walletConnected = isConnected || manualConnected;
  const activeAddress = address ?? (manualConnected ? "0xVaultGuard...AA" : "");

  const dashboardAssets = useMemo<DashboardAsset[]>(() => {
    const parsed = vaultAssets.map((asset) => {
      const balance =
        Number(asset.balance) / Math.pow(10, asset.decimals);
      return {
        token: asset.token,
        symbol: asset.symbol,
        name: asset.name,
        balance,
        price: asset.priceUsd,
        allocation: 0
      };
    });

    const totalValue = parsed.reduce(
      (acc, item) => acc + item.balance * item.price,
      0
    );

    if (totalValue === 0) {
      return parsed;
    }

    return parsed.map((item) => ({
      ...item,
      allocation: Math.round((item.balance * item.price * 100) / totalValue)
    }));
  }, [vaultAssets]);

  const ensureFhenixNetwork = async () => {
    const alreadyOnChain = chains.some((chain) => chain.id === fhenixHelium.id);
    if (!alreadyOnChain) return;

    try {
      await switchChainAsync({ chainId: fhenixHelium.id });
    } catch {
      // ignore for mock/demo usage
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
    if (!walletConnected || decrypting) {
      return;
    }

    if (isPrivate) {
      setDecrypting(true);
      setTimeout(() => {
        setIsPrivate(false);
        setDecrypting(false);
      }, 800);
    } else {
      setIsPrivate(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-purple-500/30">
      <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-900/50">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-white tracking-tight">VaultGuard</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: "dashboard", label: "Portfolio", icon: Activity },
            { id: "payroll", label: "Payroll Engine", icon: Users },
            { id: "settings", label: "Vault Logic", icon: Settings },
            { id: "audit", label: "Compliance", icon: FileText }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as typeof currentView)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                currentView === item.id
                  ? "bg-purple-600/10 text-purple-400 border border-purple-600/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Fhenix Helium Testnet
            </div>
            <div className="text-xs text-slate-600 font-mono">Build v0.1.0-alpha</div>
          </div>
        </div>
      </aside>

      <main className="ml-64 min-h-screen flex flex-col">
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-8">
          <h1 className="text-lg font-semibold text-white capitalize">
            {currentView === "dashboard" ? "Overview" : currentView.replace("-", " ")}
          </h1>

          <div className="flex items-center gap-4">
            {walletConnected && (
              <button
                onClick={togglePrivacy}
                disabled={decrypting}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                  isPrivate
                    ? "bg-purple-900/20 border-purple-500/30 text-purple-400"
                    : "bg-slate-800 border-slate-700 text-slate-300"
                }`}
              >
                {decrypting ? (
                  <span className="animate-spin mr-1">⏳</span>
                ) : isPrivate ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                <span className="text-xs font-medium">
                  {decrypting ? "Decrypting..." : isPrivate ? "View: Encrypted" : "View: Decrypted"}
                </span>
              </button>
            )}

            <Button
              variant={walletConnected ? "secondary" : "primary"}
              onClick={handleWalletClick}
              disabled={isPending}
            >
              <Wallet className="w-4 h-4" />
              {walletConnected
                ? activeAddress || "Connected"
                : isPending
                  ? "Connecting..."
                  : "Connect Wallet"}
            </Button>
          </div>
        </header>

        <div className="p-8 flex-1 overflow-auto">
          {!walletConnected ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-slate-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Vault Access Required</h2>
              <p className="text-slate-400 max-w-md">
                Connect your FHE-enabled wallet to decrypt your portfolio thresholds and payroll schedule.
              </p>
              <Button onClick={handleWalletClick} disabled={isPending}>
                <Wallet className="w-4 h-4" />
                {isPending ? "Connecting..." : "Connect Wallet"}
              </Button>
            </div>
          ) : (
            <>
              {currentView === "dashboard" && (
                <DashboardView
                  isPrivate={isPrivate}
                  assets={dashboardAssets}
                  isContractBacked={isContractBacked}
                  onShieldAssets={() => setIsShieldModalOpen(true)}
                />
              )}
              {currentView === "payroll" && <PayrollView isPrivate={isPrivate} />}
              {currentView === "settings" && <SettingsView isPrivate={isPrivate} />}
              {currentView === "audit" && (
                <div className="text-center py-20 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-white">Compliance Logs</h3>
                  <p>Encrypted audit trail is empty for this session.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {isShieldModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Shield Assets</h3>
              <button
                onClick={() => setIsShieldModalOpen(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6">
              <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">Public (ERC20)</div>
                <div className="font-bold text-white">USDC</div>
              </div>
              <ArrowRightLeft className="text-slate-600 animate-pulse" />
              <div className="text-center">
                <div className="text-xs text-yellow-500/80 mb-1">Shielded (ZEC)</div>
                <div className="font-bold text-yellow-500">zUSDC</div>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              This will route your assets through the Zcash bridge. The destination amount will only be visible to the
              holder of the viewing key.
            </p>
            <Button className="w-full justify-center" onClick={() => setIsShieldModalOpen(false)}>
              Confirm Shield Transaction
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

