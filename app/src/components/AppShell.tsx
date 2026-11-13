"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { EXPLORER_BASE } from "@/lib/contracts";
import type { VaultSummary } from "@/lib/chain/vault";

export interface LocalProfile {
  orgName: string;
  university: string;
  nickname: string;
  role: string;
}

const DEFAULT_PROFILE: LocalProfile = {
  orgName: "Computer Science Society",
  university: "University of Makati",
  nickname: "TreasurerAlex",
  role: "Treasurer",
};

const PROFILE_KEY = "orgvault_profile_v1";

export function useLocalProfile() {
  const [profile, setProfile] = useState<LocalProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) setProfile(JSON.parse(raw));
    } catch {
      // ignore storage errors
    }
  }, []);

  const saveProfile = (next: LocalProfile) => {
    setProfile(next);
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  return { profile, saveProfile };
}

function formatPeso(val: number): string {
  return `₱${val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function AppShell({
  children,
  summary,
}: {
  children: React.ReactNode;
  summary?: VaultSummary | null;
}) {
  const pathname = usePathname();
  const { profile } = useLocalProfile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const totalSpent = summary
    ? summary.budgets.reduce((acc, b) => acc + b.spent, 0)
    : 0;
  const available = summary ? summary.vaultBalance : 3500;
  const totalDues = available + totalSpent;

  const navItems = [
    { href: "/submit", label: "Submit Receipt" },
    { href: "/ledger", label: "Public Ledger" },
    { href: "/admin", label: "Admin & Controls" },
  ];

  const vaultUrl = summary?.orgVaultAddress
    ? `${EXPLORER_BASE}/address/${summary.orgVaultAddress}`
    : EXPLORER_BASE;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-[#E2E8F0] px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-base">
          <span className="w-8 h-8 rounded-xl bg-[#2563EB] text-white flex items-center justify-center text-sm font-bold">
            OV
          </span>
          <span>OrgVault</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] text-xs font-medium text-[#0F172A]"
        >
          {mobileOpen ? "Close" : "Menu"}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={`${
          mobileOpen ? "block" : "hidden"
        } lg:flex lg:flex-col lg:justify-between lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 bg-white border-r border-[#E2E8F0] p-4 z-30`}
      >
        <div className="space-y-5">
          <Link href="/" className="hidden lg:flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm">
              OV
            </div>
            <div>
              <div className="font-semibold text-[16px] leading-tight">
                OrgVault
              </div>
              <div className="text-[11px] text-[#64748B]">
                Guarded Student Treasury
              </div>
            </div>
          </Link>

          <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
            <div className="text-[13px] font-semibold truncate">
              {profile.orgName}
            </div>
            <div className="text-[11px] text-[#64748B] truncate">
              {profile.university}
            </div>
            <div className="pt-0.5 text-[11px] font-medium text-[#475569] truncate">
              {profile.nickname} · {profile.role}
            </div>
          </div>

          <nav className="space-y-1" aria-label="Primary">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
                    active
                      ? "bg-[#EFF6FF] text-[#2563EB]"
                      : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-[#E2E8F0] space-y-2 text-xs">
          <a
            href={vaultUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#2563EB] transition-colors"
          >
            <span className="font-medium text-[#0F172A]">
              BSC Testnet
            </span>
            <span className="text-[#2563EB] font-semibold">BscScan ↗</span>
          </a>
          <Link
            href="/"
            className="block text-center py-2 rounded-xl border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] font-medium"
          >
            Switch Profile / Home
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <header className="bg-white border-b border-[#E2E8F0]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                {profile.orgName}
              </h1>
              <p className="text-xs text-[#64748B] mt-0.5">
                AI-checked receipts &amp; on-chain treasury rules
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div>
                <div className="text-[#64748B]">Available</div>
                <div className="font-bold text-[15px] tabular-nums text-[#0F172A]">
                  {formatPeso(available)}
                </div>
              </div>
              <div className="h-7 w-px bg-[#E2E8F0]" />
              <div>
                <div className="text-[#64748B]">Dues In</div>
                <div className="font-semibold text-[14px] tabular-nums text-[#10B981]">
                  {formatPeso(totalDues)}
                </div>
              </div>
              <div className="h-7 w-px bg-[#E2E8F0]" />
              <div>
                <div className="text-[#64748B]">Spent Out</div>
                <div className="font-semibold text-[14px] tabular-nums text-[#0F172A]">
                  {formatPeso(totalSpent)}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
