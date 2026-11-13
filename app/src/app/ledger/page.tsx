"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import type { VaultSummary } from "@/lib/chain/vault";
import type { LedgerEntry } from "@/app/api/vault/ledger/route";

function formatPeso(n: number) {
  return `₱${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function PublicLedgerPage() {
  const [summary, setSummary] = useState<VaultSummary | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, ledRes] = await Promise.all([
        fetch("/api/vault/summary"),
        fetch("/api/vault/ledger"),
      ]);
      if (sumRes.ok) setSummary(await sumRes.json());
      if (ledRes.ok) {
        const led = await ledRes.json();
        setEntries(led.entries || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalSpent =
    summary?.budgets.reduce((acc, b) => acc + b.spent, 0) ?? 0;
  const available = summary?.vaultBalance ?? 0;
  const totalDues = available + totalSpent;

  return (
    <AppShell summary={summary}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Public Ledger</h2>
            <p className="text-xs text-[#64748B]">
              Transparent dues in and spending out in pesos. No wallet needed.
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#E2E8F0] text-xs font-semibold"
          >
            Refresh
          </button>
        </div>

        {/* Totals Summary (Tier 2) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
            <div className="text-xs text-[#64748B]">Available Balance</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">
              {formatPeso(available)}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
            <div className="text-xs text-[#64748B]">Total Dues In</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-[#10B981]">
              {formatPeso(totalDues)}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
            <div className="text-xs text-[#64748B]">Total Spent Out</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">
              {formatPeso(totalSpent)}
            </div>
          </div>
        </div>

        {/* Budget Progress Bars (Tier 2) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(summary?.budgets ?? []).map((b) => {
            const pct =
              b.limit > 0
                ? Math.min(100, Math.round((b.spent / b.limit) * 100))
                : 0;
            const barColor =
              pct >= 90
                ? "bg-[#EF4444]"
                : pct >= 75
                ? "bg-[#F59E0B]"
                : "bg-[#2563EB]";
            return (
              <div
                key={b.category}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{b.category}</span>
                  <span className="text-xs font-medium text-[#64748B] tabular-nums">
                    {pct}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-[#64748B] tabular-nums">
                  <span>
                    Spent {formatPeso(b.spent)} / {formatPeso(b.limit)}
                  </span>
                  <span className="font-semibold text-[#2563EB]">
                    {formatPeso(b.remaining)} left
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Event Table */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h3 className="text-sm font-bold">On-Chain Events</h3>
            <span className="text-xs text-[#64748B]">
              {entries.length} event{entries.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Category / Memo</th>
                  <th className="py-3 px-4">Recipient / Member</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Receipt Hash</th>
                  <th className="py-3 px-4 text-right">Transaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-[#64748B]"
                    >
                      Loading ledger events...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-[#64748B]"
                    >
                      {summary?.chainMode === "simulated"
                        ? "Running in Simulated Chain Mode — deploy to BSC Testnet to stream live DuesPaid & ExpensePaid events."
                        : "No events found in recent blocks yet."}
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4 whitespace-nowrap">
                        {entry.type === "dues" ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] font-semibold">
                            Dues In
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#10B981] font-semibold">
                            {entry.kind === 1
                              ? "Reimbursement"
                              : "Vendor Paid"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#0F172A]">
                          {entry.category || "Member Dues"}
                        </div>
                        {entry.memo && (
                          <div className="text-[#64748B]">{entry.memo}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#475569]">
                        {entry.actor.slice(0, 6)}...{entry.actor.slice(-4)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums">
                        {entry.type === "dues" ? "+" : "-"}
                        {formatPeso(entry.amountPesos)}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#64748B]">
                        {entry.receiptHash
                          ? `${entry.receiptHash.slice(0, 10)}...`
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {entry.explorerUrl ? (
                          <a
                            href={entry.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#2563EB] font-semibold hover:underline"
                          >
                            View Transaction ↗
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
