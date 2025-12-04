import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Wallet, 
  ArrowRightLeft, 
  Users, 
  FileText, 
  Activity, 
  CheckCircle2,
  Copy,
  Ghost,
  Waves,
  Zap,
  ArrowRight,
  Droplets
} from 'lucide-react';

// --- Utility Components & Types ---

// 1. FHE Value Component: Handles Encrypted vs Decrypted states
interface FHEValueProps {
  value: string | number;
  label?: string;
  isPrivate: boolean;
  isCurrency?: boolean;
  isRate?: boolean; // New prop for formatting stream rates
  className?: string;
}

const FHEValue: React.FC<FHEValueProps> = ({ value, label, isPrivate, isCurrency = false, isRate = false, className = "" }) => {
  let displayValue = value;
  
  if (!isPrivate) {
    if (isCurrency) {
      displayValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
    } else if (isRate) {
      displayValue = `${value}/sec`;
    }
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {label && <span className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wider">{label}</span>}
      <div className={`relative transition-all duration-300 ${isPrivate ? 'text-purple-400' : 'text-white'}`}>
        {isPrivate ? (
          <div className="flex items-center gap-2 select-none group cursor-help" title="Encrypted on-chain">
            <Lock className="w-3 h-3" />
            <span className="blur-sm tracking-wider font-mono">
              {typeof value === 'string' ? '•'.repeat(Math.min(value.length, 8)) : '••••••'}
            </span>
            {/* Visual hint that this is FHE data */}
            <span className="text-[10px] uppercase opacity-40 font-mono hidden group-hover:inline-block text-purple-300 border border-purple-800 px-1 rounded">
              FHE
            </span>
          </div>
        ) : (
          <span className="font-medium tracking-tight animate-in fade-in duration-500 font-mono">
            {displayValue}
          </span>
        )}
      </div>
    </div>
  );
};

// 2. Button Component
const Button = ({ children, variant = 'primary', className = "", onClick, disabled, size = 'md' }: any) => {
  const baseStyle = "rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  const variants = {
    primary: "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700",
    outline: "border border-slate-600 text-slate-400 hover:text-white hover:border-slate-500",
    ghost: "text-slate-400 hover:text-white hover:bg-slate-800/50",
    zcash: "bg-yellow-500 hover:bg-yellow-400 text-black font-bold shadow-lg shadow-yellow-900/20"
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${sizes[size as keyof typeof sizes]} ${variants[variant as keyof typeof variants]} ${className}`}
    >
      {children}
    </button>
  );
};

// --- Streaming Logic Components ---

// Simulated Stream Data Interface
interface Stream {
  id: string;
  recipient: string;
  token: string;
  flowRate: number; // Tokens per second
  accrued: number;
  status: 'active' | 'paused' | 'completed';
  startDate: string;
}

// VIEW: Treasury Overview (Simplified Dashboard)
const TreasuryView = ({ isPrivate }: { isPrivate: boolean }) => {
  const assets = [
    { symbol: 'USDC', name: 'USD Coin', balance: 250000, price: 1, allocation: 60 },
    { symbol: 'ETH', name: 'Ethereum', balance: 45.2, price: 2300, allocation: 25 },
    { symbol: 'ZEC', name: 'Zcash', balance: 1500, price: 30, allocation: 15 },
  ];

  const totalValue = assets.reduce((acc, asset) => acc + (asset.balance * asset.price), 0);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Hero Stats */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-8 rounded-2xl relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Shield className="w-64 h-64 text-purple-500" />
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-slate-400">FHE Encrypted Treasury</span>
            </div>
            <FHEValue 
              label="Total Assets Under Management" 
              value={totalValue} 
              isPrivate={isPrivate} 
              isCurrency={true} 
              className="text-4xl font-bold" 
            />
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1 bg-slate-900/80 border border-slate-700 p-4 rounded-xl">
               <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Active Streams</div>
               <div className="text-2xl font-bold text-white flex items-center gap-2">
                 {isPrivate ? <Lock className="w-4 h-4 text-purple-400" /> : '8'}
                 <span className="text-sm font-normal text-slate-500">Recipients</span>
               </div>
            </div>
            <div className="flex-1 bg-slate-900/80 border border-slate-700 p-4 rounded-xl">
               <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Monthly Outflow</div>
               <FHEValue value={42000} isPrivate={isPrivate} isCurrency={true} className="text-xl font-bold" />
            </div>
          </div>
        </div>
      </div>

      {/* Asset Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {assets.map((asset) => (
          <div key={asset.symbol} className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${asset.symbol === 'ZEC' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-slate-800 text-slate-300'}`}>
                  {asset.symbol}
                </div>
                <div>
                  <div className="font-bold text-white">{asset.name}</div>
                  <div className="text-xs text-slate-500">Available to Stream</div>
                </div>
              </div>
            </div>
            <div className="space-y-1">
               <FHEValue value={asset.balance} isPrivate={isPrivate} className="text-xl font-mono font-bold" />
               <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
                 <div className={`h-full ${isPrivate ? 'bg-purple-500/50 blur-[1px]' : 'bg-purple-500'}`} style={{ width: `${asset.allocation}%` }} />
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// VIEW: Streaming Engine (The Core Feature)
const StreamsView = ({ isPrivate, onClaim }: { isPrivate: boolean, onClaim: () => void }) => {
  const [activeTab, setActiveTab] = useState<'outgoing' | 'incoming'>('incoming');
  
  // Mock Stream Data - In reality, fetched from contract
  const incomingStream: Stream = {
    id: 'stream-0x123',
    recipient: 'You (0xAlice)',
    token: 'USDC',
    flowRate: 0.0034, // USDC per second
    accrued: 450.23,
    status: 'active',
    startDate: '2025-10-01'
  };

  const outgoingStreams: Stream[] = [
    { id: '1', recipient: 'Dev Guild', token: 'ETH', flowRate: 0.000012, accrued: 1.2, status: 'active', startDate: '2025-11-01' },
    { id: '2', recipient: 'Marketing', token: 'USDC', flowRate: 0.005, accrued: 850.00, status: 'active', startDate: '2025-11-15' },
  ];

  // Simulated live accruing effect
  const [displayAccrued, setDisplayAccrued] = useState(incomingStream.accrued);
  useEffect(() => {
    if (isPrivate) return; // Don't animate if encrypted
    const interval = setInterval(() => {
      setDisplayAccrued(prev => prev + (incomingStream.flowRate * 0.5)); // fast forward for demo
    }, 100);
    return () => clearInterval(interval);
  }, [isPrivate]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Stream Controls */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Waves className="w-6 h-6 text-blue-400" /> Payroll Streams
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Real-time, encrypted salary streaming. Settle via Zcash.
          </p>
        </div>
        
        <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 flex">
          <button 
            onClick={() => setActiveTab('incoming')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'incoming' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            Incoming (Recipient)
          </button>
          <button 
            onClick={() => setActiveTab('outgoing')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'outgoing' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            Outgoing (Employer)
          </button>
        </div>
      </div>

      {activeTab === 'incoming' ? (
        // --- INCOMING STREAM VIEW (Employee) ---
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Active Stream Card */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-32 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-blue-500/10 transition-all duration-1000"></div>
            
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Droplets className="w-6 h-6 animate-bounce" style={{ animationDuration: '3s' }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Active Salary Stream</h3>
                  <div className="text-sm text-slate-500 flex items-center gap-2">
                    From <span className="font-mono bg-slate-800 px-1.5 rounded text-slate-300">VaultGuard Treasury</span>
                  </div>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                Streaming
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8 relative z-10">
              <div>
                <FHEValue 
                  label="Unclaimed Accrual" 
                  value={isPrivate ? incomingStream.accrued : displayAccrued.toFixed(6)} 
                  isPrivate={isPrivate} 
                  className="text-4xl font-mono font-bold text-white"
                />
                <div className="text-sm text-slate-500 mt-1">{incomingStream.token}</div>
              </div>
              <div>
                <FHEValue 
                  label="Current Flow Rate" 
                  value={incomingStream.flowRate} 
                  isPrivate={isPrivate}
                  isRate={true}
                  className="text-xl font-mono text-slate-300" 
                />
                <div className="text-sm text-slate-500 mt-1">per second</div>
              </div>
            </div>

            {/* Progress Bar Visualizer */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-8">
              <div className="h-full bg-blue-500 w-full animate-progress-indeterminate"></div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-6">
              <div className="text-xs text-slate-500">
                Started: <span className="text-slate-400">{incomingStream.startDate}</span>
              </div>
              <Button variant="zcash" onClick={onClaim} disabled={isPrivate} className="shadow-yellow-900/20">
                {isPrivate ? <><Lock className="w-4 h-4" /> Unlock to Claim</> : 'Claim to Shielded Pool'}
              </Button>
            </div>
          </div>

          {/* Context / History Side Card */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Settlement Method</h3>
             <div className="bg-black/40 border border-slate-800 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 font-bold">Z</div>
                  <div className="font-medium text-white">Zcash Shielded</div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Claims are routed through the ZEC bridge. The destination address remains private and unlinked from your Ethereum identity.
                </p>
             </div>
             <div className="space-y-3">
               <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Claims</div>
               {[1,2].map(i => (
                 <div key={i} className="flex justify-between items-center text-sm p-2 hover:bg-slate-800 rounded transition-colors cursor-pointer">
                   <div className="flex items-center gap-2 text-slate-300">
                     <CheckCircle2 className="w-3 h-3 text-green-500" />
                     <span>Oct {10+i}</span>
                   </div>
                   <div className="font-mono text-slate-500">0.5 ZEC</div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      ) : (
        // --- OUTGOING STREAM VIEW (Employer) ---
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
             <div className="text-sm font-medium text-slate-400">Active Payroll Streams</div>
             <Button size="sm" variant="outline"><Users className="w-3 h-3" /> Create New Stream</Button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-500 uppercase text-xs font-semibold">
              <tr>
                <th className="p-4">Recipient</th>
                <th className="p-4">Token</th>
                <th className="p-4">Flow Rate (FHE)</th>
                <th className="p-4">Accrued (FHE)</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {outgoingStreams.map((stream) => (
                <tr key={stream.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-white">{stream.recipient}</div>
                    <div className="text-xs text-slate-500 font-mono">0x...Hash</div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                       <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white">
                         {stream.token[0]}
                       </div>
                       {stream.token}
                    </div>
                  </td>
                  <td className="p-4">
                    <FHEValue value={stream.flowRate} isPrivate={isPrivate} isRate={true} className="font-mono text-slate-300" />
                  </td>
                  <td className="p-4">
                    <FHEValue value={stream.accrued} isPrivate={isPrivate} className="font-mono text-slate-300" />
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                      <Activity className="w-3 h-3" /> Active
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-slate-400 hover:text-white transition-colors">Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// --- Main App Component ---

const App = () => {
  const [currentView, setCurrentView] = useState<'treasury' | 'streams' | 'audit'>('treasury');
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isPrivate, setIsPrivate] = useState(true);
  const [isZcashModalOpen, setIsZcashModalOpen] = useState(false);
  const [decrypting, setDecrypting] = useState(false);

  // Toggle Privacy Simulation
  const togglePrivacy = () => {
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
      
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-900/50">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-white tracking-tight">VaultGuard</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setCurrentView('treasury')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentView === 'treasury' 
                ? 'bg-purple-600/10 text-purple-400 border border-purple-600/20' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span className="font-medium">Treasury</span>
          </button>
          
          <button
            onClick={() => setCurrentView('streams')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentView === 'streams' 
                ? 'bg-purple-600/10 text-purple-400 border border-purple-600/20' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Waves className="w-4 h-4" />
            <span className="font-medium">Streams & Drips</span>
          </button>

          <button
            onClick={() => setCurrentView('audit')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentView === 'audit' 
                ? 'bg-purple-600/10 text-purple-400 border border-purple-600/20' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="font-medium">Compliance</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
            <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-wider mb-2">
              <Zap className="w-3 h-3 text-yellow-500" />
              VaultGuard Intent Layer
            </div>
            <p className="text-xs text-slate-400">
              Automated stream settlement enabled via NEAR Intents.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen flex flex-col relative">
        
        {/* Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-8">
          <h1 className="text-lg font-semibold text-white capitalize">
            {currentView === 'streams' ? 'Streaming Engine' : currentView}
          </h1>
          
          <div className="flex items-center gap-4">
            {isWalletConnected && (
              <button 
                onClick={togglePrivacy}
                disabled={decrypting}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                  isPrivate 
                    ? 'bg-purple-900/20 border-purple-500/30 text-purple-400' 
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                {decrypting ? <span className="animate-spin">⏳</span> : isPrivate ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="text-xs font-medium">
                  {decrypting ? 'Decrypting...' : isPrivate ? 'View: Encrypted' : 'View: Decrypted'}
                </span>
              </button>
            )}

            <Button 
              variant={isWalletConnected ? "secondary" : "primary"}
              onClick={() => setIsWalletConnected(!isWalletConnected)}
            >
              <Wallet className="w-4 h-4" />
              {isWalletConnected ? '0xAlice...B7A' : 'Connect Wallet'}
            </Button>
          </div>
        </header>

        {/* Dynamic View */}
        <div className="p-8 flex-1">
          {!isWalletConnected ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-slate-700">
                <Lock className="w-8 h-8 text-slate-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Encrypted Vault Access</h2>
              <p className="text-slate-400 max-w-md">
                Connect your FHE-enabled wallet to decrypt stream flow rates and treasury balances.
              </p>
              <Button onClick={() => setIsWalletConnected(true)}>Connect Wallet</Button>
            </div>
          ) : (
            <>
              {currentView === 'treasury' && <TreasuryView isPrivate={isPrivate} />}
              {currentView === 'streams' && <StreamsView isPrivate={isPrivate} onClaim={() => setIsZcashModalOpen(true)} />}
              {currentView === 'audit' && (
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

      {/* Zcash Settlement Modal */}
      {isZcashModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-0 shadow-2xl overflow-hidden">
            <div className="bg-slate-950 p-6 border-b border-slate-800">
               <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold text-white">Settlement via Zcash</h3>
                  <button onClick={() => setIsZcashModalOpen(false)} className="text-slate-400 hover:text-white">&times;</button>
               </div>
               <p className="text-xs text-slate-400 mt-2">
                 Your claim will be routed through the ZEC Privacy Bridge. 
               </p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1">Stream Source</div>
                  <div className="font-bold text-white text-lg">USDC</div>
                  <div className="text-[10px] bg-purple-900/30 text-purple-400 px-1 rounded">FHE Vault</div>
                </div>
                
                <div className="flex flex-col items-center">
                   <div className="h-0.5 w-16 bg-slate-700 relative">
                     <div className="absolute inset-0 bg-blue-500 animate-progress-indeterminate"></div>
                   </div>
                   <ArrowRight className="w-4 h-4 text-slate-500 mt-1" />
                </div>

                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1">Destination</div>
                  <div className="font-bold text-yellow-500 text-lg">zUSDC</div>
                  <div className="text-[10px] bg-yellow-900/20 text-yellow-500 px-1 rounded">Shielded Pool</div>
                </div>
              </div>

              <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 text-sm space-y-2">
                 <div className="flex justify-between">
                   <span className="text-slate-500">Claim Amount</span>
                   <span className="text-white font-mono">450.23 USDC</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-slate-500">Bridge Fee</span>
                   <span className="text-white font-mono">0.05 USDC</span>
                 </div>
                 <div className="border-t border-slate-800 pt-2 flex justify-between font-bold">
                   <span className="text-white">Total Shielded</span>
                   <span className="text-yellow-500">450.18 zUSDC</span>
                 </div>
              </div>

              <Button className="w-full justify-center" variant="zcash">
                 Confirm Settlement
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
