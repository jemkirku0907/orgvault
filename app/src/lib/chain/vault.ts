import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  parseEther,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  CATEGORIES,
  categoryId,
  EXPENSE_EIP712_TYPES,
  EXPLORER_BASE,
  getEip712Domain,
  ORG_VAULT_ABI,
  orgVaultChain,
} from "@/lib/contracts";
import { decodeVaultError, formatPesos } from "./errors";

export interface BudgetView {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
}

export interface VendorView {
  address: Address;
  label: string;
  approved: boolean;
}

export interface OfficerView {
  address: Address;
  label: string;
  cap: number;
  reimbursed: number;
  remainingCap: number;
  registered: boolean;
}

export interface VaultSummary {
  chainMode: "bscTestnet" | "simulated";
  orgVaultAddress?: Address;
  mockPhpAddress?: Address;
  vaultBalance: number;
  paused: boolean;
  attestor?: Address;
  owner?: Address;
  budgets: BudgetView[];
  vendors: VendorView[];
  officers: OfficerView[];
}

// Simulated fallback state used only when BSC Testnet deployment/keys are not configured yet
const simState = {
  vaultBalance: 3500,
  paused: false,
  budgets: new Map<string, { limit: number; spent: number }>([
    ["Food", { limit: 1000, spent: 0 }],
    ["Printing", { limit: 500, spent: 0 }],
    ["Events", { limit: 2000, spent: 0 }],
  ]),
  vendors: [
    {
      address: "0x1111111111111111111111111111111111111111" as Address,
      label: "Canteen",
      approved: true,
    },
    {
      address: "0x2222222222222222222222222222222222222222" as Address,
      label: "PrintShop",
      approved: true,
    },
    {
      address: "0x3333333333333333333333333333333333333333" as Address,
      label: "UnapprovedVendor",
      approved: false,
    },
  ] satisfies VendorView[],
  officers: [
    {
      address: "0x4444444444444444444444444444444444444444" as Address,
      label: "TreasurerAlex",
      cap: 1500,
      reimbursed: 0,
      remainingCap: 1500,
      registered: true,
    },
  ] satisfies OfficerView[],
  usedReceipts: new Set<string>(),
};

export function resolveDeploymentAddresses(): {
  orgVaultAddress?: Address;
  mockPhpAddress?: Address;
} {
  const envVault = process.env.NEXT_PUBLIC_ORGVAULT_ADDRESS as Address | undefined;
  const envPhp = process.env.NEXT_PUBLIC_MOCKPHP_ADDRESS as Address | undefined;
  if (envVault && envPhp) {
    return { orgVaultAddress: envVault, mockPhpAddress: envPhp };
  }

  try {
    const depPath = path.resolve(process.cwd(), "..", "deployments", "bscTestnet.json");
    if (existsSync(depPath)) {
      const dep = JSON.parse(readFileSync(depPath, "utf8"));
      return {
        orgVaultAddress: (envVault || dep.contracts?.OrgVault) as Address | undefined,
        mockPhpAddress: (envPhp || dep.contracts?.MockPHP) as Address | undefined,
      };
    }
  } catch {
    // Ignore missing deployment file
  }
  return { orgVaultAddress: envVault, mockPhpAddress: envPhp };
}

export function getPublicClient() {
  return createPublicClient({
    chain: orgVaultChain,
    transport: http(orgVaultChain.rpcUrls.default.http[0]),
  });
}

