# AGENTS.md — OrgVault

## Purpose
OrgVault: AI-checked, on-chain funds for student organizations on BNB Smart Chain (BSC Testnet, Chain ID 97).

## Repo File Map
- `contracts/` — Hardhat v3 Solidity project (`MockPHP.sol`, `OrgVault.sol`, tests, deploy & seed scripts)
- `app/` — Next.js (App Router + TypeScript + Tailwind + viem + zod) web app (`/submit`, `/ledger`, `/admin`, `/api/agent/submit`)
- `deployments/` — Saved BSC Testnet contract addresses & metadata (`bscTestnet.json`)
- `samples/` — Fictional receipt generator script & generated sample receipt images

## Run & Test Commands
- Contracts compile & test: `cd contracts && npx hardhat test`
- Contracts deploy (BSC Testnet): `cd contracts && npx hardhat run scripts/deploy.ts --network bscTestnet`
- App dev server: `cd app && npm run dev`
- App production build check: `cd app && npm run build`

## Core Rules
- **Testnet only:** Deploy and test strictly on BSC Testnet (Chain ID `97`) using `tBNB` and `MockPHP`. Never use real funds or mainnet keys.
- **Keep secrets out of reach:** Never read, print, or commit `.env`, `.env.*`, private keys, seed phrases, or real API keys. Do NOT commit `.env.example`; document env variable names in `README.md` only.
- **Privacy off-chain:** Keep receipt photos, student names, and sensitive descriptions off-chain (including contract storage and events). Store only `bytes32 receiptHash`, category IDs, amounts, labels, and wallet addresses on-chain.
- **Contract is the law:** Per-category budgets, vendor allowlists, registered officer reimbursement caps, and duplicate-receipt blocking (`receiptHash`) must be enforced inside `OrgVault.sol`, never only in the prompt or UI.
- **Explicit wallet & key boundaries:** The AI model never sees private keys or signs transactions. Only backend code signs EIP-712 attestations after Zod validation, and owner rules require explicit owner wallet confirmation.
- **Workflow:** Implement one milestone/issue at a time; run tests/builds and report failures or unverified gaps honestly. Never run `git push` unless explicitly instructed.
