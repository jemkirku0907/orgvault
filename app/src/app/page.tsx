"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useEffect } from "react";
import { useLocalProfile } from "@/components/AppShell";
import BscWalletButton from "@/components/BscWalletButton";
import HeaderBanner from "@/components/HeaderBanner";
import {
  ENV_TOKEN_ADDRESS,
  ENV_VAULT_ADDRESS,
  EXPLORER_BASE,
} from "@/lib/contracts";

const BASE_UNIVERSITIES = [
  "I prefer not to disclose",
  "University of Makati",
  "Ateneo De Manila University",
  "Adamson University",
  "AMA University and Colleges",
  "Asia Pacific College",
  "Arellano University",
  "Batangas State University",
  "Bicol University",
  "De La Salle University",
  "Far Eastern University",
  "Mapúa University",
  "Polytechnic University of the Philippines",
  "University of Santo Tomas",
  "University of the Philippines Diliman",
];

const FUN_NICKNAMES = [
  "TreasurerAlex",
  "BlueEagle_Treas",
  "UMAK_Vault01",
  "OrgLedgerPro",
  "KatipunanVault",
  "TamarawLedger",
  "ArchersTreasury",
  "StudentAuditor",
];

export default function LandingPage() {
  const router = useRouter();
  const { profile, saveProfile } = useLocalProfile();

  // View state: "landing" | "auth" | "profile"
  const [view, setView] = useState<"landing" | "auth" | "profile">("landing");
  const [authTab, setAuthTab] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // Google account chooser modal
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showCustomGoogle, setShowCustomGoogle] = useState(false);
  const [customGoogleName, setCustomGoogleName] = useState("");
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");

  // Profile onboarding state
  const [schools, setSchools] = useState<string[]>(BASE_UNIVERSITIES);
  const [uniQuery, setUniQuery] = useState("");
  const [selectedUni, setSelectedUni] = useState(profile.university || "");
  const [uniOpen, setUniOpen] = useState(false);
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolCity, setNewSchoolCity] = useState("");
  const [addSchoolError, setAddSchoolError] = useState("");
  const [customSchoolAdded, setCustomSchoolAdded] = useState(false);

  const [orgName, setOrgName] = useState(profile.orgName);
  const [nickname, setNickname] = useState(profile.nickname);
  const [role, setRole] = useState(profile.role);
  const [profileError, setProfileError] = useState("");
  const [nickCursor, setNickCursor] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUniOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filteredSchools = useMemo(() => {
    const q = uniQuery.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter((s) => s.toLowerCase().includes(q));
  }, [schools, uniQuery]);

  const openAuth = (tab: "signup" | "login") => {
    setAuthTab(tab);
    setAuthError("");
    setView("auth");
  };

  const openProfileSetup = (userEmail: string, suggestedName?: string) => {
    setEmail(userEmail);
    setProfileError("");
    setUniQuery(selectedUni || "");
    if (suggestedName && !nickname) {
      setNickname(suggestedName.replace(/[^a-zA-Z0-9]/g, "") + "_Treas");
    }
    setView("profile");
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setAuthError("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }
    setAuthError("");
    if (authTab === "login") {
      router.push("/submit");
      return;
    }
    openProfileSetup(email.trim());
  };

  const handleSelectGoogleAccount = (
    gEmail: string,
    gName: string,
    type: "new" | "existing"
  ) => {
    setShowGoogleModal(false);
    if (type === "existing") {
      saveProfile({
        orgName: "Computer Science Society",
        university: "University of Makati",
        nickname: "Maria_CS_Treas",
        role: "Treasurer",
      });
      router.push("/submit");
      return;
    }
    openProfileSetup(gEmail, gName);
  };

  const handleAddSchool = () => {
    const name = newSchoolName.trim();
    if (!name) {
      setAddSchoolError("Please enter a school or university name.");
      return;
    }
    const label = newSchoolCity.trim() ? `${name} — ${newSchoolCity.trim()}` : name;
    if (!schools.some((s) => s.toLowerCase() === label.toLowerCase())) {
      setSchools((prev) => [...prev, label]);
    }
    setSelectedUni(label);
    setUniQuery(label);
    setShowAddSchool(false);
    setCustomSchoolAdded(true);
    setAddSchoolError("");
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalUni = selectedUni || uniQuery.trim();
    if (!finalUni) {
      setProfileError("Please select your university from the list or add a new school.");
      return;
    }
    if (!nickname.trim()) {
      setProfileError("Please enter or generate a nickname.");
      return;
    }
    if (!orgName.trim()) {
      setProfileError("Please enter your student organization name.");
      return;
    }
    saveProfile({
      orgName: orgName.trim(),
      university: finalUni,
      nickname: nickname.trim().replace(/^@+/, ""),
      role,
    });
    router.push("/submit");
  };

  // =========================================================================
  // VIEW 2: AUTHENTICATION
  // =========================================================================
  if (view === "auth") {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-4 py-10 text-[#0F172A]">
        <div className="w-full max-w-md">
          <div className="mb-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setView("landing")}
              className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
            >
              &larr; Back to home
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v5c0 4.97-3.05 9.18-7 10.5C8.05 21.18 5 16.97 5 12V7l7-4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <span className="font-semibold text-[15px]">OrgVault</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs">
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] mb-6">
              <button
                type="button"
                onClick={() => setAuthTab("signup")}
                className={`py-2 rounded-lg text-sm font-medium transition-all ${
                  authTab === "signup"
                    ? "bg-white text-[#0F172A] shadow-2xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => setAuthTab("login")}
                className={`py-2 rounded-lg text-sm font-medium transition-all ${
                  authTab === "login"
                    ? "bg-white text-[#0F172A] shadow-2xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                Log In
              </button>
            </div>

            <div className="mb-5">
              <h2 className="text-xl font-bold">
                {authTab === "signup"
                  ? "Create your OrgVault account"
                  : "Welcome back to OrgVault"}
              </h2>
              <p className="text-[13px] text-[#64748B] mt-1">
                {authTab === "signup"
                  ? "Start managing your student organization's budget in seconds."
                  : "Log in to access your organization treasury."}
              </p>
            </div>

            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-[#FEF2F2] border border-red-200 text-[13px] text-[#991B1B]">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-[13px] font-medium mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.santos@umak.edu.ph"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-brand hover:opacity-90 text-white text-sm font-semibold transition-colors"
              >
                {authTab === "signup" ? "Create Account" : "Log In"}
              </button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E2E8F0]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-[#94A3B8]">or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGoogleModal(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-sm font-medium flex items-center justify-center gap-2.5 transition-colors"
            >
              <GoogleGIcon />
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
        {showGoogleModal && renderGoogleModal()}
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: CREATE YOUR PROFILE & UNIVERSITY DROPDOWN
  // =========================================================================
  if (view === "profile") {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-between px-4 py-8 sm:py-12 text-[#0F172A]">
        <div className="max-w-[460px] w-full mx-auto flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => setView("auth")}
            className="text-[13px] font-medium text-[#64748B] hover:text-[#0F172A]"
          >
            &larr; Back
          </button>
          <span className="text-xs text-[#64748B] truncate max-w-[240px]">
            {email}
          </span>
        </div>

        <div className="max-w-[460px] w-full mx-auto my-auto">
          <h1 className="text-3xl font-bold tracking-tight">
            Create your profile
          </h1>
          <p className="mt-2.5 text-[15px] text-[#64748B] leading-relaxed">
            Choose your university and a nickname. Keep your identity private for a safe and fun community experience!
          </p>

          <form onSubmit={handleProfileSubmit} className="mt-7 space-y-5" noValidate>
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[13px] font-medium">
                  University
                </label>
                {customSchoolAdded && (
                  <span className="text-[11px] font-medium text-[#10B981]">
                    &#10003; New school added
                  </span>
                )}
              </div>

              <div className="flex items-center w-full rounded-xl border-2 border-brand bg-white px-3.5 py-2.5">
                <input
                  type="text"
                  value={uniQuery}
                  onFocus={() => setUniOpen(true)}
                  onChange={(e) => {
                    setUniQuery(e.target.value);
                    setSelectedUni("");
                    setCustomSchoolAdded(false);
                    setUniOpen(true);
                  }}
                  placeholder="Select your university"
                  className="w-full bg-transparent text-[15px] placeholder-[#64748B] focus:outline-none"
                />
                <span className="w-px h-5 bg-[#CBD5E1] mx-2.5 shrink-0" />
                <button
                  type="button"
                  onClick={() => setUniOpen(!uniOpen)}
                  aria-label="Toggle university dropdown"
                  className="text-[#64748B] hover:text-[#0F172A] p-0.5 shrink-0"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${uniOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {uniOpen && (
                <div className="absolute left-0 right-0 mt-1.5 z-30 bg-white rounded-xl border border-[#E2E8F0] shadow-lg max-h-64 overflow-y-auto flex flex-col">
                  <div className="py-1 divide-y divide-slate-50">
                    {filteredSchools.length === 0 ? (
                      <div className="px-4 py-3 text-[13px] text-[#64748B]">
                        No existing school matches &ldquo;{uniQuery}&rdquo;.
                      </div>
                    ) : (
                      filteredSchools.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setSelectedUni(s);
                            setUniQuery(s);
                            setUniOpen(false);
                            setShowAddSchool(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-[15px] transition-colors ${
                            selectedUni === s
                              ? "bg-brand-light text-brand font-medium"
                              : "hover:bg-[#F8FAFC]"
                          }`}
                        >
                          {s}
                        </button>
                      ))
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUniOpen(false);
                      setShowAddSchool(true);
                      if (uniQuery && uniQuery !== "I prefer not to disclose") {
                        setNewSchoolName(uniQuery);
                      }
                    }}
                    className="sticky bottom-0 w-full px-4 py-2.5 bg-brand-light hover:bg-blue-100/80 border-t border-blue-100 text-left text-[13px] font-semibold text-brand"
                  >
                    + School not listed? Add a new school
                  </button>
                </div>
              )}
            </div>

            {showAddSchool && (
              <div className="rounded-xl border border-blue-200 bg-[#F8FAFC] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Add Your School</h2>
                  <button
                    type="button"
                    onClick={() => setShowAddSchool(false)}
                    className="text-xs text-[#64748B] hover:text-[#0F172A]"
                  >
                    Cancel
                  </button>
                </div>
                <input
                  type="text"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  placeholder="e.g., Pamantasan ng Lungsod ng Maynila"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white text-sm focus:outline-none focus:border-brand"
                />
                <input
                  type="text"
                  value={newSchoolCity}
                  onChange={(e) => setNewSchoolCity(e.target.value)}
                  placeholder="City / Campus (optional)"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white text-sm focus:outline-none focus:border-brand"
                />
                {addSchoolError && (
                  <div className="text-xs text-[#EF4444] font-medium">
                    {addSchoolError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleAddSchool}
                  className="w-full py-2.5 px-4 rounded-xl bg-brand hover:opacity-90 text-white text-[13px] font-semibold"
                >
                  Add &amp; Select School
                </button>
              </div>
            )}

            <div>
              <label className="block text-[13px] font-medium mb-1.5">
                Nickname
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="e.g., TreasurerAlex"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-brand"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = FUN_NICKNAMES[nickCursor % FUN_NICKNAMES.length];
                    setNickCursor((c) => c + 1);
                    setNickname(next);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 border border-[#E2E8F0] text-[13px] font-medium text-brand"
                >
                  Generate
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-medium mb-1.5">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g., Computer Science Society"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-1.5">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-sm focus:outline-none focus:border-brand"
                >
                  <option value="Treasurer">Treasurer</option>
                  <option value="President">President</option>
                  <option value="Auditor">Auditor</option>
                  <option value="Member">Member</option>
                </select>
              </div>
            </div>

            {profileError && (
              <div className="p-3 rounded-xl bg-[#FEF2F2] border border-red-200 text-[13px] text-[#991B1B]">
                {profileError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-5 rounded-xl bg-brand hover:opacity-90 text-white text-[15px] font-semibold transition-colors"
            >
              Continue to Dashboard
            </button>
          </form>
        </div>

        <div className="h-4" />
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: LANDING PAGE
  // =========================================================================
  return (
    <div className="min-h-screen bg-white flex flex-col justify-between text-[#0F172A]">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/logo-blue.png"
              alt="OrgVault logo"
              width={32}
              height={32}
              className="w-8 h-8 object-contain"
            />
            <span className="font-semibold text-[18px] tracking-tight">OrgVault</span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2 md:gap-5">
            <nav className="hidden md:flex items-center gap-6 text-[14px] font-medium text-[#64748B]">
              <a href="#how-it-works" className="hover:text-[#0F172A] transition-colors">
                How It Works
              </a>
              <a href="#features" className="hover:text-[#0F172A] transition-colors">
                Features
              </a>
              <Link href="/pay-dues" className="text-[#2563EB] font-semibold hover:text-[#1D4ED8] transition-colors">
                Pay Dues
              </Link>
              <Link href="/ledger" className="hover:text-[#2563EB] transition-colors">
                Public Ledger
              </Link>
            </nav>

            <div className="flex items-center gap-2">
              <BscWalletButton compact />
              <Link
                href="/pay-dues"
                className="px-3.5 py-2 rounded-xl border border-[#2563EB]/30 bg-[#EFF6FF] hover:bg-blue-100/80 text-[#2563EB] text-[14px] font-semibold transition-colors"
              >
                Pay Dues
              </Link>
              <Link
                href="/submit"
                className="px-4 py-2 rounded-xl bg-brand hover:opacity-90 text-white text-[14px] font-medium transition-colors"
              >
                Open App
              </Link>
            </div>
          </div>
        </div>
      </header>

      <HeaderBanner orgName={profile.orgName} university={profile.university} />

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 sm:pt-20 sm:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7">
              <Image
                src="/logo-blue.png"
                alt="OrgVault logo"
                width={96}
                height={96}
                className="w-24 h-24 object-contain mb-5"
                priority
              />
              <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-tight leading-[1.15]">
                Simple, Transparent Treasury Management for Student Organizations
              </h1>

              <p className="mt-5 text-base sm:text-[17px] text-[#64748B] leading-relaxed max-w-2xl">
                Collect member dues, extract receipt details with AI, and enforce
                category budgets and approved vendors in pesos through an
                on-chain vault on BNB Smart Chain Testnet.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
                <Link
                  href="/pay-dues"
                  className="px-6 py-3.5 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white text-[15px] font-semibold transition-colors text-center"
                >
                  Pay Dues (₱1.00)
                </Link>

                <Link
                  href="/submit"
                  className="px-6 py-3.5 rounded-xl bg-brand hover:opacity-90 text-white text-[15px] font-semibold transition-colors text-center"
                >
                  Submit Receipt
                </Link>

                <Link
                  href="/ledger"
                  className="px-5 py-3.5 rounded-xl bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] text-[15px] font-medium transition-colors text-center"
                >
                  Public Ledger
                </Link>

                <Link
                  href="/admin"
                  className="px-5 py-3.5 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 text-[#0F172A] border border-[#E2E8F0] text-[15px] font-medium transition-colors text-center"
                >
                  Admin &amp; Controls
                </Link>
              </div>

              <div className="mt-4 text-[12px] text-[#64748B]">
                Organization sign-in: Coming soon · Connect MetaMask on BSC Testnet (97) to transact.
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-5 sm:p-6">
                <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
                  <div>
                    <div className="text-xs font-medium text-[#64748B]">
                      {profile.orgName}
                    </div>
                    <div className="text-sm font-semibold mt-0.5">
                      Guarded Treasury Snapshot
                    </div>
                  </div>
                  <span className="text-xs font-medium text-brand">
                    Sample data · BSC Testnet (97)
                  </span>
                </div>

                <div className="mt-4 bg-white rounded-xl border border-[#E2E8F0] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#64748B]">
                      Vault Available Balance
                    </span>
                    <span className="text-[11px] font-medium text-[#64748B]">
                      MockPHP (₱)
                    </span>
                  </div>
                  <div className="mt-1.5 text-2xl sm:text-[28px] font-bold tabular-nums">
                    ₱3,500.00
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-[#64748B] mb-1">
                      <span>Food Budget</span>
                      <span className="tabular-nums font-medium text-[#0F172A]">
                        ₱0.00 / ₱1,000.00
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-brand rounded-full w-1/12" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 bg-white rounded-xl border border-emerald-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] text-[#10B981] flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold">Guarded Payout Flow</div>
                        <div className="text-xs text-[#64748B] mt-0.5">
                          Campus Canteen · Vendor Payment
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-bold tabular-nums">₱450.00</div>
                      <div className="text-[11px] text-[#10B981] font-medium">
                        On-Chain Rule
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-[11px] text-[#64748B]">
                    <div className="flex items-center gap-1">
                      <span className="text-[#10B981] font-bold">&#10003;</span>
                      <span>AI Extracted</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[#10B981] font-bold">&#10003;</span>
                      <span>Budget OK</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[#10B981] font-bold">&#10003;</span>
                      <span>Allowlisted</span>
                    </div>
                  </div>
                </div>

                <Link
                  href="/submit"
                  className="mt-4 w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-[#E2E8F0] text-[13px] font-medium text-brand transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Open Treasury Workspace</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-t border-[#E2E8F0] bg-[#F8FAFC] py-14 sm:py-16"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <div className="text-xs font-semibold uppercase tracking-wider text-brand">
                How It Works
              </div>
              <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight">
                From receipt upload to on-chain settlement in three steps
              </h2>
            </div>

            <div id="features" className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
                <div className="w-9 h-9 rounded-xl bg-brand-light text-brand font-semibold text-sm flex items-center justify-center mb-4">
                  1
                </div>
                <h3 className="text-base font-semibold">Configure Vault &amp; Rules</h3>
                <p className="mt-2 text-[14px] text-[#64748B] leading-relaxed">
                  Members pay dues in MockPHP (₱1.00 per token). Treasurers set
                  category spending limits and approved vendor addresses on-chain.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-light text-brand font-semibold text-sm flex items-center justify-center">
                    2
                  </div>
                  <img
                    src="/mascot.png"
                    alt="OrgVault AI Mascot"
                    className="w-11 h-11 object-contain shrink-0"
                  />
                </div>
                <h3 className="text-base font-semibold">AI Receipt Check &amp; EIP-712</h3>
                <p className="mt-2 text-[14px] text-[#64748B] leading-relaxed">
                  Upload a receipt photo or paste text. Gemini checks the vendor
                  and budget, then our backend signs a typed EIP-712 attestation.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
                <div className="w-9 h-9 rounded-xl bg-brand-light text-brand font-semibold text-sm flex items-center justify-center mb-4">
                  3
                </div>
                <h3 className="text-base font-semibold">Guarded On-Chain Settlement</h3>
                <p className="mt-2 text-[14px] text-[#64748B] leading-relaxed">
                  OrgVault.sol blocks over-budget, duplicate, or unapproved
                  payouts on BSC Testnet (Chain ID 97) and logs every peso publicly.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E2E8F0] bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <span className="font-semibold text-[#0F172A]">OrgVault</span>
            <span>·</span>
            <span>Guarded AI Student Treasury on BSC Testnet (97)</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B]">
            <a
              href={`${EXPLORER_BASE}/address/${
                ENV_VAULT_ADDRESS || "0xc9c3d3bcd2326702cfc5f7fb43d4c258e8d6969e"
              }`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono hover:text-brand underline"
            >
              OrgVault ↗
            </a>
            <a
              href={`${EXPLORER_BASE}/address/${
                ENV_TOKEN_ADDRESS || "0x789b107ef8efe2a5b0c48906a278622f5d98a3a6"
              }`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono hover:text-brand underline"
            >
              MockPHP ↗
            </a>
            <span>Testnet-only</span>
          </div>
        </div>
      </footer>

      <Link
        href="/submit"
        aria-label="OrgVault AI Assistant"
        className="fixed bottom-4 right-4 z-40 rounded-2xl bg-white/95 backdrop-blur border border-[#E2E8F0] p-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
      >
        <img
          src="/mascot.png"
          alt="OrgVault Mascot"
          className="w-11 h-11 sm:w-12 sm:h-12 object-contain"
        />
      </Link>

      {showGoogleModal && renderGoogleModal()}
    </div>
  );

  function renderGoogleModal() {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]"
        onClick={() => setShowGoogleModal(false)}
      >
        <div
          className="bg-white rounded-2xl border border-[#E2E8F0] max-w-sm w-full shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 pt-6 pb-4 text-center border-b border-[#E2E8F0]">
            <div className="w-10 h-10 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center mx-auto mb-3">
              <GoogleGIcon />
            </div>
            <h3 className="text-base font-semibold">Choose an account</h3>
            <p className="text-xs text-[#64748B] mt-0.5">to continue to OrgVault</p>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            <button
              type="button"
              onClick={() =>
                handleSelectGoogleAccount(
                  "alex.santos@umak.edu.ph",
                  "Alex Santos",
                  "new"
                )
              }
              className="w-full px-6 py-3.5 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-brand-light text-brand font-semibold text-xs flex items-center justify-center shrink-0">
                  AS
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">Alex Santos</div>
                  <div className="text-xs text-[#64748B] truncate">
                    alex.santos@umak.edu.ph
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-medium text-[#64748B]">
                New User
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleSelectGoogleAccount(
                  "maria.reyes@cs-society.edu.ph",
                  "Maria Reyes",
                  "existing"
                )
              }
              className="w-full px-6 py-3.5 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[#ECFDF5] text-[#10B981] font-semibold text-xs flex items-center justify-center shrink-0">
                  MR
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">Maria Reyes</div>
                  <div className="text-xs text-[#64748B] truncate">
                    maria.reyes@cs-society.edu.ph
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-medium text-[#10B981]">
                Treasurer
              </span>
            </button>

            <div className="px-6 py-3.5">
              <button
                type="button"
                onClick={() => setShowCustomGoogle(!showCustomGoogle)}
                className="w-full flex items-center gap-3 text-left text-sm font-medium hover:text-brand transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-slate-100 text-[#64748B] flex items-center justify-center shrink-0">
                  +
                </div>
                <span>Use another account</span>
              </button>

              {showCustomGoogle && (
                <form
                  className="mt-3 space-y-2.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!customGoogleEmail.includes("@")) return;
                    handleSelectGoogleAccount(
                      customGoogleEmail.trim(),
                      customGoogleName.trim(),
                      "new"
                    );
                  }}
                >
                  <input
                    type="text"
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    placeholder="Your name (optional)"
                    className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] text-[13px] focus:outline-none focus:border-brand"
                  />
                  <input
                    type="email"
                    required
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    placeholder="name@university.edu.ph"
                    className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] text-[13px] focus:outline-none focus:border-brand"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 px-3 rounded-lg bg-brand hover:opacity-90 text-white text-xs font-semibold"
                  >
                    Continue
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="px-6 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end">
            <button
              type="button"
              onClick={() => setShowGoogleModal(false)}
              className="text-xs font-medium text-[#64748B] hover:text-[#0F172A] px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }
}

function GoogleGIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}
