# VaultGuard Pitch Notes

## Opening (30s)

- Institutions and DAOs avoid on-chain rebalancing because allocations leak before execution.
- Payroll on public blockchains reveals sensitive salaries, creating governance and HR risk.
- VaultGuard encrypts allocation logic with Fhenix CoFHE, executes swaps privately via PhantomSwap, and settles payroll through a Zcash bridge—privacy without sacrificing automation.

## Product Story (90s)

1. **Encrypted Vault Setup**
   - User deposits into VaultGuard, target weights + triggers encrypted client-side.
   - Authorized signers stored for future ERC-4337 automation.
2. **Threshold Engine**
   - CoFHE comparisons determine deviation without revealing weights.
   - When deviation exceeds 5%, PhantomSwap receives encrypted swap orders.
3. **Automated Payroll**
   - PayrollEngine holds encrypted recipient hashes + amounts.
   - Schedule executes via VaultGuard, emitting encrypted audit hashes.
4. **Dashboard**
   - Toggle encrypted ↔ decrypted view, manage vault logic, inspect compliance logs.
   - Shield modal highlights Zcash bridge path for salary settlement.

## Proof Points (60s)

- **Contracts**: `forge test` covers rebalancing and payroll flows, including PhantomSwap order emission and audit log updates.
- **Automation**: `npm run demo` executes the full scenario in <1 minute (tests + dashboard build).
- **UX**: Frontend mirrors encrypted/decrypted states, showing what privacy-first treasury ops feels like.
- **Compliance**: Audit hashes exportable for regulators while salaries remain concealed.

## Roadmap (30s)

- Integrate live PhantomSwap + Zcash contracts on Helium testnet.
- Add Fhenix SDK ciphertext verification + auditor decryption tool.
- Extend AAAccount for multi-sig threshold approvals and automated UserOps.
- Expand analytics (MEV savings, rebalance scorecards) for institutional reporting.

## Close (30s)

- VaultGuard delivers private asset management with automated execution and compliance-ready logging.
- Ask: support to productionize encrypted swaps with PhantomSwap + Fhenix, targeting DeFi treasuries and Web3 payroll teams hungry for privacy.

