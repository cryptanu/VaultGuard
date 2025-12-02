# VaultGuard – Encrypted Treasury Automation for Zcash & DeFi

[![Fhenix](https://img.shields.io/badge/Fhenix-FHE-purple)](https://fhenix.zone/)
[![Zcash](https://img.shields.io/badge/Zcash-Bridge-yellow)](https://z.cash/)
[![Hackathon](https://img.shields.io/badge/Hackathon-Zypherpunk%20x%20Fhenix-blue)](https://zypherpunk.dev/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

VaultGuard turns privacy-conscious treasuries into self-driving vaults: encrypted payroll, shielded ZEC settlement, and compliance-ready logging—while keeping allocation logic confidential through Fhenix FHE. Automated rebalancing is scoped for a post-MVP release.

---

## 📋 Table of Contents

- [🎯 The Problem](#-the-problem)
- [💡 The Solution](#-the-solution)
- [🔧 How It Works](#-how-it-works)
- [👤 User Journey](#-user-journey)
- [🏛️ Architecture](#️-architecture)
- [🔒 Privacy Analysis](#-privacy-analysis)
- [🚀 Use Cases](#-use-cases)
- [🏷️ Tier System](#️-tier-system)
- [🔌 DeFi Integration](#-defi-integration)
- [🏆 Why This Wins](#-why-this-wins)
- [🛠️ Repository Layout](#️-repository-layout)
- [⚙️ Prerequisites](#️-prerequisites)
- [🚀 Quick Start](#-quick-start)
- [🧪 Testing & Demo Automation](#-testing--demo-automation)
- [📡 Deployment](#-deployment)
- [🧭 Roadmap Status](#-roadmap-status)
- [📑 References](#-references)

---

## 🎯 The Problem

Zcash treasuries and private DAOs need to diversify portfolios, run payroll, and prove compliance—without exposing strategies or salary data. Today they face a brutal trade-off:

```
┌─────────────────────────────────────────────────────┐
│ MEET ALICE – THE PRIVACY-FIRST CFO                  │
└─────────────────────────────────────────────────────┘
Alice manages a Zcash-first treasury:
├─ 40% BTC, 30% ETH, 20% stables, 10% long-tail
├─ Multisig signers want auto rebalancing + payroll
├─ Compliance needs encrypted audit trails
└─ Strategy leakage = MEV, front-running, HR exposure

Options on the table:
├─ Reveal allocations to execute? ❌ Zero privacy
├─ Centralized custodian?         ❌ Single point of failure
├─ Manual execution?              ❌ High friction, human error
└─ Result today: privacy ≠ automation
```

**The paradox:** privacy-preserving assets (ZEC) can’t be automated without revealing the very data users are trying to protect.

---

## 💡 The Solution

VaultGuard delivers encrypted treasury automation anchored on three production-ready pillars (with rebalancing planned for v2):

```
┌─────────────────────────────────────────────────────┐
│ THE BREAKTHROUGH                                    │
└─────────────────────────────────────────────────────┘
Encrypted instructions in → Shielded execution out.
Payroll, treasury reporting, and ZEC settlement happen without exposing raw allocations.
```

### Core Innovations (MVP)

- **Fhenix FHE Everywhere** – Treasury balances, target tiers, and payroll deltas stay encrypted from input through settlement (`VaultGuard.sol` + FHERC20 primitives).
- **Privacy-Preserving Payroll** – Employee rosters and amounts sealed via `PayrollEngine.sol`, settled through ZEC bridge hooks.
- **Compliance Without Exposure** – Auditors receive encrypted logs, decryptable only with delegated keys.

### Looking Ahead (V2+)

- **Automated Rebalancing** – Threshold-driven swaps via private execution venues (PhantomSwap or equivalent) once live liquidity partners are integrated.

---

## 🔧 How It Works

1. **Encrypt & Configure**
   - Treasury owners run the VaultGuard dashboard.
   - Payroll rosters, budget tiers, and reporting preferences are encrypted client-side via the Fhenix SDK before leaving the device.
2. **Store Encrypted State**
   - `VaultGuard.sol` stores ciphertext payroll amounts, vault balances (`euint128`), and encrypted deviation budgets for future upgrade paths.
3. **Execute Shielded Payroll**
   - On schedule, `PayrollEngine.sol` decrypts only to the extent required to validate amounts, then routes payouts through the wrapped ZEC bridge.
4. **Audit & Prove**
   - `VaultGuard` appends encrypted audit entries. Authorized auditors invoke `getEncryptedAuditLog` + viewing keys to verify operations without seeing raw amounts.
5. **(Future) Encrypted Rebalancing**
   - Threshold triggers and encrypted order sizing live in `ThresholdEngine.sol`, ready to connect once private DEX partners (e.g., PhantomSwap) ship production endpoints.

---

## 👤 User Journey

**Dana – DAO Treasurer with ZEC-heavy treasury**

1. **Set Up Vault**
   - Connects to VaultGuard dashboard.
   - Encrypts target allocation (45% ETH, 35% USDC, 20% wZEC) and payroll roster (5 contributors).
2. **Run Operations**
   - Payroll Engine executes monthly payouts via wrapped ZEC bridge; recipients only expose shielded addresses.
   - DAO signers monitor encrypted spending tiers in real time without revealing allocation breakdowns.
3. **Compliance & Reporting**
   - Dana exports encrypted audit blobs for the compliance team.
   - Auditors decrypt using delegated keys; tokenholders see proofs without raw salary info.
4. **Iterate Strategy**
   - Dana tweaks encrypted target weights from the dashboard; no on-chain plaintext updates ever recorded.

> ✅ Automation achieved  
> ✅ Strategy remains private  
> ✅ Payroll stays shielded  
> ✅ Audit requirements satisfied

---

## 🏛️ Architecture

```
flowchart TD
    subgraph Client
        UI[VaultGuard Dashboard]
        FSDK[Fhenix SDK]
        Wallet[AA Wallet / Signer]
    end

    subgraph Contracts
        VG[VaultGuard.sol]
        TE[(ThresholdEngine.sol\nfuture-use)]
        PE[PayrollEngine.sol]
        AA[AAAccount.sol]
    end

    subgraph Execution
        ZB[Wrapped ZEC Bridge]
    end

    subgraph Settlement
        Shield[Zcash Shielded Pool]
    end

    UI --> FSDK
    FSDK --> VG
    Wallet --> AA
    AA --> VG
    VG --> PE
    TE -. planned .-> VG
    PE --> ZB
    ZB --> Shield
```

- **FHERC20**: Encrypted balances stored inside VaultGuard via the official `@fhenixprotocol/contracts` library.
- **Mock Layers** (current state): ZEC bridge settlement is mocked for development. Roadmap replaces with live connectors once shielded payout infrastructure is provisioned. Rebalancing hooks remain staged for future PhantomSwap (or equivalent) integration.

---

## 🔒 Privacy Analysis

| Stage | Data | Encryption | Exposure |
|-------|------|------------|----------|
| User Input | Target weights, deviation threshold, payroll | Client-side FHE | User only |
| Contract State | Encrypted configs & balances (`euint128`) | FHE ciphertext | Accessible but opaque |
| Threshold Check | Deviations vs targets | Homomorphic compare | No plaintext |
| Swap Execution | Order amounts | Submitted as ciphertext to PhantomSwap | Only swap engine decrypts |
| Payroll Settlement | Recipient & amount | Shielded via wrapped ZEC | Only recipient viewing key |
| Audit Export | Encrypted log blobs | Decryptable w/ auditor key | Auditor-only |

> **Mocks in use:** `MockPhantomSwap` and `MockFheOps` power local testing. Production roll-out swaps these with partner-provided adapters—tracked in [`vault.plan.md`](vault.plan.md).

---

## 🚀 Use Cases

- **Corporate Treasury** – Rebalance diversified holdings with encrypted strategy.
- **DAO Payroll** – Shielded payments to contributors without leaking salaries.
- **Asset Managers** – Offer privacy-preserving discretionary strategies to LPs.
- **Compliance-Friendly Privacy** – Generate auditor-facing proofs without revealing raw data.

---

## 🏷️ Tier System

VaultGuard assigns encrypted “execution tiers” to help downstream protocols reason about vault maturity:

| Tier | Encrypted AUM (Range) | Automated Features | Notes |
|------|-----------------------|--------------------|-------|
| Bronze | `>= 10k` units encrypted | Payroll only | Entry-level automation |
| Silver | `>= 100k` | Payroll + rebalancing | Default launch tier |
| Gold | `>= 1M` | Adds compliance exports | Target for institutional pilots |
| Platinum | `>= 5M` | Cross-vault coordination + MEV shielding | Roadmap (requires ZEC bridge live) |

All comparisons happen homomorphically; only tier metadata is revealed to integrators.

---

## 🔌 DeFi Integration

```solidity
import { VaultGuard } from "./contracts/VaultGuard.sol";
import { Permission } from "@fhenixprotocol/contracts/access/Permissioned.sol";

contract StrategyAdapter {
    VaultGuard public immutable vaultGuard;

    constructor(address _vaultGuard) {
        vaultGuard = VaultGuard(_vaultGuard);
    }

    function checkTier(address vault, Permission calldata permission) external view returns (bool) {
        string memory encrypted = vaultGuard.getEncryptedDeviation(vault, permission);
        // Off-chain decrypt or compare via Fhenix SDK
        // Decide to extend credit / unlock leverage based on decrypted tier
        return true;
    }
}
```

- Rebalance hooks integrate with PhantomSwap / other private DEXs.
- Shielded payouts route through the wrapped ZEC bridge (placeholder interface ready; implementation pending live endpoints).
- Frontend exports ABI from `dashboard/src/abis/vaultGuard.ts` with encrypted getters for Wagmi/viem clients.

---

## 🏆 Why This Wins

- **True Privacy** – End-to-end FHE; no plaintext leak in transit or storage.
- **Programmable Automation** – Rebalancing + payroll + compliance in one pipeline.
- **Zcash-First** – Shielded payroll and asset settlement instead of ETH-only flows.
- **Auditor-Friendly** – Encrypted logs decryptable for regulators.
- **Developer Ergonomics** – Foundry + React stack, ready for rapid iteration.

---

## 🛠️ Repository Layout

- `contracts/` – Core Solidity (`VaultGuard`, `ThresholdEngine`, `PayrollEngine`, `AAAccount`) plus FHERC20 integration and mocks.
- `scripts/` – Foundry deployment script (`scripts/VaultGuard.s.sol`).
- `test/` – Foundry suites with FHE-enabled harness (`test/utils` bootstraps mock precompile).
- `dashboard/` – Vite + React front-end mirroring the encrypted UX flows.
- `demo/` – Runbook + CLI harness (`npm run demo`) for validation.
- `docs/` – Supplemental pitch material.
- `vault.plan.md` – Live plan tracking progress vs roadmap.

---

## ⚙️ Prerequisites

- Node.js 18+
- npm (or pnpm)
- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Access to Fhenix Helium RPC (`FHENIX_RPC_URL`) and PhantomSwap sandbox (for future live testing)

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
forge install
npm install            # root deps (Fhenix, OZ)
npm install --prefix dashboard

# 2. Configure env variables
cp config/env.example .env   # Fill in Fhenix, PhantomSwap, ZEC bridge placeholders

# 3. Run contract tests
forge test

# 4. Launch the dashboard
npm run dev --prefix dashboard

# 5. Use dashboard forms (mock)
#    - Deposit mock tokens (encrypts amount client-side)
#    - Schedule encrypted payroll entries
#    - Execute shielded payroll via wrapped ZEC bridge
```

---

## 🧪 Testing & Demo Automation

```bash
# One-command validation (unit + e2e + dashboard build)
npm run demo

# Standalone: run the full Foundry suite (includes encrypted payroll E2E)
forge test
forge test --match-test testEndToEndPayrollFlow
```

See [`demo/RUNBOOK.md`](demo/RUNBOOK.md) for capture scripts and talking points.

---

## 📡 Deployment

```bash
forge script scripts/VaultGuard.s.sol \
  --rpc-url $FHENIX_RPC_URL \
  --broadcast
```

Update `.env` + dashboard env with the deployed contract addresses afterward.

---

## 🧭 Roadmap Status

| Item | Status |
|------|--------|
| Core vault + payroll logic | ✅ |
| Fhenix FHERC20 integration | ✅ |
| React dashboard parity | ✅ |
| Demo harness (`npm run demo`) | ✅ |
| Wrapped ZEC bridge contracts | ✅ |
| Automated rebalancing (PhantomSwap or equivalent) | 🗓 Future release |
| Replace test mocks (`MockFheOps`) with live precompile | 🔜 After partner access |
| Extended documentation & SDK | 🔜 Post-MVP |

> **Mocks allowed (temporarily):** `MockFheOps` powers FHE operations in tests. Rebalancing adapters and live bridge connectors will be wired once partner endpoints ship.

---

## 📑 References

- Architecture brief: `/Users/cryptanu/Library/Containers/ru.keepcoder.Telegram/Data/tmp/vaultguard_architecture.md`
- Implementation plan: [`vault.plan.md`](vault.plan.md)
- Demo walkthrough: [`demo/RUNBOOK.md`](demo/RUNBOOK.md)
- Pitch outline: [`docs/PITCH.md`](docs/PITCH.md)

---

MIT License © VaultGuard Contributors

