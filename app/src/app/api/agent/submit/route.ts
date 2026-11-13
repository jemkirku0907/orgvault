import { NextResponse } from "next/server";
import { keccak256, stringToBytes } from "viem";
import { z } from "zod";
import { runOrgVaultAgent } from "@/lib/ai/adapter";

const JsonBodySchema = z.object({
  requestText: z.string().min(1, "Request description is required"),
  kind: z.union([z.literal(0), z.literal(1)]).default(0),
  receiptText: z.string().optional(),
  imageBase64: z.string().optional(),
  imageMimeType: z.string().optional(),
  confirmed: z.boolean().optional(),
  forceSendAnyway: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let requestText = "";
    let kind: 0 | 1 = 0;
    let receiptText: string | undefined;
    let imageBase64: string | undefined;
    let imageMimeType: string | undefined;
    let confirmed = false;
    let forceSendAnyway = false;
    let receiptHash: `0x${string}`;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      requestText = String(form.get("requestText") || "").trim();
      kind = Number(form.get("kind") || 0) === 1 ? 1 : 0;
      receiptText = form.get("receiptText")
        ? String(form.get("receiptText"))
        : undefined;
      confirmed = String(form.get("confirmed") || "false") === "true";
      forceSendAnyway =
        String(form.get("forceSendAnyway") || "false") === "true";

      const file = form.get("receipt");
      if (file && file instanceof File && file.size > 0) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        receiptHash = keccak256(bytes);
        imageBase64 = Buffer.from(bytes).toString("base64");
        imageMimeType = file.type || "image/png";
      } else if (receiptText && receiptText.trim()) {
        const normalized = receiptText.trim().replace(/\r\n/g, "\n");
        receiptHash = keccak256(stringToBytes(normalized));
      } else {
        return NextResponse.json(
          { error: "Upload a receipt file or paste receipt text." },
          { status: 400 }
        );
      }
    } else {
      const raw = await req.json();
      const parsed = JsonBodySchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues.map((i) => i.message).join("; ") },
          { status: 400 }
        );
      }
      requestText = parsed.data.requestText;
      kind = parsed.data.kind;
      receiptText = parsed.data.receiptText;
      imageBase64 = parsed.data.imageBase64;
      imageMimeType = parsed.data.imageMimeType;
      confirmed = Boolean(parsed.data.confirmed);
      forceSendAnyway = Boolean(parsed.data.forceSendAnyway);

      if (imageBase64) {
        const bytes = Buffer.from(imageBase64, "base64");
        receiptHash = keccak256(new Uint8Array(bytes));
      } else if (receiptText && receiptText.trim()) {
        const normalized = receiptText.trim().replace(/\r\n/g, "\n");
        receiptHash = keccak256(stringToBytes(normalized));
      } else {
        return NextResponse.json(
          { error: "Provide receiptText or imageBase64." },
          { status: 400 }
        );
      }
    }

    if (!requestText) {
      return NextResponse.json(
        { error: "Request text is required." },
        { status: 400 }
      );
    }

    const result = await runOrgVaultAgent({
      receiptHash,
      requestText,
      kind,
      receiptText,
      imageBase64,
      imageMimeType,
      confirmed,
      forceSendAnyway,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unexpected server error",
      },
      { status: 500 }
    );
  }
}
