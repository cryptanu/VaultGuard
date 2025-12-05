## Sepolia Deployment Snapshot

### Live deployment (Dec 5, 2025)

- **Deployer**: `0x392c053E0502591E6a7c9003FD8F54990b1cEE98`
- **VaultGuard**: `0x77e7498060bFCD775bEfA28674C9653ed18B0215`
- **PayrollEngine**: `0xe2eC4E271d88060741b386eE6D8bcAfC09c5C684`
- **ZecBridgeClient**: `0x5215d854224B0F6ceB99D38862DCF1091A14511D`
- **VG Token (MockERC20)**: `0xA86573b0EAbA64ba84f4bcAD655c9EF45d833F90`
- **Mint**: `1_000_000 * 10^6` VG → `0x392c053E0502591E6a7c9003FD8F54990b1cEE98`

Copy these into `.env`/Vercel (see section 4) to run the dashboard against the live stack.

---

> ℹ️ Prefer a deterministic redeploy? Use a fresh, unfunded key and follow the
> broadcast steps below. The table in section 3 shows the addresses you will
> obtain if you reuse the sample key.

### 1. One-time setup

```bash
cd /path/to/zypherpunk
# install Foundry dependencies if you have not already
forge install
```

Generate a fresh deployer key (or use an existing funded Sepolia wallet):

```bash
cast wallet new
# sample output
# Address:     0x21aFe057e1dFf7606761cE86d04BD01CC22EE4C4
# Private key: 0x47bb3b900df2b7d7b86641d62fb24fe4a99a555b807d42e4842f24545a07061e
```

Fund the address above with test ETH (Sepolia faucet) before broadcasting.

### 2. Broadcast the stack

```bash
export SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
# either set PRIVATE_KEY or the alias DEPLOYER_PRIVATE_KEY
export DEPLOYER_PRIVATE_KEY=<deployer-private-key>

# optional: avoid the macOS proxy panic present in Foundry v1.0.0 by running outside tmux
# or on Linux. If the panic persists, run in Docker:
# docker run -it --rm -v $PWD:/work ghcr.io/foundry-rs/foundry forge script ...

forge script scripts/VaultGuard.s.sol:VaultGuardDeploy \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --legacy
```

When the script succeeds it will print the live addresses. Copy them into:

- `config/env` (`VAULT_GUARD_ADDRESS`, `VG_TOKEN_ADDRESS`, `ZCASH_BRIDGE_ADDRESS`)
- `dashboard/.env.local` (the `VITE_…` counterparts)
- Vercel project environment variables (same names)

### 3. Deterministic address reference

If you use the sample deployer above (fresh nonce = 0), the contract
addresses are deterministic:

| Description       | Nonce | Address                                      |
| ----------------- | ----- | -------------------------------------------- |
| VG token (MockERC20) | 0     | `0x3bc07B48F2DDD368cF592B262fF6d34ED9D5342F` |
| PayrollEngine     | 1     | `0x2084babC11837C1035c018038Ac16cD18d6F1b6b` |
| ZecBridgeClient   | 2     | `0xe546400b9d32eF85d6a80E9584b4225e1aC8a571` |
| VaultGuard        | 3     | `0x550d00E754aa3eaac2B50ce9c0c0906e29685e60` |

> 📌 These addresses **only become real** after you broadcast the script with the
> same deployer and a zero nonce. If the deployer has existing transactions, the
> nonce (and therefore the derived addresses) will differ.

### 4. Post-deploy checklist

- Mint confirmation: `VaultGuardDeploy` emits console logs once `mint` executes.
- Update `.env` & `dashboard/.env.local` with the live addresses.
- Re-run `npm run dev --prefix dashboard` and confirm the dashboard lists the new VG token.
- Execute the E2E test locally (`FOUNDRY_OFFLINE=true forge test --match-test testEndToEndPayrollFlow`)
  to ensure the deployed bytecode matches expectations.
- When a shielded payout finalizes on Zcash, call `markTransferProcessed(index, txId)` from the bridge
  operator account so the dashboard reflects the settlement status.


