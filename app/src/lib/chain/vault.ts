import {
  createPublicClient,
  createWalletClient,
  fallback,
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
  BSC_TESTNET_FALLBACK_RPC,
  BSC_TESTNET_RPC,
  CATEGORIES,
  categoryId,
  EXPENSE_EIP712_TYPES,
  EXPLORER_BASE,
  getEip712Domain,
  ORG_VAULT_ABI,
  orgVaultChain,
} from "@/lib/contracts";
import { decodeVaultError } from "./errors";

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
  chainMode: "bscTestnet";
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

export function resolveDeploymentAddresses(): {
  orgVaultAddress?: Address;
  mockPhpAddress?: Address;
} {
  const envVault = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ||
    process.env.NEXT_PUBLIC_ORGVAULT_ADDRESS) as Address | undefined;
  const envPhp = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS ||
    process.env.NEXT_PUBLIC_MOCKPHP_ADDRESS) as Address | undefined;
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
    transport: fallback([
      http(BSC_TESTNET_RPC),
      http(BSC_TESTNET_FALLBACK_RPC),
    ]),
  });
}

export async function getVaultSummary(): Promise<VaultSummary> {
  const { orgVaultAddress, mockPhpAddress } = resolveDeploymentAddresses();
  if (!orgVaultAddress) {
    throw new Error(
      "NEXT_PUBLIC_VAULT_ADDRESS is not configured. Deploy OrgVault and set env vars."
    );
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
  readyForWallet?: boolean;
  chainMode: "bscTestnet";
  errorCode?: string;
  errorMessage?: string;
  orgVaultAddress?: Address;
  attestorAddress?: Address;
  signature?: Hex;
  signedExpense?: {
    recipient: Address;
    kind: 0 | 1;
    amountWei: string;
    categoryHash: Hex;
    receiptHash: Hex;
    memo: string;
    deadline: string;
  };
  txHash?: Hex;
  explorerUrl?: string;
  forcedFailed?: boolean;
}> {
  const { orgVaultAddress } = resolveDeploymentAddresses();
  const attestorKey = process.env.ATTESTOR_PRIVATE_KEY as Hex | undefined;
  const relayerEnabled = process.env.RELAYER_ENABLED === "true";
  const relayerKey = process.env.RELAYER_PRIVATE_KEY as Hex | undefined;

  if (!orgVaultAddress || !attestorKey) {
    return {
      ok: false,
      chainMode: "bscTestnet",
      errorCode: "NotConfigured",
      errorMessage:
        "Missing NEXT_PUBLIC_VAULT_ADDRESS or ATTESTOR_PRIVATE_KEY on server.",
    };
  }

  const publicClient = getPublicClient();
  const attestorAccount = privateKeyToAccount(attestorKey);

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

  const signedExpense = {
    recipient: params.recipient,
    kind: params.kind,
    amountWei: amountWei.toString(),
    categoryHash: catHash,
    receiptHash: params.receiptHash,
    memo: params.memo,
    deadline: deadline.toString(),
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
      account: attestorAccount.address,
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
        orgVaultAddress,
        attestorAddress: attestorAccount.address,
        signature,
      };
    }

    if (relayerEnabled && relayerKey) {
      const relayerAccount = privateKeyToAccount(relayerKey);
      const relayerClient = createWalletClient({
        account: relayerAccount,
        chain: orgVaultChain,
        transport: fallback([
          http(BSC_TESTNET_RPC),
          http(BSC_TESTNET_FALLBACK_RPC),
        ]),
      });
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
        orgVaultAddress,
        attestorAddress: attestorAccount.address,
        signature,
        txHash,
        explorerUrl: `${EXPLORER_BASE}/tx/${txHash}`,
      };
    }

    return {
      ok: false,
      readyForWallet: true,
      chainMode: "bscTestnet",
      forcedFailed: true,
      errorCode: decoded.code,
      errorMessage: `${decoded.message} (Sign with MetaMask to send forced revert tx.)`,
      orgVaultAddress,
      attestorAddress: attestorAccount.address,
      signature,
      signedExpense,
    };
  }

  if (relayerEnabled && relayerKey) {
    const relayerAccount = privateKeyToAccount(relayerKey);
    const relayerClient = createWalletClient({
      account: relayerAccount,
      chain: orgVaultChain,
      transport: fallback([
        http(BSC_TESTNET_RPC),
        http(BSC_TESTNET_FALLBACK_RPC),
      ]),
    });
    const txHash = await relayerClient.writeContract({
      address: orgVaultAddress,
      abi: ORG_VAULT_ABI,
      functionName: "executeExpense",
      args: [expense, signature],
    });
    try {
      await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 10_000,
      });
    } catch {
      // Tx was broadcast; return txHash even if receipt polling is slow
    }

    return {
      ok: true,
      chainMode: "bscTestnet",
      orgVaultAddress,
      attestorAddress: attestorAccount.address,
      signature,
      txHash,
      explorerUrl: `${EXPLORER_BASE}/tx/${txHash}`,
    };
  }

  return {
    ok: true,
    readyForWallet: true,
    chainMode: "bscTestnet",
    orgVaultAddress,
    attestorAddress: attestorAccount.address,
    signature,
    signedExpense,
  };
}
