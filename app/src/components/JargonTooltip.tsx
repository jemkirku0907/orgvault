"use client";

import { useEffect, useRef, useState } from "react";

export const JARGON_DEFINITIONS: Record<string, string> = {
  BSC: "A fast, low-fee blockchain network used to send your reimbursement directly to a compatible crypto wallet.",
  "QR Code Transfer":
    "Lets you upload or scan a payment QR code so admins can send funds straight to your bank or e-wallet.",
  "Direct Deposit":
    "Sends your reimbursement straight to your bank account using your account number and bank name.",
  "Digital Wallet":
    "Transfers your reimbursement directly to a mobile e-wallet app like GCash or Maya.",
  "Per Diem":
    "A fixed daily allowance covering meals or travel costs while on official org duty.",
  Prorated:
    "Adjusted fairly based on how many days or hours were actually used.",
  "Itemized Receipt":
    "A receipt listing each purchased item, quantity, and price instead of just one total.",
  "Cost Center":
    "The specific org budget category, such as Food or Events, charged for this expense.",
  "EIP-712":
    "A secure digital approval signature that proves the treasurer verified this payment before sending.",
  keccak256:
    "A unique digital fingerprint of your receipt used to block duplicate claims.",
  MockPHP:
    "A test Peso token on BSC Testnet where 1 token equals ₱1.00.",
};

export default function JargonTooltip({
  term,
  definition,
}: {
  term: string;
  definition?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  const text =
    definition ??
    JARGON_DEFINITIONS[term] ??
    "Plain-language help for this treasury term.";

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <span ref={containerRef} className="relative inline-flex items-center align-middle">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-label={`What is ${term}?`}
        aria-expanded={open}
        className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full border border-[#CBD5E1] bg-white hover:bg-brand-light hover:border-brand text-[10px] font-bold text-[#64748B] hover:text-brand transition-colors focus:outline-none focus:ring-2 focus:ring-brand/30"
      >
        ?
      </button>

      {open && (
        <span
          role="dialog"
          aria-label={`${term} explanation`}
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 max-w-[calc(100vw-2rem)] z-50 rounded-xl bg-[#0F172A] text-white p-3 shadow-xl text-left pointer-events-auto"
        >
          <span className="block text-[11px] font-semibold text-blue-300 mb-0.5">
            {term}
          </span>
          <span className="block text-[11px] leading-relaxed text-slate-100 font-normal">
            {text}
          </span>
        </span>
      )}
    </span>
  );
}
