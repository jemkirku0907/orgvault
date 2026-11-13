"use client";

import Link from "next/link";
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
  const [ledgerError, setLedgerError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setLedgerError(null);
    try {
      const [sumRes, ledRes] = await Promise.all([
        fetch("/api/vault/summary"),
        fetch("/api/vault/ledger"),
      ]);
      if (sumRes.ok) {
        setSummary(await sumRes.json());
      } else {
        setLedgerError("Unavailable");
      }
      if (ledRes.ok) {
        const led = await ledRes.json();
        setEntries(led.entries || []);
      } else {
        setLedgerError("Unavailable");
      }
    } catch {
      setLedgerError("Unavailable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalDues = entries
    .filter((e) => e.type === "dues")
    .reduce((acc, e) => acc + e.amountPesos, 0);
  const totalSpent = entries
    .filter((e) => e.type === "expense")
    .reduce((acc, e) => acc + e.amountPesos, 0);
  const available = summary?.vaultBalance ?? 0;

  return (
    <AppShell summary={summary}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Public Ledger</h2>
            <p className="text-xs text-[#64748B]">
              Transparent dues in and spending out in pesos from BSC Testnet logs. Zero personal info on-chain.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/pay-dues"
              className="px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold"
            >
              + Pay Dues
            </Link>
            <button
              type="button"
              onClick={loadData}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#E2E8F0] text-xs font-semibold"
            >
              Refresh
            </button>
          </div>
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
                : "bg-brand";
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
                  <span className="font-semibold text-brand">
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
            <h3 className="text-sm font-bold">On-Chain &amp; Dues Ledger Events</h3>
            <span className="text-xs text-[#64748B]">
              {entries.length} event{entries.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Display Name / Member</th>
                  <th className="py-3 px-4">Category / Memo</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Tx Hash (BscScan)</th>
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
                ) : ledgerError ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-[#EF4444] font-semibold"
                    >
                      {ledgerError}
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-[#64748B]"
                    >
                      No transactions yet
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4 whitespace-nowrap">
                        {entry.type === "dues" ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] font-semibold">
                            &#10003; Dues
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#10B981] font-semibold">
                            {entry.kind === 1
                              ? "Reimbursement"
                              : "Vendor Paid"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#0F172A]">
                          {entry.displayName || "Verified Recipient"}
                        </div>
                        <div className="font-mono text-[11px] text-[#64748B]">
                          {entry.actor.slice(0, 6)}...{entry.actor.slice(-4)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#0F172A]">
                          {entry.category || "Member Dues"}
                        </div>
                        {entry.memo && (
                          <div className="text-[#64748B]">{entry.memo}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-[#475569] tabular-nums">
                        {entry.date || "2026-11-13"}
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums">
                        <span
                          className={
                            entry.type === "dues"
                              ? "text-[#10B981]"
                              : "text-[#0F172A]"
                          }
                        >
                          {entry.type === "dues" ? "+" : "-"}
                          {formatPeso(entry.amountPesos)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {entry.explorerUrl ? (
                          <a
                            href={entry.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[#2563EB] font-semibold hover:underline"
                          >
                            {entry.txHash.slice(0, 8)}...{entry.txHash.slice(-6)} ↗
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
