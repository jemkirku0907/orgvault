"use client";

import { useEffect, useState } from "react";
import {
  createWalletClient,
  custom,
  parseEther,
  type Address,
} from "viem";
import AppShell from "@/components/AppShell";
import JargonTooltip from "@/components/JargonTooltip";
import {
  CATEGORIES,
  categoryId,
  CHAIN_ID,
  EXPLORER_BASE,
  MOCK_PHP_ABI,
  ORG_VAULT_ABI,
  orgVaultChain,
} from "@/lib/contracts";
import type { VaultSummary } from "@/lib/chain/vault";
import type { ReimbursementClaim } from "@/lib/reimbursements/store";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export default function AdminControlsPage() {
  const [summary, setSummary] = useState<VaultSummary | null>(null);
  const [claims, setClaims] = useState<ReimbursementClaim[]>([]);
  const [account, setAccount] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txLink, setTxLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Form states
  const [mintAmount, setMintAmount] = useState("1000");
  const [duesAmount, setDuesAmount] = useState("500");
  const [budgetCategory, setBudgetCategory] = useState<string>("Food");
  const [budgetLimit, setBudgetLimit] = useState("1000");
  const [vendorAddr, setVendorAddr] = useState("");
  const [vendorLabel, setVendorLabel] = useState("");
  const [vendorApproved, setVendorApproved] = useState(true);
  const [officerAddr, setOfficerAddr] = useState("");
  const [officerLabel, setOfficerLabel] = useState("");
  const [officerCap, setOfficerCap] = useState("1500");
  const [newAttestor, setNewAttestor] = useState("");

  const loadSummary = async () => {
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
    }
  };

  const updateClaim = async (
    id: string,
    status: ReimbursementClaim["status"],
    txHash?: string
  ) => {
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/reimbursements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status,
          txHash,
          explorerUrl: txHash ? `${EXPLORER_BASE}/tx/${txHash}` : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to update claim");
      } else {
        setStatusMsg(`Claim ${id} marked as ${status}.`);
        if (txHash) setTxLink(`${EXPLORER_BASE}/tx/${txHash}`);
        await loadSummary();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update claim");
    } finally {
      setBusy(false);
    }
  };

  const fulfillClaimOnBsc = async (claim: ReimbursementClaim) => {
    if (!window.ethereum || !account) {
      setErrorMsg("Connect your BSC Testnet wallet first to send MockPHP.");
      return;
    }
    if (chainId !== CHAIN_ID) {
      setErrorMsg("Switch your wallet to BSC Testnet (Chain ID 97) first.");
      return;
    }
    if (!mockPhpAddr) {
      setErrorMsg("MockPHP contract address is not configured.");
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    setStatusMsg(`Sending ₱${claim.amount} MockPHP on BSC Testnet...`);
    try {
      const walletClient = createWalletClient({
        account,
        chain: orgVaultChain,
        transport: custom(window.ethereum),
      });
      const hash = await walletClient.writeContract({
        address: mockPhpAddr,
        abi: MOCK_PHP_ABI,
        functionName: "transfer",
        args: [
          claim.payoutAccountLabel as Address,
          parseEther(String(claim.amount)),
        ],
      });
      await updateClaim(claim.id, "Paid", hash);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "BSC payout failed");
      setStatusMsg(null);
      setBusy(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const connectWallet = async () => {
    setErrorMsg(null);
    if (!window.ethereum) {
      setErrorMsg("No browser wallet detected. Install MetaMask to use Admin controls.");
      return;
    }
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as Address[];
      const hexChain = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string;
      setAccount(accounts[0] ?? null);
      setChainId(parseInt(hexChain, 16));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Wallet connection failed");
    }
  };

  const switchToBscTestnet = async () => {
    if (!window.ethereum) return;
    setErrorMsg(null);
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x61" }],
      });
      setChainId(CHAIN_ID);
    } catch (err) {
      const code = (err as { code?: number })?.code;
      if (code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x61",
              chainName: "BNB Smart Chain Testnet",
              nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
              rpcUrls: [orgVaultChain.rpcUrls.default.http[0]],
              blockExplorerUrls: [EXPLORER_BASE],
            },
          ],
        });
        setChainId(CHAIN_ID);
      } else {
        setErrorMsg(err instanceof Error ? err.message : "Network switch failed");
      }
    }
  };

  const runWrite = async (
    label: string,
    fn: (walletClient: ReturnType<typeof createWalletClient>) => Promise<`0x${string}`>
  ) => {
    if (!window.ethereum || !account) {
      setErrorMsg("Connect your wallet first.");
      return;
    }
    if (chainId !== CHAIN_ID) {
      setErrorMsg("Wrong network. Please switch to BSC Testnet (Chain ID 97).");
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    setStatusMsg(`Submitting ${label}...`);
    setTxLink(null);
    try {
      const walletClient = createWalletClient({
        account,
        chain: orgVaultChain,
        transport: custom(window.ethereum),
      });
      const hash = await fn(walletClient);
      setStatusMsg(`${label} submitted!`);
      setTxLink(`${EXPLORER_BASE}/tx/${hash}`);
      await loadSummary();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : `${label} failed`);
      setStatusMsg(null);
    } finally {
      setBusy(false);
    }
  };

  const mockPhpAddr = summary?.mockPhpAddress;
  const orgVaultAddr = summary?.orgVaultAddress;
  const wrongNetwork = account !== null && chainId !== CHAIN_ID;

  return (
    <AppShell summary={summary}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Admin &amp; Member Controls</h2>
            <p className="text-xs text-[#64748B]">
              Mint MockPHP, pay member dues, or manage owner rules on BSC Testnet.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {account ? (
              <span className="px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] font-mono text-xs">
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
            ) : (
              <button
                type="button"
                onClick={connectWallet}
                className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>

        {wrongNetwork && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-amber-900 font-medium">
              Your wallet is on Chain ID {chainId}. Switch to BSC Testnet (Chain ID 97) to send transactions.
            </div>
            <button
              type="button"
              onClick={switchToBscTestnet}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0"
            >
              Switch to BSC Testnet
            </button>
          </div>
        )}

        {!orgVaultAddr && (
          <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] text-xs text-[#64748B]">
            Contracts are not deployed to BSC Testnet yet. Deploy in Milestone 2 to enable live wallet transactions here.
          </div>
        )}

        {statusMsg && (
          <div className="p-3 rounded-xl bg-[#ECFDF5] border border-emerald-200 text-xs text-[#065F46] flex items-center justify-between">
            <span>{statusMsg}</span>
            {txLink && (
              <a
                href={txLink}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
              >
                View on BscScan ↗
              </a>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#FEF2F2] border border-red-200 text-xs text-[#991B1B]">
            {errorMsg}
          </div>
        )}

        {/* Reimbursement Approval & Payout Queue */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                Reimbursement Approval Queue
              </h3>
              <p className="text-xs text-[#64748B]">
                Review{" "}
                <span className="font-medium text-[#0F172A]">Itemized Receipt</span>
                <JargonTooltip term="Itemized Receipt" /> claims and fulfill via{" "}
                <span className="font-medium text-[#0F172A]">QR Code Transfer</span>
                <JargonTooltip term="QR Code Transfer" /> or{" "}
                <span className="font-medium text-[#0F172A]">BSC</span>
                <JargonTooltip term="BSC" />.
              </p>
            </div>
            <span className="text-xs font-medium text-[#64748B]">
              {claims.length} total claims
            </span>
          </div>

          <div className="space-y-3">
            {claims.map((claim) => (
              <div
                key={claim.id}
                className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/60 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-[#0F172A]">
                      {claim.id}
                    </span>
                    <span className="text-xs font-semibold text-[#0F172A]">
                      {claim.memberName}
                    </span>
                    <span className="text-xs font-bold tabular-nums text-[#2563EB]">
                      ₱{claim.amount.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-[#64748B]">
                      · Cost Center
                      <JargonTooltip term="Cost Center" />: {claim.category} (
                      {claim.expenseType})
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B]">
                    {claim.notes || claim.receiptName} · {claim.date} ·{" "}
                    <span className="font-mono text-[11px]">
                      {claim.payoutAccountLabel}
                    </span>
                  </p>
                  {claim.qrImageDataUrl && (
                    <img
                      src={claim.qrImageDataUrl}
                      alt="Member payout QR"
                      className="mt-1.5 w-20 h-20 rounded-lg border border-[#E2E8F0] object-cover bg-white"
                    />
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <span className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white text-[11px] font-semibold">
                    {claim.status}
                  </span>

                  {claim.status === "Pending" && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => updateClaim(claim.id, "Approved")}
                        className="px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => updateClaim(claim.id, "Rejected")}
                        className="px-3 py-1.5 rounded-xl border border-red-200 bg-[#FEF2F2] hover:bg-red-100 text-[#991B1B] text-xs font-semibold"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {claim.status === "Approved" && (
                    <>
                      {claim.payoutMethod === "bsc_wallet" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => fulfillClaimOnBsc(claim)}
                          className="px-3 py-1.5 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white text-xs font-semibold"
                        >
                          Pay via BSC Wallet
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => updateClaim(claim.id, "Paid")}
                        className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#0F172A] text-xs font-semibold"
                      >
                        {claim.payoutMethod === "qr_transfer"
                          ? "Mark Paid (QR Sent)"
                          : "Mark Paid"}
                      </button>
                    </>
                  )}

                  {claim.status === "Paid" && claim.txHash && (
                    <a
                      href={
                        claim.explorerUrl || `${EXPLORER_BASE}/tx/${claim.txHash}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-[#2563EB] hover:underline"
                    >
                      BscScan ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Mint & Pay Dues */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4">
            <h3 className="text-sm font-bold">
              Member Dues (MockPHP
              <JargonTooltip term="MockPHP" />)
            </h3>
            <div className="flex gap-2">
              <input
                type="number"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs tabular-nums"
                placeholder="Pesos to mint"
              />
              <button
                type="button"
                disabled={busy || !mockPhpAddr}
                onClick={() =>
                  runWrite("Mint MockPHP", (wc) =>
                    wc.writeContract({
                      address: mockPhpAddr!,
                      abi: MOCK_PHP_ABI,
                      functionName: "mint",
                      args: [account!, parseEther(mintAmount || "0")],
                      chain: orgVaultChain,
                      account: account!,
                    })
                  )
                }
                className="px-3.5 py-2 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 border border-[#E2E8F0] text-xs font-semibold disabled:opacity-50"
              >
                Mint mPHP
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                value={duesAmount}
                onChange={(e) => setDuesAmount(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs tabular-nums"
                placeholder="Dues amount in ₱"
              />
              <button
                type="button"
                disabled={busy || !mockPhpAddr || !orgVaultAddr}
                onClick={() =>
                  runWrite("Approve MockPHP", (wc) =>
                    wc.writeContract({
                      address: mockPhpAddr!,
                      abi: MOCK_PHP_ABI,
                      functionName: "approve",
                      args: [orgVaultAddr!, parseEther(duesAmount || "0")],
                      chain: orgVaultChain,
                      account: account!,
                    })
                  )
                }
                className="px-3 py-2 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 border border-[#E2E8F0] text-xs font-semibold disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={busy || !orgVaultAddr}
                onClick={() =>
                  runWrite("Pay Dues", (wc) =>
                    wc.writeContract({
                      address: orgVaultAddr!,
                      abi: ORG_VAULT_ABI,
                      functionName: "payDues",
                      args: [parseEther(duesAmount || "0")],
                      chain: orgVaultChain,
                      account: account!,
                    })
                  )
                }
                className="px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold disabled:opacity-50"
              >
                Pay Dues
              </button>
            </div>
          </div>

          {/* Set Budget */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4">
            <h3 className="text-sm font-bold">Set Category Budget (Owner)</h3>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={budgetCategory}
                onChange={(e) => setBudgetCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs tabular-nums"
                placeholder="Limit in ₱"
              />
            </div>
            <button
              type="button"
              disabled={busy || !orgVaultAddr}
              onClick={() =>
                runWrite("Set Budget", (wc) =>
                  wc.writeContract({
                    address: orgVaultAddr!,
                    abi: ORG_VAULT_ABI,
                    functionName: "setBudget",
                    args: [
                      categoryId(budgetCategory),
                      parseEther(budgetLimit || "0"),
                    ],
                    chain: orgVaultChain,
                    account: account!,
                  })
                )
              }
              className="w-full py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold disabled:opacity-50"
            >
              Update Budget Limit
            </button>
          </div>

          {/* Manage Vendors */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3">
            <h3 className="text-sm font-bold">Manage Vendors (Owner)</h3>
            <input
              type="text"
              value={vendorAddr}
              onChange={(e) => setVendorAddr(e.target.value)}
              placeholder="Vendor address (0x...)"
              className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] font-mono text-xs"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={vendorLabel}
                onChange={(e) => setVendorLabel(e.target.value)}
                placeholder="Label (e.g., Canteen)"
                className="flex-1 px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs"
              />
              <select
                value={vendorApproved ? "true" : "false"}
                onChange={(e) => setVendorApproved(e.target.value === "true")}
                className="px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs bg-white"
              >
                <option value="true">Approve</option>
                <option value="false">Revoke</option>
              </select>
            </div>
            <button
              type="button"
              disabled={busy || !orgVaultAddr}
              onClick={() =>
                runWrite("Set Vendor", (wc) =>
                  wc.writeContract({
                    address: orgVaultAddr!,
                    abi: ORG_VAULT_ABI,
                    functionName: "setVendor",
                    args: [
                      vendorAddr as Address,
                      vendorLabel,
                      vendorApproved,
                    ],
                    chain: orgVaultChain,
                    account: account!,
                  })
                )
              }
              className="w-full py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold disabled:opacity-50"
            >
              Save Vendor
            </button>
          </div>

          {/* Manage Officers (Tier 2) & Security */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3">
            <h3 className="text-sm font-bold">
              Manage Officers &amp; Security (Owner)
            </h3>
            <input
              type="text"
              value={officerAddr}
              onChange={(e) => setOfficerAddr(e.target.value)}
              placeholder="Officer address (0x...)"
              className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] font-mono text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={officerLabel}
                onChange={(e) => setOfficerLabel(e.target.value)}
                placeholder="Label (TreasurerAlex)"
                className="px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs"
              />
              <input
                type="number"
                value={officerCap}
                onChange={(e) => setOfficerCap(e.target.value)}
                placeholder="Cap in ₱"
                className="px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs tabular-nums"
              />
            </div>
            <button
              type="button"
              disabled={busy || !orgVaultAddr}
              onClick={() =>
                runWrite("Set Officer", (wc) =>
                  wc.writeContract({
                    address: orgVaultAddr!,
                    abi: ORG_VAULT_ABI,
                    functionName: "setOfficer",
                    args: [
                      officerAddr as Address,
                      officerLabel,
                      parseEther(officerCap || "0"),
                    ],
                    chain: orgVaultChain,
                    account: account!,
                  })
                )
              }
              className="w-full py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold disabled:opacity-50"
            >
              Save Officer Cap
            </button>

            <div className="pt-2 border-t border-[#E2E8F0] flex gap-2">
              <input
                type="text"
                value={newAttestor}
                onChange={(e) => setNewAttestor(e.target.value)}
                placeholder="Attestor address (0x...)"
                className="flex-1 px-3 py-2 rounded-xl border border-[#E2E8F0] font-mono text-xs"
              />
              <button
                type="button"
                disabled={busy || !orgVaultAddr}
                onClick={() =>
                  runWrite("Set Attestor", (wc) =>
                    wc.writeContract({
                      address: orgVaultAddr!,
                      abi: ORG_VAULT_ABI,
                      functionName: "setAttestor",
                      args: [newAttestor as Address],
                      chain: orgVaultChain,
                      account: account!,
                    })
                  )
                }
                className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold disabled:opacity-50"
              >
                Set Attestor
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy || !orgVaultAddr}
                onClick={() =>
                  runWrite("Pause Vault", (wc) =>
                    wc.writeContract({
                      address: orgVaultAddr!,
                      abi: ORG_VAULT_ABI,
                      functionName: "pause",
                      args: [],
                      chain: orgVaultChain,
                      account: account!,
                    })
                  )
                }
                className="flex-1 py-2 rounded-xl bg-[#FEF2F2] text-[#991B1B] border border-red-200 text-xs font-semibold disabled:opacity-50"
              >
                Pause Vault
              </button>
              <button
                type="button"
                disabled={busy || !orgVaultAddr}
                onClick={() =>
                  runWrite("Unpause Vault", (wc) =>
                    wc.writeContract({
                      address: orgVaultAddr!,
                      abi: ORG_VAULT_ABI,
                      functionName: "unpause",
                      args: [],
                      chain: orgVaultChain,
                      account: account!,
                    })
                  )
                }
                className="flex-1 py-2 rounded-xl bg-[#ECFDF5] text-[#065F46] border border-emerald-200 text-xs font-semibold disabled:opacity-50"
              >
                Unpause Vault
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