export async function getVaultSummary(): Promise<VaultSummary> {
  const { orgVaultAddress, mockPhpAddress } = resolveDeploymentAddresses();
  if (!orgVaultAddress) {
    return {
      chainMode: "simulated",
      vaultBalance: simState.vaultBalance,
      paused: simState.paused,
      budgets: CATEGORIES.map((c) => {
        const b = simState.budgets.get(c) ?? { limit: 0, spent: 0 };
        return {
          category: c,
          limit: b.limit,
          spent: b.spent,
          remaining: Math.max(0, b.limit - b.spent),
        };
      }),
      vendors: simState.vendors,
      officers: simState.officers,
    };
  }

  const client = getPublicClient();
  const [vaultBalRaw, paused, attestor, owner, rawVendors, rawOfficers, ...rawBudgets] =
    await Promise.all([
      client.readContract({
        address: orgVaultAddress,
        abi: ORG_VAULT_ABI,
        functionName: "vaultBalance",
      }),
      client.readContract({
        address: orgVaultAddress,
        abi: ORG_VAULT_ABI,
        functionName: "paused",
      }),
      client.readContract({
        address: orgVaultAddress,
        abi: ORG_VAULT_ABI,
        functionName: "attestor",
      }),
      client.readContract({
        address: orgVaultAddress,
        abi: ORG_VAULT_ABI,
        functionName: "owner",
      }),
      client.readContract({
        address: orgVaultAddress,
        abi: ORG_VAULT_ABI,
        functionName: "getVendors",
      }),
      client.readContract({
        address: orgVaultAddress,
        abi: ORG_VAULT_ABI,
        functionName: "getOfficers",
      }),
      ...CATEGORIES.map((c) =>
        client.readContract({
          address: orgVaultAddress,
          abi: ORG_VAULT_ABI,
          functionName: "getBudget",
          args: [categoryId(c)],
        })
      ),
    ]);

  const budgets: BudgetView[] = CATEGORIES.map((c, idx) => {
    const [limit, spent, remaining] = rawBudgets[idx] as [bigint, bigint, bigint];
    return {
      category: c,
      limit: Number(formatEther(limit)),
      spent: Number(formatEther(spent)),
      remaining: Number(formatEther(remaining)),
    };
  });

  return {
    chainMode: "bscTestnet",
    orgVaultAddress,
    mockPhpAddress,
    vaultBalance: Number(formatEther(vaultBalRaw)),
    paused,
    attestor,
    owner,
    budgets,
    vendors: rawVendors.map((v) => ({
      address: v.addr,
      label: v.label,
      approved: v.approved,
    })),
    officers: rawOfficers.map((o) => {
      const cap = Number(formatEther(o.cap));
      const reimbursed = Number(formatEther(o.reimbursed));
      return {
        address: o.addr,
        label: o.label,
        cap,
        reimbursed,
        remainingCap: Math.max(0, cap - reimbursed),
        registered: o.registered,
      };
    }),
  };
}

