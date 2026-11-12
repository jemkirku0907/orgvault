# AGENTS.md — OrgVault

## Purpose
OrgVault: AI-checked, on-chain funds for student organizations on BNB Smart Chain (BSC Testnet, Chain ID 97).

## Core Rules
- **Testnet only:** Deploy and test strictly on BSC Testnet (Chain ID `97`) using `tBNB`. Never use real funds or mainnet keys.
- **Keep secrets out of reach:** Never read, print, or commit `.env`, `.env.*`, private keys, seed phrases, or real API keys.
- **Privacy off-chain:** Keep receipt photos, student names, and sensitive descriptions off-chain (including contract storage and events). Store only `bytes32 receiptHash`, category IDs, amounts, and wallet addresses on-chain.
- **Contract is the law:** Per-category budgets, vendor allowlists, registered officer reimbursement caps, and duplicate-receipt blocking (`receiptHash`) must be enforced inside the smart contract, never only in the prompt or UI.
- **Explicit wallet signing:** AI must not independently hold private keys or authorize transactions without explicit human approval/boundaries.
- **Workflow:** Plan before editing, implement one small testable change at a time, run tests/checks, and report any unverified gaps honestly.
