"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ENV_TOKEN_ADDRESS,
  ENV_VAULT_ADDRESS,
  EXPLORER_BASE,
} from "@/lib/contracts";
import type { VaultSummary } from "@/lib/chain/vault";
import BscWalletButton from "@/components/BscWalletButton";

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
    : null;
  const available = summary ? summary.vaultBalance : null;
  const totalDues =
    available !== null && totalSpent !== null ? available + totalSpent : null;

  const vaultAddr = summary?.orgVaultAddress ?? ENV_VAULT_ADDRESS;
  const tokenAddr = summary?.mockPhpAddress ?? ENV_TOKEN_ADDRESS;
  const vaultUrl = vaultAddr
    ? `${EXPLORER_BASE}/address/${vaultAddr}`
    : EXPLORER_BASE;
  const tokenUrl = tokenAddr
    ? `${EXPLORER_BASE}/address/${tokenAddr}`
    : EXPLORER_BASE;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col lg:flex-row">
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-[#E2E8F0] px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-base">
          <Image
            src="/logo-blue.png"
            alt="OrgVault logo"
            width={32}
            height={32}
            className="w-8 h-8 object-contain"
          />
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

      {/* Fixed Left Sidebar */}
      <aside
        className={`${
          mobileOpen ? "block" : "hidden"
        } lg:flex lg:flex-col lg:justify-between lg:w-[260px] lg:fixed lg:inset-y-0 lg:left-0 bg-white border-r border-[#E2E8F0] p-4 z-30`}
      >
        <div className="space-y-5">
          <Link href="/" className="hidden lg:flex items-center gap-2.5">
            <Image
              src="/logo-blue.png"
              alt="OrgVault logo"
              width={32}
              height={32}
              className="w-8 h-8 object-contain"
            />
            <div>
              <div className="font-semibold text-[16px] leading-tight">
                OrgVault
              </div>
              <div className="text-[11px] text-[#64748B]">
                Guarded Treasury
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
            <NavLink
              href="/submit"
              active={pathname === "/submit"}
              onClick={() => setMobileOpen(false)}
              label="Submit Receipt"
              icon={
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <NavLink
              href="/reimbursements"
              active={pathname === "/reimbursements"}
              onClick={() => setMobileOpen(false)}
              label="Reimbursements"
              icon={
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
            <NavLink
              href="/ledger"
              active={pathname === "/ledger"}
              onClick={() => setMobileOpen(false)}
              label="Public Ledger"
              icon={
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
            />
            <NavLink
              href="/admin"
              active={pathname === "/admin"}
              onClick={() => setMobileOpen(false)}
              label="Admin & Controls"
              icon={
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
          </nav>
        </div>

        <div className="pt-4 border-t border-[#E2E8F0] space-y-2 text-xs">
          <BscWalletButton
            vaultAddress={vaultAddr}
            tokenAddress={tokenAddr}
          />
          <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5 text-[11px]">
            <div className="font-semibold text-[#0F172A]">
              Contracts (BSC Testnet)
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#64748B]">OrgVault</span>
              <a
                href={vaultUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-brand hover:underline"
              >
                {vaultAddr
                  ? `${vaultAddr.slice(0, 6)}...${vaultAddr.slice(-4)} ↗`
                  : "Unset"}
              </a>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#64748B]">MockPHP</span>
              <a
                href={tokenUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-brand hover:underline"
              >
                {tokenAddr
                  ? `${tokenAddr.slice(0, 6)}...${tokenAddr.slice(-4)} ↗`
                  : "Unset"}
              </a>
            </div>
          </div>
          <Link
            href="/"
            className="block text-center py-2 rounded-xl border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] font-medium"
          >
            Home
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:pl-[260px] flex flex-col min-h-screen">
        <header className="bg-white border-b border-[#E2E8F0]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                {profile.orgName}
              </h1>
              <p className="text-[13px] text-[#64748B] mt-0.5">
                {profile.university} · MockPHP (1 Token = ₱1.00)
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/admin"
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-brand hover:opacity-90 text-white text-[13px] font-medium transition-colors"
              >
                + Pay Dues
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* 3 Financial Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#64748B]">
                  Vault Available Balance
                </span>
                <div className="w-8 h-8 rounded-xl bg-brand-light text-brand flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
              </div>
              <div className="mt-2.5 text-2xl font-bold tracking-tight tabular-nums">
                {available !== null ? formatPeso(available) : "—"}
              </div>
              <div className="mt-0.5 text-xs text-[#64748B]">
                On-chain vault balance
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#64748B]">
                  Total Dues
                </span>
                <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </div>
              <div className="mt-2.5 text-2xl font-bold tracking-tight tabular-nums">
                {totalDues !== null ? formatPeso(totalDues) : "—"}
              </div>
              <div className="mt-0.5 text-xs text-[#64748B]">
                Member contributions
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#64748B]">
                  Total Expenses
                </span>
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-[#475569] flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                  </svg>
                </div>
              </div>
              <div className="mt-2.5 text-2xl font-bold tracking-tight tabular-nums">
                {totalSpent !== null ? formatPeso(totalSpent) : "—"}
              </div>
              <div className="mt-0.5 text-xs text-[#64748B]">
                Settled payouts
              </div>
            </div>
          </div>

          {children}
        </main>
      </div>

      {/* Bottom-Right Mascot Companion */}
      <Link
        href="/submit"
        aria-label="OrgVault AI Assistant"
        className="fixed bottom-4 right-4 z-40 group flex items-center gap-2 rounded-2xl bg-white/95 backdrop-blur border border-[#E2E8F0] p-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
      >
        <img
          src="/mascot.png"
          alt="OrgVault Mascot"
          className="w-11 h-11 sm:w-12 sm:h-12 object-contain"
        />
      </Link>
    </div>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v5c0 4.97-3.05 9.18-7 10.5C8.05 21.18 5 16.97 5 12V7l7-4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  );
}

function NavLink({
  href,
  active,
  onClick,
  label,
  icon,
}: {
  href: string;
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
        active
          ? "bg-brand-light text-brand"
          : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
