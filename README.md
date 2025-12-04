# VaultGuard

VaultGuard lets DAOs and remote-first teams run payroll without leaking balances or allocations.

- Treasury reporters upload ciphertext balances via Fhenix CoFHE, keeping strategy and runway private.
- Employers configure drip streams so recipients can withdraw pro‑rata at any time, settling privately through a Zcash bridge.
- Auditor-friendly commitment logs prove every payout happened—no individual salary data is ever revealed.

---

## Why VaultGuard Exists

Traditional payroll tools expose balances, headcount, and runway to whoever operates the payments stack. Zcash organizations want automation without surrendering privacy, and compliance teams still need an auditable trail. VaultGuard combines fully homomorphic encryption (FHE) with shielded settlement so treasuries stay private end-to-end while still shipping on-time payouts and provable reporting.

---

## How It Works

1. **Capture & Encrypt** – Treasury operators encrypt token balances, target allocations, and payroll metadata locally using Fhenix CoFHE tooling.
2. **Store Ciphertext State** – `VaultGuard.sol` keeps encrypted balances (`euint128`) and payroll streams; the helper `PayrollEngine.sol` enforces drip parameters.
3. **Stream & Claim** – Recipients withdraw accrued amounts on demand. Withdrawals transfer wrapped tokens to a Zcash bridge adapter, which completes settlement on the shielded side.
4. **Prove Compliance** – Each execution emits commitment logs. Auditors receive viewing keys to verify payouts without learning amounts or recipients.

<details>
<summary>Architecture Snapshot</summary>

```
Client (FHE Wallet / Dashboard)
  ├─ Fhenix CoFHE SDK (encrypt balances, payroll rates)
  └─ Wallet connection (Wagmi + Sepolia)

Contracts
  ├─ VaultGuard.sol (vault registry, encrypted balances)
  ├─ PayrollEngine.sol (drip scheduling, accrual tracking)
  └─ IZecBridge adapter (mock bridge → shielded pool)

Settlement
  └─ Zcash shielded pool + commitment log for audit proof
```

</details>

---

## Repository Structure

| Directory | Purpose |
|-----------|---------|
| `contracts/` | Solidity core (VaultGuard, PayrollEngine, mocks). |
| `dashboard/` | Vite + React front-end integrating Wagmi for Sepolia. |
| `test/` | Foundry tests running with a mock FHE precompile. |
| `demo/` | Scripts and runbook for showcasing the encrypted flow. |
| `docs/` | Pitch, architecture notes, and references. |

---

## Quick Start (Local)

```bash
# 1. Install dependencies
forge install
npm install
npm install --prefix dashboard

# 2. Configure env variables (Sepolia defaults)
cp config/env.example config/env
cp dashboard/.env.example dashboard/.env.local  # if present

# 3. Run the Foundry tests
forge test

# 4. Launch the dashboard (Sepolia)
npm run dev --prefix dashboard
```

Set `VITE_SEPOLIA_RPC_URL`, `VITE_VAULT_GUARD_ADDRESS`, `VITE_ZCASH_BRIDGE_ADDRESS`, and optionally `VITE_VG_TOKEN_ADDRESS`. Toggle `VITE_MOCK_FHE=1` if you want to run in mock mode without the FHE precompile.

---

## Current Status

| Feature | Status | Notes |
|---------|--------|-------|
| Encrypted vault balances | ✅ | Stored as `euint128` via Fhenix library. |
| Payroll drip scheduling | ✅ | `PayrollEngine.sol` accrues and enforces rate hints. |
| Shielded settlement bridge | ✅ (mock) | Emits commitments; replace mock adapter when live endpoints exist. |
| Auditor proof trail | ✅ | Commitment log available for viewing-key holders. |
| Automated rebalancing | 🚧 Planned | Requires private DEX integrations (e.g., PhantomSwap). |

---

## Additional Reading

- [`vault.plan.md`](vault.plan.md) – progress tracker and integration notes.
- [`demo/RUNBOOK.md`](demo/RUNBOOK.md) – talking points for live demos.
- [Fhenix CoFHE](https://fhenix.zone/) – underlying fully homomorphic encryption platform.
- [Zcash](https://z.cash/) – shielded pool design underpinning settlements.

---

MIT License © VaultGuard Contributors

