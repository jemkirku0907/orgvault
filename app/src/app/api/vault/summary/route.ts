import { NextResponse } from "next/server";
import { getVaultSummary } from "@/lib/chain/vault";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = await getVaultSummary();
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to load vault summary",
      },
      { status: 500 }
    );
  }
}
