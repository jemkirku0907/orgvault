import { BaseError, ContractFunctionRevertedError, formatEther } from "viem";

export function formatPesos(amount: number): string {
  return `₱${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function decodeVaultError(
  err: unknown,
  context?: { categoryName?: string }
): { code: string; message: string } {
  const catLabel = context?.categoryName || "category";

  if (err instanceof BaseError) {
    const revertError = err.walk(
      (e) => e instanceof ContractFunctionRevertedError
    );
    if (revertError instanceof ContractFunctionRevertedError) {
      const errorName = revertError.data?.errorName ?? "";
      const args = (revertError.data?.args ?? []) as unknown[];

      switch (errorName) {
        case "OverCategoryBudget": {
          const requested = Number(formatEther((args[1] as bigint) ?? 0n));
          const remaining = Number(formatEther((args[2] as bigint) ?? 0n));
          const excess = Math.max(0, requested - remaining);
          return {
            code: "OverCategoryBudget",
            message: `Over the ${catLabel} budget by ${formatPesos(excess)} (requested ${formatPesos(requested)}, remaining ${formatPesos(remaining)}).`,
          };
        }
        case "DuplicateReceipt":
          return {
            code: "DuplicateReceipt",
            message:
              "Duplicate receipt blocked: this exact receipt was already paid once.",
          };
        case "VendorNotApproved":
          return {
            code: "VendorNotApproved",
            message:
              "Vendor not approved: only pre-approved vendors can receive direct payments.",
          };
        case "OfficerNotRegistered":
          return {
            code: "OfficerNotRegistered",
            message:
              "Officer not registered: only registered officers can claim reimbursements.",
          };
        case "OverOfficerCap": {
          const requested = Number(formatEther((args[0] as bigint) ?? 0n));
          const remainingCap = Number(formatEther((args[1] as bigint) ?? 0n));
          const excess = Math.max(0, requested - remainingCap);
          return {
            code: "OverOfficerCap",
            message: `Over officer reimbursement cap by ${formatPesos(excess)} (remaining cap ${formatPesos(remainingCap)}).`,
          };
        }
        case "InsufficientVault": {
          const requested = Number(formatEther((args[0] as bigint) ?? 0n));
          const available = Number(formatEther((args[1] as bigint) ?? 0n));
          return {
            code: "InsufficientVault",
            message: `Insufficient vault funds: requested ${formatPesos(requested)}, available ${formatPesos(available)}.`,
          };
        }
        case "ContractPaused":
          return {
            code: "ContractPaused",
            message: "Vault is currently paused by the organization owner.",
          };
        case "BadSignature":
          return {
            code: "BadSignature",
            message: "Invalid EIP-712 attestor signature.",
          };
        case "Expired":
          return {
            code: "Expired",
            message: "Expense attestation expired before submission.",
          };
        case "ZeroAmount":
          return {
            code: "ZeroAmount",
            message: "Amount must be greater than ₱0.00.",
          };
        case "InvalidKind":
          return {
            code: "InvalidKind",
            message: "Invalid expense kind (must be vendor payment or reimbursement).",
          };
        default:
          if (errorName) {
            return {
              code: errorName,
              message: `Contract rejected transaction (${errorName}).`,
            };
          }
      }
    }
  }

  const msg = err instanceof Error ? err.message : String(err);
  return {
    code: "UnknownError",
    message: msg.slice(0, 240),
  };
}
