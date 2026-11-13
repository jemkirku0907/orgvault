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
    <div className="min-h-screen bg-white flex flex-col justify-between">
      <header className="border-b border-[#E2E8F0]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-bold text-sm">
              OV
            </div>
            <span className="font-semibold text-lg tracking-tight">
              OrgVault
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="px-3.5 py-2 rounded-xl text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
            >
              Log In / Profile
            </button>
            <Link
              href="/submit"
              className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold transition-colors"
            >
              Explore Demo
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-semibold">
            BSC Testnet (Chain ID 97) • MockPHP (1 Token = ₱1.00)
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#0F172A] leading-tight">
            AI-Checked, On-Chain Funds for Student Organizations
          </h1>

          <p className="text-base sm:text-lg text-[#64748B] leading-relaxed max-w-xl">
            For student org treasurers who track dues in spreadsheets and group
            chats, OrgVault uses AI to read receipts and BNB Smart Chain to
            enforce budgets and release payouts.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/submit"
              className="px-6 py-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold transition-colors"
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
              className="px-4 py-3.5 text-sm font-medium text-[#2563EB] hover:underline"
            >
              View Public Ledger
            </Link>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-[#64748B]">Sample Org Vault</div>
                <div className="font-semibold text-sm">
                  {profile.orgName}
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#10B981] text-xs font-semibold">
                Contract Guarded
              </span>
            </div>

            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-2">
              <div className="text-xs text-[#64748B]">Hard On-Chain Rules</div>
              <ul className="text-xs text-[#0F172A] space-y-1.5">
                <li>✓ Per-category budgets (Food, Printing, Events)</li>
                <li>✓ Approved vendor allowlist &amp; officer caps</li>
                <li>✓ Duplicate receipt blocking via keccak256 hash</li>
                <li>✓ EIP-712 attestor signature verification</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-[#E2E8F0] py-6 text-center text-xs text-[#64748B]">
        OrgVault • Testnet-only demo on BSC Testnet (Chain ID 97). Zero personal info stored on-chain.
      </footer>

      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
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
              Local-state only for the demo — zero personal info is sent on-chain.
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
