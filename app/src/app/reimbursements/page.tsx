"use client";

import { useEffect, useState } from "react";
import { keccak256 } from "viem";
import AppShell, { useLocalProfile } from "@/components/AppShell";
import JargonTooltip from "@/components/JargonTooltip";
import { CATEGORIES, EXPLORER_BASE } from "@/lib/contracts";
import type { VaultSummary } from "@/lib/chain/vault";
import type {
  ExpenseType,
  PayoutMethod,
  ReimbursementClaim,
} from "@/lib/reimbursements/store";

const METHOD_META: Record<
  PayoutMethod,
  { label: string; tooltipTerm: string; placeholder: string; hint: string }
> = {
  direct_deposit: {
    label: "Direct Deposit",
    tooltipTerm: "Direct Deposit",
    placeholder: "e.g., BPI · 1234-5678-90 (Juan Dela Cruz)",
    hint: "Bank name and account number",
  },
  digital_wallet: {
    label: "Digital Wallet",
    tooltipTerm: "Digital Wallet",
    placeholder: "e.g., GCash · 0917-555-0192",
    hint: "GCash or Maya mobile number",
  },
  qr_transfer: {
    label: "QR Code Transfer",
    tooltipTerm: "QR Code Transfer",
    placeholder: "e.g., Maya QR · Juan D.",
    hint: "Upload your payment QR image below",
  },
  bsc_wallet: {
    label: "BSC (BNB Smart Chain)",
    tooltipTerm: "BSC",
    placeholder: "0x...",
    hint: "BSC Testnet wallet address to receive MockPHP",
  },
};

const STATUS_BADGE: Record<ReimbursementClaim["status"], string> = {
  Pending: "bg-amber-50 text-amber-800 border-amber-200",
  Approved: "bg-brand-light text-brand border-blue-200",
  Rejected: "bg-[#FEF2F2] text-[#991B1B] border-red-200",
  Paid: "bg-[#ECFDF5] text-[#065F46] border-emerald-200",
};

