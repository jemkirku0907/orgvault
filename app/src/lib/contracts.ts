import { keccak256, toHex, type Address } from "viem";
import { bscTestnet } from "viem/chains";

export const CHAIN_ID = 97;
export const EXPLORER_BASE = "https://testnet.bscscan.com";
export const BSC_TESTNET_RPC =
  process.env.NEXT_PUBLIC_BSC_TESTNET_RPC ||
  process.env.BSC_TESTNET_RPC ||
  "https://bsc-testnet-rpc.publicnode.com";

export const orgVaultChain = {
  ...bscTestnet,
  rpcUrls: {
    default: { http: [BSC_TESTNET_RPC] },
    public: { http: [BSC_TESTNET_RPC] },
  },
};

export const CATEGORIES = ["Food", "Printing", "Events"] as const;
export type OrgCategory = (typeof CATEGORIES)[number];

export function categoryId(name: string): `0x${string}` {
  return keccak256(toHex(name));
}

export function duesPeriodId(orgName: string, period: string): `0x${string}` {
  return keccak256(toHex(`${orgName.trim()}:${period.trim()}`));
}

export const EXPENSE_EIP712_TYPES = {
  Expense: [
    { name: "recipient", type: "address" },
    { name: "kind", type: "uint8" },
    { name: "amount", type: "uint256" },
    { name: "category", type: "bytes32" },
    { name: "receiptHash", type: "bytes32" },
    { name: "memo", type: "string" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export function getEip712Domain(verifyingContract: Address) {
  return {
    name: "OrgVault",
    version: "1",
    chainId: CHAIN_ID,
    verifyingContract,
  } as const;
}

export function getContractAddresses(): {
  mockPhp?: Address;
  orgVault?: Address;
} {
  const mockPhp = process.env.NEXT_PUBLIC_MOCKPHP_ADDRESS as Address | undefined;
  const orgVault = process.env.NEXT_PUBLIC_ORGVAULT_ADDRESS as Address | undefined;
  return { mockPhp, orgVault };
}

export const MOCK_PHP_ABI = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const ORG_VAULT_ABI = [
  {
    type: "error",
    name: "ContractPaused",
    inputs: [],
  },
  {
    type: "error",
    name: "BadSignature",
    inputs: [],
  },
  {
    type: "error",
    name: "Expired",
    inputs: [],
  },
  {
    type: "error",
    name: "DuplicateReceipt",
    inputs: [],
  },
  {
    type: "error",
    name: "DuplicateDuesPayment",
    inputs: [
      { name: "periodId", type: "bytes32" },
      { name: "member", type: "address" },
    ],
  },
  {
    type: "error",
    name: "VendorNotApproved",
    inputs: [],
  },
  {
    type: "error",
    name: "OfficerNotRegistered",
    inputs: [],
  },
  {
    type: "error",
    name: "OverOfficerCap",
    inputs: [
      { name: "requested", type: "uint256" },
      { name: "remainingCap", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "InvalidKind",
    inputs: [],
  },
  {
    type: "error",
    name: "OverCategoryBudget",
    inputs: [
      { name: "category", type: "bytes32" },
      { name: "requested", type: "uint256" },
      { name: "remaining", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "InsufficientVault",
    inputs: [
      { name: "requested", type: "uint256" },
      { name: "available", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "ZeroAmount",
    inputs: [],
  },
  {
    type: "event",
    name: "DuesPaid",
    inputs: [
      { name: "member", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "DuesPaidForPeriod",
    inputs: [
      { name: "member", type: "address", indexed: true },
      { name: "periodId", type: "bytes32", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ExpensePaid",
    inputs: [
      { name: "kind", type: "uint8", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "category", type: "bytes32", indexed: true },
      { name: "receiptHash", type: "bytes32", indexed: false },
      { name: "memo", type: "string", indexed: false },
      { name: "spentInCategory", type: "uint256", indexed: false },
    ],
  },
  {
    type: "function",
    name: "payDues",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "payDuesForPeriod",
    stateMutability: "nonpayable",
    inputs: [
      { name: "periodId", type: "bytes32" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "hasPaidDuesForPeriod",
    stateMutability: "view",
    inputs: [
      { name: "periodId", type: "bytes32" },
      { name: "member", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "executeExpense",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "e",
        type: "tuple",
        components: [
          { name: "recipient", type: "address" },
          { name: "kind", type: "uint8" },
          { name: "amount", type: "uint256" },
          { name: "category", type: "bytes32" },
          { name: "receiptHash", type: "bytes32" },
          { name: "memo", type: "string" },
          { name: "deadline", type: "uint256" },
        ],
      },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setBudget",
    stateMutability: "nonpayable",
    inputs: [
      { name: "category", type: "bytes32" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setVendor",
    stateMutability: "nonpayable",
    inputs: [
      { name: "vendor", type: "address" },
      { name: "label", type: "string" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setOfficer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "officer", type: "address" },
      { name: "label", type: "string" },
      { name: "cap", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setAttestor",
    stateMutability: "nonpayable",
    inputs: [{ name: "newAttestor", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "pause",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "unpause",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getBudget",
    stateMutability: "view",
    inputs: [{ name: "category", type: "bytes32" }],
    outputs: [
      { name: "limit", type: "uint256" },
      { name: "spent", type: "uint256" },
      { name: "remaining", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "vaultBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getVendors",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "addr", type: "address" },
          { name: "label", type: "string" },
          { name: "approved", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getOfficers",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "addr", type: "address" },
          { name: "label", type: "string" },
          { name: "cap", type: "uint256" },
          { name: "reimbursed", type: "uint256" },
          { name: "registered", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "usedReceipts",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "paused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "attestor",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;