export async function signAndExecuteExpense(params: {
  recipient: Address;
  kind: 0 | 1;
  amountPesos: number;
  categoryName: string;
  receiptHash: `0x${string}`;
  memo: string;
  forceSendAnyway?: boolean;
}): Promise<{
  ok: boolean;
  chainMode: "bscTestnet" | "simulated";
  errorCode?: string;
  errorMessage?: string;
  attestorAddress?: Address;
  signature?: Hex;
  txHash?: Hex;
  explorerUrl?: string;
  forcedFailed?: boolean;
}> {
  const { orgVaultAddress } = resolveDeploymentAddresses();
  const attestorKey = process.env.ATTESTOR_PRIVATE_KEY as Hex | undefined;
  const relayerKey = process.env.RELAYER_PRIVATE_KEY as Hex | undefined;

  // Use real chain if contract + both keys are configured
  if (orgVaultAddress && attestorKey && relayerKey) {
    const publicClient = getPublicClient();
    const attestorAccount = privateKeyToAccount(attestorKey);
    const relayerAccount = privateKeyToAccount(relayerKey);
    const relayerClient = createWalletClient({
      account: relayerAccount,
      chain: orgVaultChain,
      transport: http(orgVaultChain.rpcUrls.default.http[0]),
    });

    const amountWei = parseEther(String(params.amountPesos));
    const catHash = categoryId(params.categoryName);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600); // +10 min

    const expense = {
      recipient: params.recipient,
      kind: params.kind,
      amount: amountWei,
      category: catHash,
      receiptHash: params.receiptHash,
      memo: params.memo,
      deadline,
    };

    const signature = await attestorAccount.signTypedData({
      domain: getEip712Domain(orgVaultAddress),
      types: EXPENSE_EIP712_TYPES,
      primaryType: "Expense",
      message: expense,
    });

    try {
      await publicClient.simulateContract({
        address: orgVaultAddress,
        abi: ORG_VAULT_ABI,
        functionName: "executeExpense",
        args: [expense, signature],
        account: relayerAccount.address,
      });
    } catch (simErr) {
      const decoded = decodeVaultError(simErr, {
        categoryName: params.categoryName,
      });

      if (!params.forceSendAnyway) {
        return {
          ok: false,
          chainMode: "bscTestnet",
          errorCode: decoded.code,
          errorMessage: decoded.message,
          attestorAddress: attestorAccount.address,
          signature,
        };
      }

      // Demo-only "send anyway": broadcast with manual gas limit so revert appears on BscScan
      const txHash = await relayerClient.writeContract({
        address: orgVaultAddress,
        abi: ORG_VAULT_ABI,
        functionName: "executeExpense",
        args: [expense, signature],
        gas: 300_000n,
      });
      return {
        ok: false,
        chainMode: "bscTestnet",
        forcedFailed: true,
        errorCode: decoded.code,
        errorMessage: `${decoded.message} (Forced tx sent to show on-chain revert.)`,
        attestorAddress: attestorAccount.address,
        signature,
        txHash,
        explorerUrl: `${EXPLORER_BASE}/tx/${txHash}`,
      };
    }

    const txHash = await relayerClient.writeContract({
      address: orgVaultAddress,
      abi: ORG_VAULT_ABI,
      functionName: "executeExpense",
      args: [expense, signature],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return {
      ok: true,
      chainMode: "bscTestnet",
      attestorAddress: attestorAccount.address,
      signature,
      txHash,
      explorerUrl: `${EXPLORER_BASE}/tx/${txHash}`,
    };
  }

  // Simulated fallback (no chain keys configured yet)
  if (simState.paused) {
    return {
      ok: false,
      chainMode: "simulated",
      errorCode: "ContractPaused",
      errorMessage: "Vault is currently paused by the organization owner.",
    };
  }

  if (simState.usedReceipts.has(params.receiptHash.toLowerCase())) {
    return {
      ok: false,
      chainMode: "simulated",
      errorCode: "DuplicateReceipt",
      errorMessage:
        "Duplicate receipt blocked: this exact receipt was already paid once.",
    };
  }

  if (params.kind === 0) {
    const v = simState.vendors.find(
      (item) => item.address.toLowerCase() === params.recipient.toLowerCase()
    );
    if (!v || !v.approved) {
      return {
        ok: false,
        chainMode: "simulated",
        errorCode: "VendorNotApproved",
        errorMessage:
          "Vendor not approved: only pre-approved vendors can receive direct payments.",
      };
    }
  } else {
    const o = simState.officers.find(
      (item) => item.address.toLowerCase() === params.recipient.toLowerCase()
    );
    if (!o || !o.registered) {
      return {
        ok: false,
        chainMode: "simulated",
        errorCode: "OfficerNotRegistered",
        errorMessage:
          "Officer not registered: only registered officers can claim reimbursements.",
      };
    }
    if (o.reimbursed + params.amountPesos > o.cap) {
      const rem = Math.max(0, o.cap - o.reimbursed);
      const excess = params.amountPesos - rem;
      return {
        ok: false,
        chainMode: "simulated",
        errorCode: "OverOfficerCap",
        errorMessage: `Over officer reimbursement cap by ${formatPesos(excess)} (remaining cap ${formatPesos(rem)}).`,
      };
    }
  }

  const budget = simState.budgets.get(params.categoryName) ?? {
    limit: 0,
    spent: 0,
  };
  const remaining = Math.max(0, budget.limit - budget.spent);
  if (params.amountPesos > remaining) {
    const excess = params.amountPesos - remaining;
    return {
      ok: false,
      chainMode: "simulated",
      errorCode: "OverCategoryBudget",
      errorMessage: `Over the ${params.categoryName} budget by ${formatPesos(excess)} (requested ${formatPesos(params.amountPesos)}, remaining ${formatPesos(remaining)}).`,
    };
  }

  if (params.amountPesos > simState.vaultBalance) {
    return {
      ok: false,
      chainMode: "simulated",
      errorCode: "InsufficientVault",
      errorMessage: `Insufficient vault funds: requested ${formatPesos(params.amountPesos)}, available ${formatPesos(simState.vaultBalance)}.`,
    };
  }

  // Apply simulated state update
  simState.usedReceipts.add(params.receiptHash.toLowerCase());
  budget.spent += params.amountPesos;
  simState.budgets.set(params.categoryName, budget);
  simState.vaultBalance -= params.amountPesos;
  if (params.kind === 1) {
    const o = simState.officers.find(
      (item) => item.address.toLowerCase() === params.recipient.toLowerCase()
    );
    if (o) {
      o.reimbursed += params.amountPesos;
      o.remainingCap = Math.max(0, o.cap - o.reimbursed);
    }
  }

  return {
    ok: true,
    chainMode: "simulated",
  };
}