export default function ReimbursementsPage() {
  const { profile } = useLocalProfile();
  const [summary, setSummary] = useState<VaultSummary | null>(null);
  const [claims, setClaims] = useState<ReimbursementClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [memberName, setMemberName] = useState("");
  const [amount, setAmount] = useState("350");
  const [category, setCategory] = useState<"Food" | "Printing" | "Events">("Food");
  const [expenseType, setExpenseType] = useState<ExpenseType>("Standard");
  const [date, setDate] = useState("2026-11-13");
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptHash, setReceiptHash] = useState<string>("");
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>("bsc_wallet");
  const [payoutAccountLabel, setPayoutAccountLabel] = useState("");
  const [qrImageDataUrl, setQrImageDataUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    setMemberName(profile.nickname || "TreasurerAlex");
  }, [profile.nickname]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sumRes, clmRes] = await Promise.all([
        fetch("/api/vault/summary"),
        fetch("/api/reimbursements"),
      ]);
      if (sumRes.ok) setSummary(await sumRes.json());
      if (clmRes.ok) {
        const data = await clmRes.json();
        setClaims(data.claims ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleReceiptChange = async (file: File | null) => {
    setReceiptFile(file);
    if (!file) {
      setReceiptHash("");
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    setReceiptHash(keccak256(bytes));
  };

  const handleQrUpload = (file: File | null) => {
    if (!file) {
      setQrImageDataUrl(undefined);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setQrImageDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const fillConnectedWallet = async () => {
    const eth = (
      window as unknown as {
        ethereum?: { request: (a: { method: string }) => Promise<unknown> };
      }
    ).ethereum;
    if (!eth) {
      setError("No browser wallet detected. Install MetaMask or paste a 0x address.");
      return;
    }
    try {
      const accounts = (await eth.request({
        method: "eth_requestAccounts",
      })) as string[];
      if (accounts[0]) {
        setPayoutAccountLabel(accounts[0]);
        setError(null);
      }
    } catch {
      setError("Could not read wallet address.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid reimbursement amount greater than ₱0.");
      return;
    }
    if (!payoutAccountLabel.trim()) {
      setError(`Enter your ${METHOD_META[payoutMethod].hint.toLowerCase()}.`);
      return;
    }
    if (
      payoutMethod === "bsc_wallet" &&
      !/^0x[a-fA-F0-9]{40}$/.test(payoutAccountLabel.trim())
    ) {
      setError("Enter a valid 0x BSC wallet address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reimbursements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberName: memberName.trim() || "Org Member",
          amount: parsedAmount,
          category,
          expenseType,
          date,
          notes: notes.trim(),
          receiptName: receiptFile ? receiptFile.name : "manual-receipt.txt",
          receiptHash: receiptHash || undefined,
          payoutMethod,
          payoutAccountLabel: payoutAccountLabel.trim(),
          qrImageDataUrl:
            payoutMethod === "qr_transfer" ? qrImageDataUrl : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not submit claim.");
        return;
      }
      setSuccessMsg(`Claim ${data.claim.id} submitted and queued for admin approval.`);
      setNotes("");
      setReceiptFile(null);
      setReceiptHash("");
      setQrImageDataUrl(undefined);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell summary={summary}>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Claim Submission Form */}
        <form
          onSubmit={handleSubmit}
          className="xl:col-span-6 bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 space-y-5"
        >
          <div className="pb-4 border-b border-[#E2E8F0]">
            <h2 className="text-lg font-bold text-[#0F172A]">
              Reimbursement Claim
            </h2>
            <p className="text-[13px] text-[#64748B] mt-0.5">
              Submit an expense claim and choose how you want to be paid, including{" "}
              <span className="font-medium text-[#0F172A]">BSC</span>
              <JargonTooltip term="BSC" /> or{" "}
              <span className="font-medium text-[#0F172A]">QR Code Transfer</span>
              <JargonTooltip term="QR Code Transfer" />.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Member Name
              </label>
              <input
                type="text"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Amount (₱)
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-sm tabular-nums focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Cost Center
                <JargonTooltip term="Cost Center" />
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as "Food" | "Printing" | "Events")
                }
                className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-sm bg-white focus:outline-none focus:border-brand"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Claim Type
                <JargonTooltip
                  term={expenseType === "Standard" ? "Per Diem" : expenseType}
                />
              </label>
              <select
                value={expenseType}
                onChange={(e) => setExpenseType(e.target.value as ExpenseType)}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-sm bg-white focus:outline-none focus:border-brand"
              >
                <option value="Standard">Standard</option>
                <option value="Per Diem">Per Diem</option>
                <option value="Prorated">Prorated</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Expense Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          {/* Itemized Receipt Upload */}
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Itemized Receipt
              <JargonTooltip term="Itemized Receipt" />
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-3 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC]">
              <input
                type="file"
                accept="image/*,.pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) =>
                  void handleReceiptChange(e.target.files?.[0] ?? null)
                }
                className="text-xs text-[#64748B] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-[#E2E8F0] file:bg-white file:text-xs file:font-semibold file:text-[#0F172A] hover:file:bg-slate-50"
              />
            </div>
            {receiptHash && (
              <p className="mt-1.5 text-[11px] font-mono text-[#64748B] truncate">
                keccak256
                <JargonTooltip term="keccak256" />: {receiptHash}
              </p>
            )}
          </div>

          {/* Preferred Payout Method */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-[#0F172A]">
              Preferred Payout Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(Object.keys(METHOD_META) as PayoutMethod[]).map((method) => {
                const meta = METHOD_META[method];
                const active = payoutMethod === method;
                return (
                  <div
                    key={method}
                    onClick={() => setPayoutMethod(method)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setPayoutMethod(method);
                      }
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                      active
                        ? "border-2 border-brand bg-brand-light/60"
                        : "border-[#E2E8F0] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-[#0F172A]">
                        {meta.label}
                        <JargonTooltip term={meta.tooltipTerm} />
                      </span>
                    </div>
                    <div className="text-[11px] text-[#64748B] mt-0.5">
                      {meta.hint}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-1 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#64748B]">
                  {METHOD_META[payoutMethod].hint}
                </label>
                {payoutMethod === "bsc_wallet" && (
                  <button
                    type="button"
                    onClick={fillConnectedWallet}
                    className="text-[11px] font-semibold text-brand hover:underline"
                  >
                    Use Connected Wallet
                  </button>
                )}
              </div>
              <input
                type="text"
                value={payoutAccountLabel}
                onChange={(e) => setPayoutAccountLabel(e.target.value)}
                placeholder={METHOD_META[payoutMethod].placeholder}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-mono focus:outline-none focus:border-brand"
              />

              {payoutMethod === "qr_transfer" && (
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                  <label className="block text-[11px] font-medium text-[#64748B]">
                    Upload Payment QR Image (optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleQrUpload(e.target.files?.[0] ?? null)
                    }
                    className="text-xs text-[#64748B]"
                  />
                  {qrImageDataUrl && (
                    <img
                      src={qrImageDataUrl}
                      alt="Uploaded payment QR"
                      className="w-24 h-24 rounded-lg border border-[#E2E8F0] object-cover bg-white"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Short description of what was purchased"
              className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-brand"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-[#FEF2F2] border border-red-200 text-xs text-[#991B1B]">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-xl bg-[#ECFDF5] border border-emerald-200 text-xs text-[#065F46]">
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl bg-brand hover:opacity-90 disabled:bg-blue-400 text-white text-sm font-semibold transition-colors"
          >
            {submitting ? "Submitting Claim..." : "Submit Reimbursement Claim"}
          </button>
        </form>

        {/* Right: Claim Status Tracker */}
        <div className="xl:col-span-6 bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">
                Claim Status Tracker
              </h3>
              <p className="text-[13px] text-[#64748B]">
                Live approval &amp; payout status across bank, QR, and BSC Testnet.
              </p>
            </div>
            <button
              type="button"
              onClick={loadAll}
              className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold hover:bg-[#F8FAFC]"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-[#64748B] py-4">Loading claims...</p>
          ) : claims.length === 0 ? (
            <p className="text-xs text-[#64748B] py-4">
              No reimbursement claims submitted yet.
            </p>
          ) : (
            <div className="space-y-3">
              {claims.map((claim) => (
                <div
                  key={claim.id}
                  className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/60 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-semibold text-[#0F172A]">
                          {claim.id}
                        </span>
                        <span className="text-xs font-semibold text-[#0F172A]">
                          {claim.memberName}
                        </span>
                        <span className="text-[11px] text-[#64748B]">
                          · {claim.category} ({claim.expenseType})
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        {claim.notes || claim.receiptName} · {claim.date}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold tabular-nums text-[#0F172A]">
                        ₱{claim.amount.toFixed(2)}
                      </div>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${STATUS_BADGE[claim.status]}`}
                      >
                        {claim.status}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748B]">
                    <span className="truncate">
                      Payout:{" "}
                      <strong className="text-[#0F172A]">
                        {METHOD_META[claim.payoutMethod].label}
                      </strong>{" "}
                      ({claim.payoutAccountLabel})
                    </span>
                    {claim.txHash && (
                      <a
                        href={
                          claim.explorerUrl ||
                          `${EXPLORER_BASE}/tx/${claim.txHash}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-brand hover:underline shrink-0"
                      >
                        BscScan Tx ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
