# OrgVault

**One-liner:** For student org treasurers who track dues in spreadsheets and group chats, OrgVault uses AI to read receipts and BNB Smart Chain (BSC Testnet) to enforce budgets and release payouts.

## Architecture Overview

```text
Member / Officer (/submit, /ledger, /admin)
        │
        ▼
Next.js API (/api/agent/submit)
  ├─ 1. AI Adapter (Gemini 3.8 Flash w/ tool calling + DEMO_MOCK fallback)
  │     Tools: check_budget, list_vendors, list_officers, propose_expense
  ├─ 2. Zod validation + human confirmation gate (> CONFIRM_THRESHOLD)
  ├─ 3. Backend EIP-712 Attestor signs Expense(recipient, kind, amount, category, receiptHash, memo, deadline)
  └─ 4. viem simulateContract -> Relayer sends executeExpense() to OrgVault.sol
        │
        ▼
BSC Testnet (Chain ID 97)
  ├─ MockPHP.sol (1 token = ₱1.00, testnet-only)
  └─ OrgVault.sol (enforces budgets, approved vendors, officer caps, duplicate receiptHash)
```

## Deployed Contracts (BSC Testnet, Chain ID 97)

> Pending Milestone 2 testnet deployment — run `cd contracts && npx hardhat run scripts/deploy.ts --network bscTestnet` once `contracts/.env` is configured. Addresses will be saved to `deployments/bscTestnet.json`.

- **MockPHP:** _Pending deploy_
- **OrgVault:** _Pending deploy_

## Setup Steps

### 1. Contracts
```bash
cd contracts
npm install
npx hardhat test
npx hardhat run scripts/check-gas.ts --network bscTestnet
npx hardhat run scripts/deploy.ts --network bscTestnet
npx hardhat run scripts/seed.ts --network bscTestnet
```

### 2. Web App
```bash
cd app
npm install
npm run dev
```

### 3. Sample Receipts
```bash
node samples/generate-receipts.mjs
```

## Required Environment Variable Names

Do **not** commit `.env`, `.env.*`, or `.env.example`. Set these locally:

### `contracts/.env`
- `DEPLOYER_PRIVATE_KEY` — BSC Testnet deployer/owner wallet private key (testnet only)
- `BSC_TESTNET_RPC` — BSC Testnet RPC URL (e.g. `https://data-seed-prebsc-1-s1.bnbchain.org:8545` or `https://bsc-testnet-rpc.publicnode.com`)
- `BSCSCAN_API_KEY` — BscScan API key for contract verification
- `ATTESTOR_ADDRESS` — Public address of the backend EIP-712 attestor (optional; defaults to deployer)

### `app/.env.local`
- `AI_PROVIDER` — `gemini` (or `mock`)
- `GEMINI_API_KEY` — Google Gemini API key
- `GEMINI_MODEL` — e.g. `gemini-3.8-flash`
- `DEMO_MOCK` — `true` to force deterministic mock AI extraction, `false` to use Gemini
- `CONFIRM_THRESHOLD` — Peso threshold requiring officer confirmation before signing (default `500`)
- `NEXT_PUBLIC_BSC_TESTNET_RPC` — BSC Testnet RPC URL
- `NEXT_PUBLIC_MOCKPHP_ADDRESS` — Deployed `MockPHP` address
- `NEXT_PUBLIC_ORGVAULT_ADDRESS` — Deployed `OrgVault` address
- `ATTESTOR_PRIVATE_KEY` — Server-only testnet private key for EIP-712 signing
- `RELAYER_PRIVATE_KEY` — Server-only testnet private key for relaying `executeExpense`

## AI Usage Disclosure

- **Google Gemini API (`@google/genai`, `gemini-3.8-flash`)**: Used inside the server-side `/api/agent/submit` route for multimodal receipt extraction (image/text) and bounded tool calling (`check_budget`, `list_vendors`, `list_officers`, `propose_expense`). The AI model never sees private keys or signs transactions.
- **Coding Assistant (Antigravity)**: Used during hackathon development to scaffold Hardhat contracts/tests, Next.js App Router pages, viem/zod integration, and documentation, with all contract logic verified via Hardhat tests and build checks.
