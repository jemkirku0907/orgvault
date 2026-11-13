import { NextResponse } from "next/server";
import { formatEther, parseAbiItem } from "viem";
import { CATEGORIES, categoryId, EXPLORER_BASE } from "@/lib/contracts";
import { getPublicClient, resolveDeploymentAddresses } from "@/lib/chain/vault";
import { listDuesPayments } from "@/lib/dues/store";

export const dynamic = "force-dynamic";

export interface LedgerEntry {
  id: string;
  type: "dues" | "expense";
  kind?: 0 | 1;
  actor: string;
  displayName?: string;
  orgName?: string;
  period?: string;
  date?: string;
  amountPesos: number;
  category?: string;
  memo?: string;
  receiptHash?: string;
  txHash: string;
  explorerUrl?: string;
  blockNumber: number;
}

const categoryLookup = new Map<string, string>(
  CATEGORIES.map((c) => [categoryId(c).toLowerCase(), c])
);

export async function GET() {
  const { orgVaultAddress } = resolveDeploymentAddresses();
  const offChainDues = listDuesPayments();
  const duesByTx = new Map(
    offChainDues.map((d) => [d.txHash.toLowerCase(), d])
  );

  if (!orgVaultAddress) {
    const simEntries: LedgerEntry[] = offChainDues.map((d, idx) => ({
      id: d.id,
      type: "dues",
      actor: d.walletAddress,
      displayName: d.displayName,
      orgName: d.orgName,
      period: d.period,
      date: d.date,
      amountPesos: d.amountPesos,
      category: `Dues · ${d.period}`,
      memo: `${d.orgName} (Zero PII on-chain)`,
      txHash: d.txHash,
      explorerUrl: d.explorerUrl,
      blockNumber: 142430000 - idx,
    }));

    return NextResponse.json({
      chainMode: "simulated",
      entries: simEntries,
    });
  }

  try {
    const client = getPublicClient();
    const latestBlock = await client.getBlockNumber();
    const fromBlock = latestBlock > 20_000n ? latestBlock - 20_000n : 0n;
    const chunkSize = 2_000n;

    const duesEvent = parseAbiItem("event DuesPaid(address indexed member, uint256 amount)");
    const expenseEvent = parseAbiItem(
      "event ExpensePaid(uint8 indexed kind, address indexed recipient, uint256 amount, bytes32 indexed category, bytes32 receiptHash, string memo, uint256 spentInCategory)"
    );

    const ranges: Array<{ from: bigint; to: bigint }> = [];
    for (let start = fromBlock; start <= latestBlock; start += chunkSize) {
      const end = start + chunkSize - 1n < latestBlock ? start + chunkSize - 1n : latestBlock;
      ranges.push({ from: start, to: end });
    }

    const chunkResults = await Promise.all(
      ranges.map(({ from, to }) =>
        Promise.all([
          client.getLogs({
            address: orgVaultAddress,
            event: duesEvent,
            fromBlock: from,
            toBlock: to,
          }),
          client.getLogs({
            address: orgVaultAddress,
            event: expenseEvent,
            fromBlock: from,
            toBlock: to,
          }),
        ])
      )
    );

    const duesLogs = chunkResults.flatMap(([dues]) => dues);
    const expenseLogs = chunkResults.flatMap(([, expenses]) => expenses);

    const seenTxHashes = new Set<string>();

    const onChainDuesEntries: LedgerEntry[] = duesLogs.map((log, i) => {
      const txLower = log.transactionHash.toLowerCase();
      seenTxHashes.add(txLower);
      const matched = duesByTx.get(txLower);
      return {
        id: `dues-${log.transactionHash}-${i}`,
        type: "dues" as const,
        actor: log.args.member ?? "",
        displayName: matched?.displayName || "Org Member",
        orgName: matched?.orgName,
        period: matched?.period,
        date: matched?.date || new Date().toISOString().slice(0, 10),
        amountPesos: Number(formatEther(log.args.amount ?? 0n)),
        category: matched ? `Dues · ${matched.period}` : "Member Dues",
        memo: matched ? `${matched.orgName} (No personal info on-chain)` : "On-chain MockPHP deposit",
        txHash: log.transactionHash,
        explorerUrl: `${EXPLORER_BASE}/tx/${log.transactionHash}`,
        blockNumber: Number(log.blockNumber),
      };
    });

    // Include any off-chain / recent dues entries not yet in the 20k block window
    const extraDuesEntries: LedgerEntry[] = offChainDues
      .filter((d) => !seenTxHashes.has(d.txHash.toLowerCase()))
      .map((d, idx) => ({
        id: d.id,
        type: "dues" as const,
        actor: d.walletAddress,
        displayName: d.displayName,
        orgName: d.orgName,
        period: d.period,
        date: d.date,
        amountPesos: d.amountPesos,
        category: `Dues · ${d.period}`,
        memo: `${d.orgName} (No personal info on-chain)`,
        txHash: d.txHash,
        explorerUrl: d.explorerUrl,
        blockNumber: Number(latestBlock) + (offChainDues.length - idx),
      }));

    const entries: LedgerEntry[] = [
      ...extraDuesEntries,
      ...onChainDuesEntries,
      ...expenseLogs.map((log, i) => {
        const catHex = (log.args.category ?? "").toLowerCase();
        return {
          id: `exp-${log.transactionHash}-${i}`,
          type: "expense" as const,
          kind: (Number(log.args.kind ?? 0) === 1 ? 1 : 0) as 0 | 1,
          actor: log.args.recipient ?? "",
          date: new Date().toISOString().slice(0, 10),
          amountPesos: Number(formatEther(log.args.amount ?? 0n)),
          category: categoryLookup.get(catHex) ?? catHex.slice(0, 10),
          memo: log.args.memo ?? "",
          receiptHash: log.args.receiptHash ?? "",
          txHash: log.transactionHash,
          explorerUrl: `${EXPLORER_BASE}/tx/${log.transactionHash}`,
          blockNumber: Number(log.blockNumber),
        };
      }),
    ].sort((a, b) => b.blockNumber - a.blockNumber);

    return NextResponse.json({
      chainMode: "bscTestnet",
      entries,
    });
  } catch {
    // Graceful fallback to off-chain dues entries if RPC rate-limits
    const fallbackEntries: LedgerEntry[] = offChainDues.map((d, idx) => ({
      id: d.id,
      type: "dues",
      actor: d.walletAddress,
      displayName: d.displayName,
      orgName: d.orgName,
      period: d.period,
      date: d.date,
      amountPesos: d.amountPesos,
      category: `Dues · ${d.period}`,
      memo: `${d.orgName} (No personal info on-chain)`,
      txHash: d.txHash,
      explorerUrl: d.explorerUrl,
      blockNumber: 142430000 - idx,
    }));

    return NextResponse.json({
      chainMode: "bscTestnet",
      entries: fallbackEntries,
    });
  }
}
