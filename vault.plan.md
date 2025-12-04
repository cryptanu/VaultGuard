<!-- 98612463-87a7-4b46-8fac-bc0d964776db cf070964-0c0b-4a73-8484-0b0b70b2b647 -->
# VaultGuard Streaming Roadmap

## Mission
Deliver a production-ready privacy vault that pairs FHE-encrypted treasury management with shielded Zcash settlement and intent-driven automation. `VaultGuard` now focuses on encrypted drip payroll streams instead of one-off payouts.

## Current State
- **Contracts**: `VaultGuard.sol` + `PayrollEngine.sol` support encrypted balances and streaming payroll claims. Events, audit logs, and tests (unit + E2E) are green.
- **Settlement**: ZEC transfers routed to `MockZecBridge`; awaiting connection to a live shielded bridge.
- **Frontend**: React dashboard exposes mock deposit/schedule/claim forms using updated ABI, but UX is barebones and lacks stream introspection.
- **Tooling**: Foundry + Vite builds passing (`forge test`, `npm run build --prefix dashboard`). Deployment script targets Sepolia/Base.

## Strategic Objectives
1. **Stream Experience**
   - Visualize active payroll streams (encrypted balances, accrued amounts).
   - Add recipient portal (signature-gated) to request claims.
   - Provide status, error handling, and audit log explorer.

2. **Settlement Hardening**
   - Integrate real Zcash bridge API, implement retries and commitment proofs.
   - Export encrypted audit logs with compliance metadata.
   - Document key management (diversifiers, viewing keys) for operators.

3. **Intent Layer**
   - Prototype NEAR intent that triggers `claimPayrollStream` without revealing plaintext.
   - Model cross-domain security guarantees; add tests/docs for intent flow.

4. **Deployment & Ops**
   - Parameterize Foundry scripts for dev/stage/prod environments.
   - Provide runbooks for vault initialization, stream setup, and recovery.
   - Add monitoring hooks for key events (stream created, claim executed, bridge settlement).

5. **Submission & Narrative**
   - Refresh README, architecture doc, and pitch deck with streaming emphasis.
   - Record end-to-end demo (encrypted setup through shielded payout).
   - Prepare FAQ covering FHE leak mitigations and bridge risks.

## Execution Tracks (Todos)
- `stream-ux`: redesign dashboard (portfolio + stream tables, claim workflow, encrypted previews).
- `zec-integration`: swap `MockZecBridge` for live bridge client, add settlement confirmation.
- `near-intent`: build intent adapter + example script, document privacy guarantees.
- `ops-automation`: extend deploy script, env templates, CI coverage.
- `submission-assets`: finalize docs, demo video, and pitch narrative.

## Suggested Timeline (3-day sprint)
1. **Day 1 – UX & Contract Polish**
   - Lock ABI changes, refresh tests, start front-end redesign.
2. **Day 2 – Bridge & Intent Integration**
   - Implement bridge client, validate E2E, prototype NEAR intent.
3. **Day 3 – Operationalization & Collateral**
   - Document runbooks, integrate monitoring, produce submission assets.

Progress will be tracked via the execution tracks above; update this roadmap as milestones close or scope shifts.

