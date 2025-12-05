# VaultGuard Demo Runbook

This guide walks through the 8-hour hackathon demo sequence for VaultGuard: encrypted portfolio management, automated rebalancing, and privacy-preserving payroll.

## 1. Environment Prep

```bash
cp config/env.example .env               # populate Sepolia RPC + contract addresses
forge install                            # resolves dependencies
npm install --prefix dashboard           # installs dashboard deps
```

## 2. Contract Simulation

1. Launch local anvil fork (optional):
   ```bash
   anvil --fork-url $SEPOLIA_RPC_URL
   ```
2. Run targeted Foundry scenarios:
   ```bash
   forge test --match-test testRebalanceTriggersOrders
   forge test --match-test testPayrollExecutionDisbursesFunds
   ```
   - Confirms encrypted thresholds trigger PhantomSwap orders.
   - Verifies payroll payouts deduct from vault and log encrypted audit entries.
3. Deploy the Sepolia stack (VG token + payroll + vault + mock ZEC bridge):
   ```bash
   forge script scripts/VaultGuard.s.sol:VaultGuardDeploy \
     --rpc-url $SEPOLIA_RPC_URL \
     --broadcast \
     --private-key $PRIVATE_KEY
   ```
   The script mints **1,000,000 VG (6 decimals)** to the deployer—use that balance for deposits and streams.

## 3. Dashboard Walkthrough

1. Build or start dev server:
   ```bash
   npm run dev --prefix dashboard
   ```
2. Demo flow (record screen or capture stills):
   - **Vault Overview**: toggle encrypted ↔ decrypted view, highlight private totals.
   - **Rebalance Trigger**: show dynamic allocation bars + threshold chip.
   - **Shield Modal**: open Ghost card, explain Zcash bridge route.
   - **Payroll Engine**: reveal blurred salary blobs, status chips.
   - **Vault Logic**: lock slider while encrypted, unlock to edit.
   - **Compliance Tab**: show empty encrypted audit trail placeholder.
3. Highlight wallet banner (Sepolia indicator) and simulated address (0xVaultGuard…).

## 4. Demo Automation Helper

Run the bundled script to reproduce core checks and bundle build artifacts:

```bash
npm run demo
```

This executes:
1. Rebalance test
2. Payroll test
3. Dashboard production build

## 5. Artifacts to Capture

- Screenshot: Overview card (encrypted + decrypted states).
- Screenshot: Payroll table with blurred amounts.
- GIF: Encrypted toggle (Eye icon → Decrypt animation).
- Screenshot: Shield modal summarising Zcash bridge.
- Console logs from `npm run demo` to include in submission appendix.

## 6. Pitch Talking Points

- **Privacy**: CoFHE-encrypted thresholds, PhantomSwap execution, Zcash settlement.
- **Automation**: Vault auto-executes via threshold engine + PhantomSwap hook, payroll frequency scheduling.
- **Compliance**: Encrypted audit log export, viewable via auditor key.
- **Account Abstraction**: ERC-4337 AA account prepared for multi-sig orchestration.

## 7. Next Steps (Post Demo)

- Wire live PhantomSwap + Zcash bridge addresses.
- Integrate Fhenix SDK for real ciphertext handling.
- Add transaction history view + decryptable audit export modal.
- Expand Foundry tests for failure paths (insufficient balance, unauthorized access).

---

✅ You now have repeatable commands, UI flow checkpoints, and narrative beats ready for final recording and submission.

