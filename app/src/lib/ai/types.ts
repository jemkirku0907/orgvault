import { z } from "zod";
import { CATEGORIES } from "@/lib/contracts";

export const ProposeExpenseInputSchema = z.object({
  recipientLabel: z.string().min(1, "Recipient label is required"),
  kind: z.union([z.literal(0), z.literal(1)]),
  amountPesos: z.number().positive("Amount must be greater than zero"),
  category: z.enum(CATEGORIES),
  memo: z.string().max(160).default(""),
});

export type ProposeExpenseInput = z.infer<typeof ProposeExpenseInputSchema>;

export const CheckBudgetInputSchema = z.object({
  category: z.enum(CATEGORIES),
});

export const ExtractedReceiptSchema = z.object({
  vendor: z.string().min(1),
  totalPesos: z.number().nonnegative(),
  date: z.string().default(""),
  category: z.string().default("Food"),
});

export type ExtractedReceipt = z.infer<typeof ExtractedReceiptSchema>;

export interface AgentStepLog {
  step: number;
  type: "tool_call" | "tool_result" | "decision" | "chain_sim" | "chain_tx";
  name: string;
  detail: string;
}

export interface AgentSubmitResponse {
  status:
    | "executed"
    | "needs_confirmation"
    | "needs_review"
    | "blocked"
    | "forced_failed_tx";
  explanation: string;
  aiMode: "gemini" | "mock";
  chainMode: "bscTestnet" | "simulated";
  receiptHash: `0x${string}`;
  extracted?: ExtractedReceipt;
  proposed?: ProposeExpenseInput & { recipientAddress: `0x${string}` };
  attestorAddress?: `0x${string}`;
  signature?: `0x${string}`;
  txHash?: `0x${string}`;
  explorerUrl?: string;
  steps: AgentStepLog[];
}
