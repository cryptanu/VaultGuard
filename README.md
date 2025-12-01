# VaultGuard MVP

VaultGuard is a privacy-preserving vault orchestrator that encrypts portfolio allocations with Fhenix CoFHE, executes swaps privately via PhantomSwap, and settles payroll through Zcash shielded pools. This repository contains smart contracts, React dashboard, and demo automation to support the Zypherpunk hackathon submission.

## Features

- **Encrypted Vault Logic** – `VaultGuard.sol` stores target weights and thresholds as ciphertext placeholders and triggers PhantomSwap orders through the `ThresholdEngine`.
- **Automated Payroll** – `PayrollEngine.sol` schedules recurring payouts with encrypted recipient metadata and emits audit-friendly events.
- **AA-Ready Execution** – `AAAccount.sol` provides an ERC-4337-compatible account for automated rebalancing calls.
- **React Dashboard** – Tailwind-powered UI toggles encrypted/decrypted views, payroll management, vault logic controls, and compliance exports.
- **Demo Harness** – `npm run demo` executes Foundry simulations and builds the dashboard for fast validation.

## Repository Layout

- `contracts/` – Solidity sources (`VaultGuard`, `ThresholdEngine`, `PayrollEngine`, `AAAccount`) plus mocks and interfaces.
- `scripts/` – Deploy/broadcast automation (`scripts/VaultGuard.s.sol`).
- `test/` – Foundry specs covering vault initialization, rebalancing, and payroll execution.
- `dashboard/` – Vite + React frontend aligned with the supplied UX draft.
- `demo/` – Runbook, CLI harness, and capture checklist for the live demo.
- `config/` – Environment templates shared across contracts and frontend.

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`, `anvil`)
- Node.js 18+ (or Deno when adapted); npm or pnpm
- Access to Fhenix Helium RPC endpoint + PhantomSwap test deployment

## Quick Start

```bash
# 1. Install deps
forge install
npm install --prefix dashboard

# 2. Configure environment variables
cp config/env.example .env                  # update with deployed addresses

# 3. Run contract tests
forge test

# 4. Launch the dashboard
npm run dev --prefix dashboard
```

## Demo Automation

Run the bundled sequence of smoke checks (rebalancing test, payroll test, dashboard build):

```bash
npm run demo
```

See [`demo/RUNBOOK.md`](demo/RUNBOOK.md) for the full presentation flow, capture list, and talking points.

## Contract Deployment

```bash
forge script scripts/VaultGuard.s.sol \
  --rpc-url $FHENIX_RPC_URL \
  --broadcast
```

Populate the resulting addresses into `config/env.example` and the dashboard `.env`.

## Documentation

- Architecture brief: `/Users/cryptanu/Library/Containers/ru.keepcoder.Telegram/Data/tmp/vaultguard_architecture.md`
- Implementation roadmap: `vault.plan.md`
- Demo walkthrough: [`demo/RUNBOOK.md`](demo/RUNBOOK.md)

## License

MIT

