"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocalProfile } from "@/components/AppShell";

const SCHOOLS = [
  "University of Makati",
  "Ateneo de Manila University",
  "De La Salle University",
  "Polytechnic University of the Philippines",
  "University of Santo Tomas",
  "University of the Philippines Diliman",
];

export default function LandingPage() {
  const router = useRouter();
  const { profile, saveProfile } = useLocalProfile();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [orgName, setOrgName] = useState(profile.orgName);
  const [university, setUniversity] = useState(profile.university);
  const [nickname, setNickname] = useState(profile.nickname);
  const [role, setRole] = useState(profile.role);

  const handleSaveAndEnter = (e: React.FormEvent) => {
    e.preventDefault();
    saveProfile({
      orgName: orgName.trim() || "Computer Science Society",
      university: university.trim() || "University of Makati",
      nickname: nickname.trim() || "TreasurerAlex",
      role,
    });
    router.push("/submit");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between text-[#0F172A]">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              OV
            </div>
            <span className="font-semibold text-[18px] tracking-tight">
              OrgVault
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="#how-it-works"
              className="hidden sm:inline-block px-3 py-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A]"
            >
              How It Works
            </a>
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="px-3.5 py-2 rounded-xl text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
            >
              Log In / Profile
            </button>
            <Link
              href="/submit"
              className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold transition-colors shadow-xs"
            >
              Explore Demo
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 sm:pt-20 sm:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFF6FF] border border-blue-100 text-[#2563EB] text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
              <span>BSC Testnet (Chain ID 97) • MockPHP (1 Token = ₱1.00)</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-tight text-[#0F172A] leading-[1.15]">
              Transparent Budget &amp; Receipt Management for Student Orgs
            </h1>

            <p className="text-base sm:text-[17px] text-[#64748B] leading-relaxed max-w-xl">
              For student org treasurers who track dues in spreadsheets and group
              chats, OrgVault uses AI to read receipts and BNB Smart Chain to
              enforce budgets, block duplicates, and release payouts.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/submit"
                className="px-6 py-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold transition-colors shadow-xs"
              >
                Explore Demo →
              </Link>
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="px-6 py-3.5 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 border border-[#E2E8F0] text-sm font-medium text-[#0F172A] transition-colors"
              >
                Create Your Profile
              </button>
              <Link
                href="/ledger"
                className="px-4 py-3.5 text-sm font-semibold text-[#2563EB] hover:underline"
              >
                View Public Ledger
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-[#64748B]">
                    {profile.orgName}
                  </div>
                  <div className="font-semibold text-sm text-[#0F172A] mt-0.5">
                    Org Treasury Snapshot
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#10B981] text-xs font-semibold">
                  Contract Guarded
                </span>
              </div>

              <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#64748B]">
                    Available Org Funds
                  </span>
                  <span className="text-[11px] font-medium text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-md">
                    MockPHP (₱)
                  </span>
                </div>
                <div className="text-3xl font-bold tabular-nums text-[#0F172A]">
                  ₱3,500.00
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-[#64748B] mb-1.5">
                    <span>Food Budget</span>
                    <span className="tabular-nums font-medium text-[#0F172A]">
                      ₱0.00 / ₱1,000.00
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-[#2563EB] rounded-full w-1/12" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-[#0F172A]">
                    Built-In Contract Rules
                  </div>
                  <div className="text-xs text-[#64748B] mt-0.5">
                    Duplicate block • Budget cap • Vendor allowlist
                  </div>
                </div>
                <Link
                  href="/submit"
                  className="px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shrink-0"
                >
                  Open App →
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-t border-[#E2E8F0] bg-[#F8FAFC] py-16"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
                How It Works
              </div>
              <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">
                No crypto background required
              </h2>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-3">
                <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#2563EB] font-bold text-sm flex items-center justify-center">
                  1
                </div>
                <h3 className="text-base font-semibold">Set Budgets &amp; Vendors</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">
                  Members pay dues in MockPHP (1 token = ₱1.00). Treasurers set
                  per-category caps and approved vendor addresses on-chain.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-3">
                <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#2563EB] font-bold text-sm flex items-center justify-center">
                  2
                </div>
                <h3 className="text-base font-semibold">AI Reads &amp; Signs</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">
                  Upload a receipt photo or paste text. Gemini checks the vendor
                  and budget, then our backend signs an EIP-712 attestation.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-3">
                <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#2563EB] font-bold text-sm flex items-center justify-center">
                  3
                </div>
                <h3 className="text-base font-semibold">Contract Enforces &amp; Logs</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">
                  OrgVault.sol blocks over-budget, duplicate, or unapproved
                  payouts before funds move, and logs every peso on the Public Ledger.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E2E8F0] bg-white py-6 text-center text-xs text-[#64748B]">
        OrgVault • Testnet-only demo on BSC Testnet (Chain ID 97). Zero personal
        info stored on-chain.
      </footer>

      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Create your profile</h2>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="text-xs text-[#64748B] hover:text-[#0F172A]"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-[#64748B]">
              Local-state only for the demo — zero personal info is sent
              on-chain.
            </p>
            <form onSubmit={handleSaveAndEnter} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">School</label>
                <select
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-sm bg-white"
                >
                  {SCHOOLS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Nickname
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-sm bg-white"
                  >
                    <option value="Treasurer">Treasurer</option>
                    <option value="President">President</option>
                    <option value="Auditor">Auditor</option>
                    <option value="Member">Member</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold"
              >
                Continue to Submit Receipt
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
