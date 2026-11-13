import { NextResponse } from "next/server";
import { keccak256, stringToBytes } from "viem";
import { z } from "zod";
import {
  createReimbursement,
  listReimbursements,
  updateReimbursementStatus,
} from "@/lib/reimbursements/store";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  memberName: z.string().min(1, "Member name is required"),
  amount: z.number().positive("Amount must be greater than zero"),
  category: z.enum(["Food", "Printing", "Events"]),
  expenseType: z.enum(["Standard", "Per Diem", "Prorated"]).default("Standard"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().default(""),
  receiptName: z.string().min(1, "Receipt file or reference is required"),
  receiptHash: z.string().optional(),
  payoutMethod: z.enum([
    "direct_deposit",
    "digital_wallet",
    "qr_transfer",
    "bsc_wallet",
  ]),
  payoutAccountLabel: z.string().min(1, "Payout destination details are required"),
  qrImageDataUrl: z.string().optional(),
});

const PatchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["Pending", "Approved", "Rejected", "Paid"]),
  txHash: z.string().optional(),
  explorerUrl: z.string().optional(),
});

export async function GET() {
  return NextResponse.json({ claims: listReimbursements() });
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = CreateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const receiptHash =
      d.receiptHash && d.receiptHash.startsWith("0x")
        ? d.receiptHash
        : keccak256(
            stringToBytes(`${d.memberName}:${d.amount}:${d.date}:${d.receiptName}`)
          );

    const claim = createReimbursement({
      ...d,
      receiptHash,
    });
    return NextResponse.json({ claim }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create claim" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const raw = await req.json();
    const parsed = PatchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 }
      );
    }

    const updated = updateReimbursementStatus(parsed.data);
    if (!updated) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }
    return NextResponse.json({ claim: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update claim" },
      { status: 500 }
    );
  }
}
