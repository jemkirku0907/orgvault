import { NextResponse } from "next/server";
import { formatEther, parseAbiItem } from "viem";
import { CATEGORIES, categoryId, EXPLORER_BASE } from "@/lib/contracts";
import { getPublicClient, resolveDeploymentAddresses } from "@/lib/chain/vault";

export const dynamic = "force-dynamic";

export interface LedgerEntry {
  id: string;
  type: "dues" | "expense";
  kind?: 0 | 1;
  actor: string;
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
  if (!orgVaultAddress) {
    return NextResponse.json({
      chainMode: "simulated",
      entries: [] as LedgerEntry[],
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

    const entries: LedgerEntry[] = [
      ...duesLogs.map((log, i) => ({
        id: `dues-${log.transactionHash}-${i}`,
        type: "dues" as const,
        actor: log.args.member ?? "",
        amountPesos: Number(formatEther(log.args.amount ?? 0n)),
        txHash: log.transactionHash,
        explorerUrl: `${EXPLORER_BASE}/tx/${log.transactionHash}`,
        blockNumber: Number(log.blockNumber),
      })),
      ...expenseLogs.map((log, i) => {
        const catHex = (log.args.category ?? "").toLowerCase();
        return {
          id: `exp-${log.transactionHash}-${i}`,
          type: "expense" as const,
          kind: (Number(log.args.kind ?? 0) === 1 ? 1 : 0) as 0 | 1,
          actor: log.args.recipient ?? "",
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
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to fetch ledger events",
      },
      { status: 500 }
    );
  }
}
