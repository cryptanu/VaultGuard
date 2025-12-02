<!-- 98612463-87a7-4b46-8fac-bc0d964776db cf070964-0c0b-4a73-8484-0b0b70b2b647 -->
# VaultGuard 8-Hour Sprint

## Objectives
- Ship hackathon-ready MVP covering encrypted vault config, automated rebalancing stub, payroll scheduling, and dashboard integration.
- Align backend contracts with provided React dashboard for coherent demo and narrative.
- Prepare lightweight testing and demo artifacts (screens, scripts, talking points).
- Extend confidentiality with production FHERC20 support and ZEC settlement rails.

## Deliverables
- Smart contracts in `contracts/` with deployment script & Foundry tests.
- Frontend integration in `dashboard/` (React) wired to contract ABIs and mock data.
- Demo runbook: setup, flows (rebalance trigger, payroll execution, compliance export).
- Fhenix-based encrypted asset handling (FHERC20 + CoFHE helpers).
- Wrapped ZEC bridge for shielded payouts.
- Foundry end-to-end suite exercising encrypted payroll and shielded settlement.

## Timeline (8 Hours)
- **Hour 0-1 – Architecture & Env Setup**
  - Confirm toolchain (`forge`, `npm`, Fhenix SDK) and configure `.env` stubs.
  - Finalize contract interfaces (`VaultGuard.sol`, `ThresholdEngine.sol`, `PayrollEngine.sol`, `AAAccount.sol`).
- **Hour 1-3 – Smart Contracts MVP**
  - Implement minimal viable logic with homomorphic placeholders & PhantomSwap/Zcash hooks.
  - Write Foundry unit tests focusing on vault init, deposit, payroll scheduling.
  - Draft deployment scripts in `scripts/VaultGuard.s.sol`.
- **Hour 3-4 – Contract Integration Tests & Stubs**
  - Run `forge test`; capture outputs for submission appendix.
  - Produce mock encrypted blobs & placeholder addresses for frontend.
- **Hour 4-6 – Frontend Adaptation**
  - Integrate Fhenix SDK + wagmi/ethers in `dashboard/`.
  - Wire views to contract ABIs, add state toggles (encrypted vs decrypted), hook up payroll actions.
  - Implement minimal compliance export modal with dummy data.
- **Hour 6-7 – Demo Workflow & Automation**
  - Create `demo/` scripts: CLI or script to simulate threshold breach + payroll execution.
  - Generate screenshots/video snippet via `npm run dev:dashboard` demo path.
- **Hour 7-8 – Polish & Submission Prep**
  - Write README + architecture summary referencing `/Users/cryptanu/Library/Containers/ru.keepcoder.Telegram/Data/tmp/vaultguard_architecture.md`.
  - Prepare pitch bullets, risks, roadmap next steps.
  - Final QA, ensure repo clean, bundle artifacts for submission.

## Implementation Todos
- `setup-env`: Toolchain check, env files, dependency install. ✅
- `contracts-mvp`: Implement core contracts + Foundry tests. ✅
- `frontend-integration`: Connect dashboard to contracts & SDK mocks. ✅
- `demo-assets`: Produce runbook, scripts, screenshots. ✅
- `submission-pack`: Final README, pitch notes, cleanup. ✅
- `publish-repo`: Stage, commit, and push repo to `github.com/cryptanu/VaultGuard`. ✅
- `fherc20-impl`: Build FHERC20 + CoFHE helper layer using `@fhenixprotocol/contracts`. ✅
- `vault-cofhe-integration`: Wire encrypted balances/weights into `VaultGuard`, update ABI & tests. ✅
- `zec-settlement`: Implement wrapped ZEC bridge + shielded payroll settlement. ✅
- `tests-docs-refresh`: Expand test coverage, docs, and demo assets post-ZEC integration. ✅

### To-dos

- [x] Install deps, configure env stubs
- [x] Implement core contracts + Foundry tests
- [x] Wire dashboard to contracts/SDK
- [x] Create demo scripts + capture assets
- [x] Finalize README, pitch notes
- [x] Commit & push to GitHub
- [x] Build FHERC20 + CoFHE helper layer
- [x] Integrate FHERC20 & CoFHE into vault logic
- [x] Implement wrapped ZEC settlement
- [x] Refresh tests/docs/demo after FHE & ZEC integration

