"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  http,
  parseEther,
  type Address,
} from "viem";
import AppShell, { useLocalProfile } from "@/components/AppShell";
import JargonTooltip from "@/components/JargonTooltip";
import {
  CHAIN_ID,
  EXPLORER_BASE,
  MOCK_PHP_ABI,
  ORG_VAULT_ABI,
  orgVaultChain,
} from "@/lib/contracts";
import type { VaultSummary } from "@/lib/chain/vault";
import type {
  DuesPaymentRecord,
  TreasurerMemberStatus,
} from "@/lib/dues/store";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

const PRESET_ORGS = [
  {
    orgName: "Computer Science Society",
    university: "University of Makati",
  },
  {
    orgName: "Engineering Student Council",
    university: "University of the Philippines Diliman",
  },
  {
    orgName: "Junior Philippine Institute of Accountants",
    university: "Polytechnic University of the Philippines",
  },
  {
    orgName: "Association of Computing Machinery",
    university: "Ateneo De Manila University",
  },
];

const PERIOD_OPTIONS = [
  "1st Semester AY 2026-2027",
  "2nd Semester AY 2026-2027",
  "Annual Membership 2026-2027",
];

function formatPeso(n: number): string {
  return `₱${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function shortAddr(addr?: string | null): string {
  if (!addr || addr.length < 10) return addr || "—";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function PayDuesPage() {
  const { profile, saveProfile } = useLocalProfile();

  const [summary, setSummary] = useState<VaultSummary | null>(null);
  const [members, setMembers] = useState<TreasurerMemberStatus[]>([]);
  const [payments, setPayments] = useState<DuesPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Member login & organization selection
  const [displayName, setDisplayName] = useState("TreasurerAlex");
  const [orgName, setOrgName] = useState("Computer Science Society");
  const [university, setUniversity] = useState("University of Makati");
  const [role, setRole] = useState("Member");
  const [period, setPeriod] = useState(PERIOD_OPTIONS[0]);
  const [duesAmount, setDuesAmount] = useState("1.00");
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  // Wallet & on-chain state
  const [account, setAccount] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [mockPhpBalance, setMockPhpBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [stepLabel, setStepLabel] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successPayment, setSuccessPayment] = useState<DuesPaymentRecord | null>(
    null
  );

  // Treasurer roster filter & add-member state
  const [rosterFilter, setRosterFilter] = useState<"ALL" | "Paid" | "Unpaid">(
    "ALL"
  );
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Member");

  useEffect(() => {
    if (profile.nickname) setDisplayName(profile.nickname);
    if (profile.orgName) setOrgName(profile.orgName);
    if (profile.university) setUniversity(profile.university);
    if (profile.role) setRole(profile.role);
  }, [profile]);

  const loadData = useCallback(
    async (targetOrg = orgName, targetPeriod = period) => {
      setLoading(true);
      try {
        const [sumRes, duesRes] = await Promise.all([
          fetch("/api/vault/summary"),
          fetch(
            `/api/dues?orgName=${encodeURIComponent(
              targetOrg
            )}&period=${encodeURIComponent(targetPeriod)}`
          ),
        ]);
        if (sumRes.ok) {
          setSummary(await sumRes.json());
        }
        if (duesRes.ok) {
          const data = await duesRes.json();
          setMembers(data.members ?? []);
          setPayments(data.payments ?? []);
        }
      } catch {
        // ignore fetch errors
      } finally {
        setLoading(false);
      }
    },
    [orgName, period]
  );

  useEffect(() => {
    void loadData(orgName, period);
  }, [orgName, period, loadData]);

  const refreshMockPhpBalance = useCallback(
    async (walletAddr: Address, tokenAddr?: Address) => {
      const targetToken = tokenAddr || summary?.mockPhpAddress;
      if (!targetToken) return;
      try {
        const pub = createPublicClient({
          chain: orgVaultChain,
          transport: http(orgVaultChain.rpcUrls.default.http[0]),
        });
        const bal = await pub.readContract({
          address: targetToken,
          abi: MOCK_PHP_ABI,
          functionName: "balanceOf",
          args: [walletAddr],
        });
        setMockPhpBalance(Number(formatEther(bal)));
      } catch {
        // ignore read error
      }
    },
    [summary?.mockPhpAddress]
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const syncWallet = async () => {
      try {
        const accounts = (await window.ethereum!.request({
          method: "eth_accounts",
        })) as Address[];
        const hexChain = (await window.ethereum!.request({
          method: "eth_chainId",
        })) as string;
        if (accounts?.[0]) {
          setAccount(accounts[0]);
          await refreshMockPhpBalance(accounts[0]);
        }
        if (hexChain) setChainId(parseInt(hexChain, 16));
      } catch {
        // ignore
      }
    };
    void syncWallet();
  }, [refreshMockPhpBalance]);

  const switchToBscTestnet = async () => {
    if (!window.ethereum) return false;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x61" }],
      });
      setChainId(CHAIN_ID);
      return true;
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
        return true;
      }
      setErrorMsg(
        err instanceof Error ? err.message : "Could not switch to BSC Testnet"
      );
      return false;
    }
  };

  const connectWallet = async () => {
    setErrorMsg(null);
    if (typeof window === "undefined" || !window.ethereum) {
      // Demo wallet fallback when no browser extension is installed
      const demoAddr = "0x4444444444444444444444444444444444444444" as Address;
      setAccount(demoAddr);
      setChainId(CHAIN_ID);
      setMockPhpBalance(100);
      return;
    }
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as Address[];
      await switchToBscTestnet();
      if (accounts[0]) {
        setAccount(accounts[0]);
        await refreshMockPhpBalance(accounts[0]);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Wallet connection cancelled"
      );
    }
  };

  const handleMintTestMockPhp = async () => {
    if (!account) {
      await connectWallet();
      return;
    }
    setErrorMsg(null);
    const mockPhpAddr = summary?.mockPhpAddress;
    if (!window.ethereum || !mockPhpAddr) {
      setMockPhpBalance((prev) => (prev ?? 0) + 100);
      return;
    }
    setBusy(true);
    setStepLabel("Minting 100 MockPHP (₱100.00) on BSC Testnet...");
    try {
      if (chainId !== CHAIN_ID) {
        const switched = await switchToBscTestnet();
        if (!switched) return;
      }
      const walletClient = createWalletClient({
        account,
        chain: orgVaultChain,
        transport: custom(window.ethereum),
      });
      const publicClient = createPublicClient({
        chain: orgVaultChain,
        transport: http(orgVaultChain.rpcUrls.default.http[0]),
      });
      const hash = await walletClient.writeContract({
        address: mockPhpAddr,
        abi: MOCK_PHP_ABI,
        functionName: "mint",
        args: [account, parseEther("100")],
        chain: orgVaultChain,
        account,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refreshMockPhpBalance(account, mockPhpAddr);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Minting MockPHP failed");
    } finally {
      setStepLabel(null);
      setBusy(false);
    }
  };

  // Check if current member or connected wallet has already paid for this org + period
  const existingPeriodPayment = useMemo(() => {
    const normName = displayName.trim().toLowerCase();
    const normWallet = account?.toLowerCase();
    return payments.find((p) => {
      if (normName && p.displayName.trim().toLowerCase() === normName) {
        return true;
      }
      if (normWallet && p.walletAddress.trim().toLowerCase() === normWallet) {
        return true;
      }
      return false;
    });
  }, [payments, displayName, account]);

  const handleSaveMemberOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !orgName.trim()) return;
    saveProfile({
      orgName: orgName.trim(),
      university: university.trim() || "University of Makati",
      nickname: displayName.trim(),
      role,
    });
    setShowProfileEdit(false);
    setSuccessPayment(null);
    setErrorMsg(null);
  };

  const handlePayDues = async () => {
    setErrorMsg(null);
    setSuccessPayment(null);

    const parsedAmount = Number(duesAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("Please enter a valid dues amount greater than ₱0.00.");
      return;
    }

    if (!displayName.trim()) {
      setErrorMsg("Please enter your member display name first.");
      return;
    }

    if (existingPeriodPayment) {
      setErrorMsg(
        `Duplicate payment blocked: ${displayName} has already paid ${formatPeso(
          existingPeriodPayment.amountPesos
        )} for ${period} in ${orgName}.`
      );
      return;
    }

    let activeAccount = account;
    if (!activeAccount) {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const accounts = (await window.ethereum.request({
            method: "eth_requestAccounts",
          })) as Address[];
          await switchToBscTestnet();
          activeAccount = accounts[0] ?? null;
          setAccount(activeAccount);
        } catch {
          setErrorMsg("Connect your BSC Testnet wallet to pay dues.");
          return;
        }
      } else {
        activeAccount = "0x4444444444444444444444444444444444444444" as Address;
        setAccount(activeAccount);
        setChainId(CHAIN_ID);
      }
    }

    if (!activeAccount) {
      setErrorMsg("Please connect your wallet first.");
      return;
    }

    setBusy(true);
    let onChainTxHash: `0x${string}` | undefined;

    try {
      const mockPhpAddr = summary?.mockPhpAddress;
      const orgVaultAddr = summary?.orgVaultAddress;

      // Execute live BSC Testnet deposit if browser wallet is connected
      if (
        typeof window !== "undefined" &&
        window.ethereum &&
        mockPhpAddr &&
        orgVaultAddr
      ) {
        if (chainId !== CHAIN_ID) {
          const switched = await switchToBscTestnet();
          if (!switched) {
            setBusy(false);
            return;
          }
        }

        const publicClient = createPublicClient({
          chain: orgVaultChain,
          transport: http(orgVaultChain.rpcUrls.default.http[0]),
        });
        const walletClient = createWalletClient({
          account: activeAccount,
          chain: orgVaultChain,
          transport: custom(window.ethereum),
        });

        const amountWei = parseEther(String(parsedAmount));

        // 1. Check MockPHP balance; auto-mint if wallet has 0 MockPHP on testnet
        const currentBal = await publicClient.readContract({
          address: mockPhpAddr,
          abi: MOCK_PHP_ABI,
          functionName: "balanceOf",
          args: [activeAccount],
        });

        if (currentBal < amountWei) {
          setStepLabel("Minting MockPHP for your testnet wallet...");
          const mintHash = await walletClient.writeContract({
            address: mockPhpAddr,
            abi: MOCK_PHP_ABI,
            functionName: "mint",
            args: [activeAccount, amountWei],
            chain: orgVaultChain,
            account: activeAccount,
          });
          await publicClient.waitForTransactionReceipt({ hash: mintHash });
        }

        // 2. Check MockPHP allowance for OrgVault.sol
        const currentAllowance = await publicClient.readContract({
          address: mockPhpAddr,
          abi: MOCK_PHP_ABI,
          functionName: "allowance",
          args: [activeAccount, orgVaultAddr],
        });

        if (currentAllowance < amountWei) {
          setStepLabel("Step 1/2: Approving MockPHP in your wallet...");
          const approveHash = await walletClient.writeContract({
            address: mockPhpAddr,
            abi: MOCK_PHP_ABI,
            functionName: "approve",
            args: [orgVaultAddr, amountWei],
            chain: orgVaultChain,
            account: activeAccount,
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }

        // 3. Call OrgVault.payDues(amountWei)
        setStepLabel("Step 2/2: Depositing MockPHP into OrgVault.sol...");
        const payHash = await walletClient.writeContract({
          address: orgVaultAddr,
          abi: ORG_VAULT_ABI,
          functionName: "payDues",
          args: [amountWei],
          chain: orgVaultChain,
          account: activeAccount,
        });
        await publicClient.waitForTransactionReceipt({ hash: payHash });
        onChainTxHash = payHash;
        await refreshMockPhpBalance(activeAccount, mockPhpAddr);
      }

      setStepLabel("Recording Dues entry to Public Ledger...");
      const res = await fetch("/api/dues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          orgName: orgName.trim(),
          university: university.trim(),
          period,
          amountPesos: parsedAmount,
          walletAddress: activeAccount,
          txHash: onChainTxHash,
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Could not record dues payment.");
        return;
      }

      setSuccessPayment(data.payment);
      await loadData(orgName, period);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Dues payment failed or was rejected."
      );
    } finally {
      setStepLabel(null);
      setBusy(false);
    }
  };

  const handleAddMemberToRoster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    try {
      const res = await fetch("/api/dues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_member",
          displayName: newMemberName.trim(),
          orgName,
          role: newMemberRole,
        }),
      });
      if (res.ok) {
        setNewMemberName("");
        await loadData(orgName, period);
      }
    } catch {
      // ignore
    }
  };

  const paidCount = members.filter((m) => m.status === "Paid").length;
  const unpaidCount = members.filter((m) => m.status === "Unpaid").length;
  const filteredMembers = members.filter((m) =>
    rosterFilter === "ALL" ? true : m.status === rosterFilter
  );

  return (
    <AppShell summary={summary}>
      <div className="space-y-6">
        {/* Top Context Bar */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src="/mascot.png"
              alt="OrgVault Mascot"
              className="w-12 h-12 object-contain shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">
                  Pay Member Dues
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-semibold">
                  &#10003; ₱1.00 = 1 MockPHP
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#065F46] text-xs font-semibold">
                  &#10003; BSC Testnet (Chain ID 97)
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Deposit MockPHP into{" "}
                <span className="font-mono font-medium text-[#0F172A]">
                  OrgVault.sol
                </span>
                . Funds are guarded on-chain and spent only via AI receipt checks
                and approved budget rules.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/ledger"
              className="px-3.5 py-2 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 border border-[#E2E8F0] text-xs font-semibold text-[#0F172A]"
            >
              View Public Ledger &rarr;
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN (7 cols): Member Dues Payment Flow */}
          <div className="xl:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  Member Dues Deposit
                </h3>
                <p className="text-xs text-[#64748B]">
                  Zero personal info stored on-chain — only your wallet address and
                  MockPHP amount hit BSC Testnet.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileEdit(!showProfileEdit)}
                className="px-3 py-1.5 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 border border-[#E2E8F0] text-xs font-semibold text-[#2563EB]"
              >
                {showProfileEdit ? "Close Switcher" : "Switch Member / Org"}
              </button>
            </div>

            {/* Step 1: Member & Organization Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#0F172A]">
                <span className="w-5 h-5 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-bold inline-flex items-center justify-center">
                  1
                </span>
                <span>Logged-In Member &amp; Organization</span>
              </div>

              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[#0F172A]">
                      {displayName}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-[#E2E8F0] text-[11px] font-semibold text-[#475569]">
                      {role}
                    </span>
                    {existingPeriodPayment ? (
                      <span className="px-2 py-0.5 rounded-md bg-[#ECFDF5] border border-emerald-200 text-[11px] font-semibold text-[#065F46]">
                        &#10003; Paid ({period})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-800">
                        Unpaid ({period})
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#64748B]">
                    Organization:{" "}
                    <strong className="text-[#0F172A]">{orgName}</strong> ·{" "}
                    {university}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {PRESET_ORGS.map((item) => {
                    const active =
                      item.orgName.toLowerCase() === orgName.toLowerCase();
                    return (
                      <button
                        key={item.orgName}
                        type="button"
                        onClick={() => {
                          setOrgName(item.orgName);
                          setUniversity(item.university);
                          saveProfile({
                            orgName: item.orgName,
                            university: item.university,
                            nickname: displayName,
                            role,
                          });
                          setSuccessPayment(null);
                          setErrorMsg(null);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                          active
                            ? "bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]"
                            : "bg-white hover:bg-slate-50 border-[#E2E8F0] text-[#64748B]"
                        }`}
                      >
                        {item.orgName.split(" ")[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {showProfileEdit && (
                <form
                  onSubmit={handleSaveMemberOrg}
                  className="p-4 rounded-xl border border-blue-200 bg-[#EFF6FF]/40 space-y-3"
                >
                  <div className="text-xs font-bold text-[#0F172A]">
                    Log In / Switch Member &amp; Organization
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                        Member Display Name (Nickname)
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g., TreasurerAlex or MemberJuan"
                        className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                        Choose Organization
                      </label>
                      <select
                        value={orgName}
                        onChange={(e) => {
                          const chosen = e.target.value;
                          setOrgName(chosen);
                          const match = PRESET_ORGS.find(
                            (o) => o.orgName === chosen
                          );
                          if (match) setUniversity(match.university);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs focus:outline-none focus:border-[#2563EB]"
                      >
                        {PRESET_ORGS.map((o) => (
                          <option key={o.orgName} value={o.orgName}>
                            {o.orgName} ({o.university})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "TreasurerAlex",
                        "AuditorKen",
                        "DevLeadBea",
                        "FreshmanGio",
                      ].map((demoNick) => (
                        <button
                          key={demoNick}
                          type="button"
                          onClick={() => setDisplayName(demoNick)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-[#CBD5E1] text-[11px] font-medium text-[#2563EB] hover:bg-blue-50"
                        >
                          Use {demoNick}
                        </button>
                      ))}
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold"
                    >
                      Save Selection
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Step 2: Dues Period & Amount (₱1.00 = 1 MockPHP) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#0F172A]">
                <span className="w-5 h-5 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-bold inline-flex items-center justify-center">
                  2
                </span>
                <span>
                  Dues Period &amp; Amount (₱1.00 = 1 MockPHP
                  <JargonTooltip term="MockPHP" />)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">
                    Dues Period
                  </label>
                  <select
                    value={period}
                    onChange={(e) => {
                      setPeriod(e.target.value);
                      setSuccessPayment(null);
                      setErrorMsg(null);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-xs font-semibold focus:outline-none focus:border-[#2563EB]"
                  >
                    {PERIOD_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">
                    Dues Amount in Pesos (₱)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-sm font-bold text-[#0F172A]">
                      ₱
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={duesAmount}
                      onChange={(e) => setDuesAmount(e.target.value)}
                      className="w-full pl-8 pr-24 py-2.5 rounded-xl border border-[#E2E8F0] text-sm font-bold tabular-nums focus:outline-none focus:border-[#2563EB]"
                    />
                    <span className="absolute right-3 text-[11px] font-semibold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-md">
                      = {Number(duesAmount || 0).toFixed(2)} mPHP
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs">
                <span className="text-[#64748B]">
                  Standard Member Dues:{" "}
                  <strong className="text-[#0F172A]">
                    ₱1.00 = 1.00 MockPHP
                  </strong>
                </span>
                <div className="flex items-center gap-1.5">
                  {["1.00", "50.00", "100.00", "250.00"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDuesAmount(preset)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold tabular-nums ${
                        Number(duesAmount) === Number(preset)
                          ? "bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]"
                          : "bg-white border-[#E2E8F0] text-[#475569] hover:bg-slate-50"
                      }`}
                    >
                      ₱{preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 3: Connect Wallet & Pay Dues */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[#0F172A]">
                  <span className="w-5 h-5 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-bold inline-flex items-center justify-center">
                    3
                  </span>
                  <span>Connect BSC Testnet Wallet &amp; Deposit</span>
                </div>

                {account && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleMintTestMockPhp}
                    className="text-xs font-semibold text-[#2563EB] hover:underline disabled:opacity-50"
                  >
                    + Mint Test MockPHP
                  </button>
                )}
              </div>

              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-[#0F172A]">
                    {account
                      ? `Connected Wallet: ${shortAddr(account)}`
                      : "Wallet Not Connected"}
                  </div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">
                    {account ? (
                      <>
                        Network:{" "}
                        <span className="font-semibold text-[#10B981]">
                          &#10003; BSC Testnet (97)
                        </span>
                        {mockPhpBalance !== null && (
                          <>
                            {" "}
                            · Balance:{" "}
                            <span className="font-semibold text-[#0F172A] tabular-nums">
                              {formatPeso(mockPhpBalance)} (mPHP)
                            </span>
                          </>
                        )}
                      </>
                    ) : (
                      "Connect MetaMask on BSC Testnet (Chain ID 97) to deposit MockPHP into OrgVault.sol."
                    )}
                  </div>
                </div>

                {!account ? (
                  <button
                    type="button"
                    onClick={connectWallet}
                    className="px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold shrink-0"
                  >
                    Connect Wallet
                  </button>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg bg-[#ECFDF5] border border-emerald-200 text-[#065F46] text-xs font-semibold shrink-0">
                    &#10003; Wallet Ready
                  </span>
                )}
              </div>

              {/* Duplicate Payment Guard Banner */}
              {existingPeriodPayment && (
                <div className="p-4 rounded-xl bg-[#ECFDF5] border border-emerald-200 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#065F46]">
                      &#10003; Dues Already Paid for {period}
                    </span>
                    <span className="text-xs font-bold tabular-nums text-[#065F46]">
                      {formatPeso(existingPeriodPayment.amountPesos)}
                    </span>
                  </div>
                  <p className="text-xs text-[#065F46]">
                    Duplicate payments for the same dues period are blocked to
                    protect members. Paid by{" "}
                    <strong>{existingPeriodPayment.displayName}</strong> on{" "}
                    {existingPeriodPayment.date}.
                  </p>
                  <div className="pt-1">
                    <a
                      href={existingPeriodPayment.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-[#065F46] underline"
                    >
                      View BscScan Testnet Transaction (
                      {shortAddr(existingPeriodPayment.txHash)}) ↗
                    </a>
                  </div>
                </div>
              )}

              {stepLabel && (
                <div className="p-3 rounded-xl bg-[#EFF6FF] border border-blue-200 text-xs font-medium text-[#2563EB]">
                  {stepLabel}
                </div>
              )}

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-red-200 text-xs font-medium text-[#991B1B]">
                  {errorMsg}
                </div>
              )}

              {successPayment && (
                <div className="p-4 rounded-xl bg-[#ECFDF5] border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#065F46]">
                      &#10003; Dues Paid Successfully into OrgVault.sol!
                    </span>
                    <span className="text-sm font-bold tabular-nums text-[#065F46]">
                      +{formatPeso(successPayment.amountPesos)}
                    </span>
                  </div>
                  <p className="text-xs text-[#065F46]">
                    <strong>{successPayment.displayName}</strong> paid{" "}
                    {formatPeso(successPayment.amountPesos)} (
                    {successPayment.amountPesos} MockPHP) for{" "}
                    <strong>{successPayment.period}</strong>. Vault Available
                    Balance and Public Ledger have been updated.
                  </p>
                  <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
                    <a
                      href={successPayment.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[#065F46] underline"
                    >
                      View on BscScan Testnet ({shortAddr(successPayment.txHash)}
                      ) ↗
                    </a>
                    <Link
                      href="/ledger"
                      className="font-semibold text-[#2563EB] hover:underline"
                    >
                      Open Public Ledger &rarr;
                    </Link>
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={busy}
                onClick={handlePayDues}
                className="w-full py-3 px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <span>
                  {busy
                    ? "Processing Dues Deposit..."
                    : existingPeriodPayment
                    ? `✓ Already Paid for ${period}`
                    : `Pay Dues (${formatPeso(
                        Number(duesAmount || 0)
                      )} = ${Number(duesAmount || 0).toFixed(2)} MockPHP)`}
                </span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN (5 cols): Treasurer View — Member Paid / Unpaid List */}
          <div className="xl:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Treasurer View: Member Roster
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#2563EB] text-[11px] font-semibold">
                    {paidCount} Paid · {unpaidCount} Unpaid
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {orgName} · {period}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadData(orgName, period)}
                className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold hover:bg-[#F8FAFC]"
              >
                Refresh
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex p-1 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs">
                {(["ALL", "Paid", "Unpaid"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setRosterFilter(tab)}
                    className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                      rosterFilter === tab
                        ? "bg-white text-[#0F172A] shadow-2xs"
                        : "text-[#64748B] hover:text-[#0F172A]"
                    }`}
                  >
                    {tab === "ALL"
                      ? `All (${members.length})`
                      : tab === "Paid"
                      ? `✓ Paid (${paidCount})`
                      : `Unpaid (${unpaidCount})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Member List */}
            {loading ? (
              <p className="text-xs text-[#64748B] py-4">
                Loading member dues status...
              </p>
            ) : filteredMembers.length === 0 ? (
              <p className="text-xs text-[#64748B] py-4">
                No members match the selected filter.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {filteredMembers.map((m) => {
                  const isPaid = m.status === "Paid";
                  return (
                    <div
                      key={m.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                        isPaid
                          ? "bg-[#ECFDF5]/45 border-emerald-200"
                          : "bg-[#F8FAFC] border-[#E2E8F0]"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[#0F172A]">
                            {m.displayName}
                          </span>
                          <span className="text-[11px] text-[#64748B]">
                            · {m.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#64748B] mt-0.5 flex items-center gap-2 flex-wrap">
                          {isPaid ? (
                            <>
                              <span>Paid {m.date}</span>
                              {m.explorerUrl && (
                                <a
                                  href={m.explorerUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-semibold text-[#2563EB] hover:underline"
                                >
                                  BscScan Tx ↗
                                </a>
                              )}
                            </>
                          ) : (
                            <span>Awaiting dues deposit for {period}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold tabular-nums text-[#0F172A]">
                          {formatPeso(m.amountPesos)}
                        </div>
                        {isPaid ? (
                          <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-[#ECFDF5] border border-emerald-200 text-[#065F46] text-[11px] font-semibold">
                            &#10003; Paid
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setDisplayName(m.displayName);
                              setSuccessPayment(null);
                              setErrorMsg(null);
                            }}
                            className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-semibold transition-colors"
                            title="Click to select this member and pay dues"
                          >
                            Unpaid · Select
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Member to Organization Roster */}
            <form
              onSubmit={handleAddMemberToRoster}
              className="pt-3 border-t border-[#E2E8F0] space-y-2"
            >
              <label className="block text-[11px] font-semibold text-[#64748B]">
                Add Member to Treasurer Roster
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Member nickname (e.g., MemberCarla)"
                  className="flex-1 px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:border-[#2563EB]"
                />
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="px-2.5 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs"
                >
                  <option value="Member">Member</option>
                  <option value="Officer">Officer</option>
                  <option value="Auditor">Auditor</option>
                </select>
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 border border-[#E2E8F0] text-xs font-semibold text-[#0F172A]"
                >
                  + Add
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
