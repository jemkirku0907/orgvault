import { existsSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const DUES_ORGANIZATIONS = [
  {
    orgName: "Computer Science Society",
    university: "University of Makati",
    defaultDuesPesos: 1,
  },
  {
    orgName: "Engineering Student Council",
    university: "University of the Philippines Diliman",
    defaultDuesPesos: 1,
  },
  {
    orgName: "Junior Philippine Institute of Accountants",
    university: "Polytechnic University of the Philippines",
    defaultDuesPesos: 1,
  },
  {
    orgName: "Association of Computing Machinery",
    university: "Ateneo De Manila University",
    defaultDuesPesos: 1,
  },
] as const;

export const DUES_PERIODS = [
  "1st Semester AY 2026-2027",
  "2nd Semester AY 2026-2027",
  "Annual Membership 2026-2027",
] as const;

export interface DuesPaymentRecord {
  id: string;
  displayName: string;
  orgName: string;
  university: string;
  period: string;
  amountPesos: number;
  date: string;
  walletAddress: string;
  txHash: string;
  explorerUrl: string;
  chainMode: "bscTestnet" | "simulated";
  createdAt: string;
}

export interface RosterMember {
  id: string;
  displayName: string;
  orgName: string;
  role: string;
  walletAddress?: string;
}

export interface TreasurerMemberStatus {
  id: string;
  displayName: string;
  orgName: string;
  role: string;
  walletAddress?: string;
  status: "Paid" | "Unpaid";
  amountPesos: number;
  date?: string;
  txHash?: string;
  explorerUrl?: string;
}

const STORE_FILE = path.join(os.tmpdir(), "orgvault-dues-v1.json");

const INITIAL_PAYMENTS: DuesPaymentRecord[] = [
  {
    id: "DUES-1001",
    displayName: "Maria_CS_Treas",
    orgName: "Computer Science Society",
    university: "University of Makati",
    period: "1st Semester AY 2026-2027",
    amountPesos: 1,
    date: "2026-11-12",
    walletAddress: "0xb828829a513f7bf70febe260b2cbf04d16bba151",
    txHash:
      "0x8a4f2c9d1e7b3a5f6c0d8e2b4a6f9c1d3e5b7a9f0c2d4e6b8a0c1e3f5a7b9d1e",
    explorerUrl:
      "https://testnet.bscscan.com/address/0xc9c3d3bcd2326702cfc5f7fb43d4c258e8d6969e",
    chainMode: "bscTestnet",
    createdAt: "2026-11-12T08:00:00.000Z",
  },
  {
    id: "DUES-1002",
    displayName: "SecretaryMika",
    orgName: "Computer Science Society",
    university: "University of Makati",
    period: "1st Semester AY 2026-2027",
    amountPesos: 1,
    date: "2026-11-12",
    walletAddress: "0x71C95911E9a5D330f4D621842EC243EE1343292e",
    txHash:
      "0x5c3b1a9f7e5d3c1b9a7f5e3d1c9b7a5f3e1d9c7b5a3f1e9d7c5b3a1f9e7d5c3b",
    explorerUrl:
      "https://testnet.bscscan.com/address/0xc9c3d3bcd2326702cfc5f7fb43d4c258e8d6969e",
    chainMode: "bscTestnet",
    createdAt: "2026-11-12T11:20:00.000Z",
  },
];

const INITIAL_ROSTER: RosterMember[] = [
  {
    id: "MEM-01",
    displayName: "Maria_CS_Treas",
    orgName: "Computer Science Society",
    role: "Treasurer",
    walletAddress: "0xb828829a513f7bf70febe260b2cbf04d16bba151",
  },
  {
    id: "MEM-02",
    displayName: "SecretaryMika",
    orgName: "Computer Science Society",
    role: "Secretary",
    walletAddress: "0x71C95911E9a5D330f4D621842EC243EE1343292e",
  },
  {
    id: "MEM-03",
    displayName: "TreasurerAlex",
    orgName: "Computer Science Society",
    role: "Member",
  },
  {
    id: "MEM-04",
    displayName: "AuditorKen",
    orgName: "Computer Science Society",
    role: "Auditor",
  },
  {
    id: "MEM-05",
    displayName: "DevLeadBea",
    orgName: "Computer Science Society",
    role: "Member",
  },
  {
    id: "MEM-06",
    displayName: "FreshmanGio",
    orgName: "Computer Science Society",
    role: "Member",
  },
  {
    id: "MEM-07",
    displayName: "EngPres_Rico",
    orgName: "Engineering Student Council",
    role: "President",
  },
  {
    id: "MEM-08",
    displayName: "CivilRep_Nina",
    orgName: "Engineering Student Council",
    role: "Member",
  },
  {
    id: "MEM-09",
    displayName: "JPIA_AuditorSam",
    orgName: "Junior Philippine Institute of Accountants",
    role: "Auditor",
  },
  {
    id: "MEM-10",
    displayName: "ACM_CoderLuis",
    orgName: "Association of Computing Machinery",
    role: "Member",
  },
];

interface PersistedDuesState {
  payments: DuesPaymentRecord[];
  roster: RosterMember[];
  extraVaultPesos: number;
}

const globalDues = globalThis as unknown as {
  __orgvaultDuesState?: PersistedDuesState;
};

function loadState(): PersistedDuesState {
  if (globalDues.__orgvaultDuesState) {
    return globalDues.__orgvaultDuesState;
  }

  try {
    if (existsSync(STORE_FILE)) {
      const parsed = JSON.parse(readFileSync(STORE_FILE, "utf8")) as PersistedDuesState;
      if (parsed && Array.isArray(parsed.payments) && Array.isArray(parsed.roster)) {
        globalDues.__orgvaultDuesState = parsed;
        return parsed;
      }
    }
  } catch {
    // fallback to default seed
  }

  const seeded: PersistedDuesState = {
    payments: [...INITIAL_PAYMENTS],
    roster: [...INITIAL_ROSTER],
    extraVaultPesos: 0,
  };
  globalDues.__orgvaultDuesState = seeded;
  return seeded;
}

function saveState(state: PersistedDuesState) {
  globalDues.__orgvaultDuesState = state;
  try {
    writeFileSync(STORE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // ignore read-only fs errors
  }
}

export function listDuesPayments(orgName?: string, period?: string): DuesPaymentRecord[] {
  const { payments } = loadState();
  return payments
    .filter((p) => {
      if (orgName && p.orgName.toLowerCase() !== orgName.trim().toLowerCase()) {
        return false;
      }
      if (period && p.period.toLowerCase() !== period.trim().toLowerCase()) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getExtraVaultDuesPesos(): number {
  return loadState().extraVaultPesos || 0;
}

export function findDuplicateDuesPayment(params: {
  orgName: string;
  period: string;
  displayName: string;
  walletAddress?: string;
}): DuesPaymentRecord | undefined {
  const { payments } = loadState();
  const normOrg = params.orgName.trim().toLowerCase();
  const normPeriod = params.period.trim().toLowerCase();
  const normName = params.displayName.trim().toLowerCase();
  const normWallet = params.walletAddress?.trim().toLowerCase();

  return payments.find((p) => {
    if (
      p.orgName.trim().toLowerCase() !== normOrg ||
      p.period.trim().toLowerCase() !== normPeriod
    ) {
      return false;
    }
    if (normName && p.displayName.trim().toLowerCase() === normName) {
      return true;
    }
    if (
      normWallet &&
      normWallet.startsWith("0x") &&
      p.walletAddress.trim().toLowerCase() === normWallet
    ) {
      return true;
    }
    return false;
  });
}

export function recordDuesPayment(input: {
  displayName: string;
  orgName: string;
  university: string;
  period: string;
  amountPesos: number;
  date?: string;
  walletAddress: string;
  txHash: string;
  explorerUrl: string;
  chainMode: "bscTestnet" | "simulated";
  role?: string;
}): DuesPaymentRecord {
  const state = loadState();
  const now = new Date();
  const dateStr = input.date || now.toISOString().slice(0, 10);
  const nextId = `DUES-${1001 + state.payments.length}`;

  const created: DuesPaymentRecord = {
    id: nextId,
    displayName: input.displayName.trim(),
    orgName: input.orgName.trim(),
    university: input.university.trim() || "University of Makati",
    period: input.period.trim(),
    amountPesos: input.amountPesos,
    date: dateStr,
    walletAddress: input.walletAddress.trim(),
    txHash: input.txHash,
    explorerUrl: input.explorerUrl,
    chainMode: input.chainMode,
    createdAt: now.toISOString(),
  };

  // Ensure member is in the organization's roster
  const existsInRoster = state.roster.some(
    (m) =>
      m.orgName.toLowerCase() === created.orgName.toLowerCase() &&
      m.displayName.toLowerCase() === created.displayName.toLowerCase()
  );

  const updatedRoster = existsInRoster
    ? state.roster.map((m) =>
        m.orgName.toLowerCase() === created.orgName.toLowerCase() &&
        m.displayName.toLowerCase() === created.displayName.toLowerCase()
          ? { ...m, walletAddress: created.walletAddress || m.walletAddress }
          : m
      )
    : [
        ...state.roster,
        {
          id: `MEM-${String(state.roster.length + 1).padStart(2, "0")}`,
          displayName: created.displayName,
          orgName: created.orgName,
          role: input.role || "Member",
          walletAddress: created.walletAddress,
        },
      ];

  saveState({
    payments: [created, ...state.payments],
    roster: updatedRoster,
    extraVaultPesos:
      (state.extraVaultPesos || 0) +
      (input.chainMode === "simulated" ? input.amountPesos : 0),
  });

  return created;
}

export function addRosterMember(input: {
  displayName: string;
  orgName: string;
  role?: string;
  walletAddress?: string;
}): RosterMember {
  const state = loadState();
  const existing = state.roster.find(
    (m) =>
      m.orgName.toLowerCase() === input.orgName.trim().toLowerCase() &&
      m.displayName.toLowerCase() === input.displayName.trim().toLowerCase()
  );
  if (existing) return existing;

  const created: RosterMember = {
    id: `MEM-${String(state.roster.length + 1).padStart(2, "0")}`,
    displayName: input.displayName.trim(),
    orgName: input.orgName.trim(),
    role: input.role?.trim() || "Member",
    walletAddress: input.walletAddress?.trim() || undefined,
  };

  saveState({
    ...state,
    roster: [...state.roster, created],
  });
  return created;
}

export function getTreasurerMemberStatuses(
  orgName: string,
  period: string,
  defaultDuesPesos = 1
): TreasurerMemberStatus[] {
  const state = loadState();
  const normOrg = orgName.trim().toLowerCase();
  const normPeriod = period.trim().toLowerCase();

  const orgPayments = state.payments.filter(
    (p) =>
      p.orgName.trim().toLowerCase() === normOrg &&
      p.period.trim().toLowerCase() === normPeriod
  );

  const orgRoster = state.roster.filter(
    (m) => m.orgName.trim().toLowerCase() === normOrg
  );

  // Merge roster + any ad-hoc payers for this org
  const combinedNames = new Map<string, RosterMember>();
  for (const m of orgRoster) {
    combinedNames.set(m.displayName.toLowerCase(), m);
  }
  for (const p of orgPayments) {
    const key = p.displayName.toLowerCase();
    if (!combinedNames.has(key)) {
      combinedNames.set(key, {
        id: `MEM-${p.id}`,
        displayName: p.displayName,
        orgName: p.orgName,
        role: "Member",
        walletAddress: p.walletAddress,
      });
    }
  }

  return Array.from(combinedNames.values()).map((member) => {
    const payment = orgPayments.find(
      (p) =>
        p.displayName.toLowerCase() === member.displayName.toLowerCase() ||
        (member.walletAddress &&
          p.walletAddress.toLowerCase() === member.walletAddress.toLowerCase())
    );

    if (payment) {
      return {
        id: member.id,
        displayName: member.displayName,
        orgName: member.orgName,
        role: member.role,
        walletAddress: payment.walletAddress || member.walletAddress,
        status: "Paid",
        amountPesos: payment.amountPesos,
        date: payment.date,
        txHash: payment.txHash,
        explorerUrl: payment.explorerUrl,
      };
    }

    return {
      id: member.id,
      displayName: member.displayName,
      orgName: member.orgName,
      role: member.role,
      walletAddress: member.walletAddress,
      status: "Unpaid",
      amountPesos: defaultDuesPesos,
    };
  });
}
