import { NextResponse } from "next/server";
import { keccak256, stringToBytes } from "viem";
import { z } from "zod";
import { EXPLORER_BASE } from "@/lib/contracts";
import { resolveDeploymentAddresses } from "@/lib/chain/vault";
import {
  addRosterMember,
  DUES_ORGANIZATIONS,
  DUES_PERIODS,
  findDuplicateDuesPayment,
  getTreasurerMemberStatuses,
  listDuesPayments,
  recordDuesPayment,
} from "@/lib/dues/store";

export const dynamic = "force-dynamic";

const PayDuesSchema = z.object({
  displayName: z
    .string()
    .min(1, "Member display name is required")
    .max(60, "Display name is too long"),
  orgName: z.string().min(1, "Organization is required"),
  university: z.string().default("University of Makati"),
  period: z.string().min(1, "Dues period is required"),
  amountPesos: z.number().positive("Dues amount must be greater than ₱0"),
  date: z.string().optional(),
  walletAddress: z.string().min(1, "Wallet address is required"),
  txHash: z.string().optional(),
  role: z.string().optional(),
});

const AddMemberSchema = z.object({
  action: z.literal("add_member"),
  displayName: z.string().min(1, "Member display name is required"),
  orgName: z.string().min(1, "Organization is required"),
  role: z.string().optional(),
  walletAddress: z.string().optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orgName = searchParams.get("orgName") || "Computer Science Society";
  const period = searchParams.get("period") || DUES_PERIODS[0];

  const payments = listDuesPayments(orgName, period);
  const allPayments = listDuesPayments();
  const members = getTreasurerMemberStatuses(orgName, period, 1);

  return NextResponse.json({
    orgName,
    period,
    organizations: DUES_ORGANIZATIONS,
    periods: DUES_PERIODS,
    payments,
    allPayments,
    members,
  });
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();

    if (raw?.action === "add_member") {
      const parsedMember = AddMemberSchema.safeParse(raw);
      if (!parsedMember.success) {
        return NextResponse.json(
          { error: parsedMember.error.issues.map((i) => i.message).join("; ") },
          { status: 400 }
        );
      }
      const member = addRosterMember(parsedMember.data);
      return NextResponse.json({ ok: true, member }, { status: 201 });
    }

    const parsed = PayDuesSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Enforce duplicate payment blocking for the same organization + dues period
    const duplicate = findDuplicateDuesPayment({
      orgName: data.orgName,
      period: data.period,
      displayName: data.displayName,
      walletAddress: data.walletAddress,
    });

    if (duplicate) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "DuplicateDuesPayment",
          error: `Duplicate payment blocked: ${data.displayName} has already paid dues for ${data.period} in ${data.orgName}.`,
          existingPayment: duplicate,
        },
        { status: 409 }
      );
    }

    const { orgVaultAddress } = resolveDeploymentAddresses();
    const isRealTx = Boolean(data.txHash && /^0x[a-fA-F0-9]{64}$/.test(data.txHash));
    const txHash = isRealTx
      ? data.txHash!
      : keccak256(
          stringToBytes(
            `dues:${data.orgName}:${data.period}:${data.displayName}:${data.walletAddress}:${Date.now()}`
          )
        );

    const explorerUrl = isRealTx
      ? `${EXPLORER_BASE}/tx/${txHash}`
      : orgVaultAddress
      ? `${EXPLORER_BASE}/address/${orgVaultAddress}`
      : `${EXPLORER_BASE}/tx/${txHash}`;

    const payment = recordDuesPayment({
      displayName: data.displayName,
      orgName: data.orgName,
      university: data.university,
      period: data.period,
      amountPesos: data.amountPesos,
      date: data.date,
      walletAddress: data.walletAddress,
      txHash,
      explorerUrl,
      chainMode: isRealTx ? "bscTestnet" : "simulated",
      role: data.role,
    });

    const members = getTreasurerMemberStatuses(data.orgName, data.period, 1);

    return NextResponse.json(
      {
        ok: true,
        payment,
        members,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to process dues payment",
      },
      { status: 500 }
    );
  }
}
