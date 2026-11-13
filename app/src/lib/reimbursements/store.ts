import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type PayoutMethod =
  | "direct_deposit"
  | "digital_wallet"
  | "qr_transfer"
  | "bsc_wallet";

export type ClaimStatus = "Pending" | "Approved" | "Rejected" | "Paid";

export type ExpenseType = "Standard" | "Per Diem" | "Prorated";

export interface ReimbursementClaim {
  id: string;
  memberName: string;
  amount: number;
  category: "Food" | "Printing" | "Events";
  expenseType: ExpenseType;
  date: string;
  notes: string;
  receiptName: string;
  receiptHash: string;
  payoutMethod: PayoutMethod;
  payoutAccountLabel: string;
  qrImageDataUrl?: string;
  status: ClaimStatus;
  txHash?: string;
  explorerUrl?: string;
  createdAt: string;
  updatedAt: string;
}

const STORE_FILE = path.join("/tmp", "orgvault-reimbursements.json");

const INITIAL_CLAIMS: ReimbursementClaim[] = [
  {
    id: "CLM-1042",
    memberName: "TreasurerAlex",
    amount: 420,
    category: "Food",
    expenseType: "Per Diem",
    date: "2026-11-12",
    notes: "Committee lunch allowance during hackathon setup",
    receiptName: "canteen-lunch-1042.jpg",
    receiptHash:
      "0x6b2e91f380d7e231c9c6b4d2a1f83a9e2b7c5d4e3f1a0b9c8d7e6f5a4b3c2d1e",
    payoutMethod: "bsc_wallet",
    payoutAccountLabel: "0xb828829a513F7bf70fEBE260B2CbF04D16BBa151",
    status: "Approved",
    createdAt: "2026-11-12T09:30:00.000Z",
    updatedAt: "2026-11-12T10:15:00.000Z",
  },
  {
    id: "CLM-1043",
    memberName: "SecretaryMika",
    amount: 250,
    category: "Printing",
    expenseType: "Standard",
    date: "2026-11-13",
    notes: "Event tarpaulin and registration flyers",
    receiptName: "printshop-or-882.png",
    receiptHash:
      "0x9a1c3e5f7b9d0123456789abcdef0123456789abcdef0123456789abcdef0123",
    payoutMethod: "qr_transfer",
    payoutAccountLabel: "GCash QR · Mika S. (0917-***-4821)",
    status: "Pending",
    createdAt: "2026-11-13T03:45:00.000Z",
    updatedAt: "2026-11-13T03:45:00.000Z",
  },
];

const globalStore = globalThis as unknown as {
  __orgvaultReimbursements?: ReimbursementClaim[];
};

function loadClaims(): ReimbursementClaim[] {
  if (globalStore.__orgvaultReimbursements) {
    return globalStore.__orgvaultReimbursements;
  }

  try {
    if (existsSync(STORE_FILE)) {
      const parsed = JSON.parse(readFileSync(STORE_FILE, "utf8"));
      if (Array.isArray(parsed)) {
        globalStore.__orgvaultReimbursements = parsed;
        return parsed;
      }
    }
  } catch {
    // Fallback to initial seed
  }

  const seeded = [...INITIAL_CLAIMS];
  globalStore.__orgvaultReimbursements = seeded;
  return seeded;
}

function saveClaims(claims: ReimbursementClaim[]) {
  globalStore.__orgvaultReimbursements = claims;
  try {
    writeFileSync(STORE_FILE, JSON.stringify(claims, null, 2), "utf8");
  } catch {
    // Ignore read-only filesystem edge cases
  }
}

export function listReimbursements(): ReimbursementClaim[] {
  return [...loadClaims()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export function createReimbursement(
  claim: Omit<ReimbursementClaim, "id" | "status" | "createdAt" | "updatedAt">
): ReimbursementClaim {
  const claims = loadClaims();
  const now = new Date().toISOString();
  const nextId = `CLM-${1044 + claims.length}`;
  const created: ReimbursementClaim = {
    ...claim,
    id: nextId,
    status: "Pending",
    createdAt: now,
    updatedAt: now,
  };
  saveClaims([created, ...claims]);
  return created;
}

export function updateReimbursementStatus(params: {
  id: string;
  status: ClaimStatus;
  txHash?: string;
  explorerUrl?: string;
}): ReimbursementClaim | null {
  const claims = loadClaims();
  const idx = claims.findIndex((c) => c.id === params.id);
  if (idx === -1) return null;

  const updated: ReimbursementClaim = {
    ...claims[idx],
    status: params.status,
    txHash: params.txHash ?? claims[idx].txHash,
    explorerUrl: params.explorerUrl ?? claims[idx].explorerUrl,
    updatedAt: new Date().toISOString(),
  };
  const next = [...claims];
  next[idx] = updated;
  saveClaims(next);
  return updated;
}
