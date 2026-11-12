# OrgVault

**AI-Checked, On-Chain Funds for Student Orgs** *(BCC Hackathon 2026 — Build4Campus)*

> For student org treasurers who track dues in spreadsheets and group chats, OrgVault uses AI to read receipts and BNB Smart Chain (BSC Testnet) to enforce budgets and release payouts.

## Core Flow
1. Members pay dues into the `OrgVault` smart contract on BSC Testnet (Chain ID `97`).
2. An officer submits a receipt photo, marking it as a vendor payment or an out-of-pocket reimbursement.
3. The AI agent extracts vendor, amount, and category, checks the budget, and prepares/checks the submission.
4. `OrgVault` verifies all rules on-chain (category budget, approved vendor / registered officer, per-officer reimbursement cap, duplicate-receipt hash) and either releases the payout or blocks it.
5. Every transaction appears on the public ledger.

## AI Tools Disclosure
- **Coding assistance & planning:** Antigravity / Claude Code (with `engr`)
- **Runtime receipt processing:** *(Configured during build window via local `.env`)*
