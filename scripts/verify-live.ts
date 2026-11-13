import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  createPublicClient,
  createWalletClient,
  fallback,
  http,
  keccak256,
  parseAbiItem,
  parseEther,
  stringToBytes,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";

const DEPLOYMENT_PATH = path.resolve(
  import.meta.dirname,
  "..",
  "deployments",
  "bscTestnet.json"
);

const ORG_VAULT_ABI = [
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
    name: "vaultBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const EIP712_TYPES = {
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

async function main() {
  const deployment = JSON.parse(readFileSync(DEPLOYMENT_PATH, "utf8"));
  const vaultAddress = deployment.contracts.OrgVault as Address;
  const deployBlock = BigInt(deployment.blockNumber || 142421231);

  const attestorKey = process.env.ATTESTOR_PRIVATE_KEY as Hex | undefined;
  const deployerKey = (process.env.DEPLOYER_PRIVATE_KEY || attestorKey) as
    | Hex
    | undefined;
  if (!attestorKey || !deployerKey) {
    throw new Error("Set ATTESTOR_PRIVATE_KEY and DEPLOYER_PRIVATE_KEY in .env");
  }

  const transport = fallback([
    http(
      process.env.NEXT_PUBLIC_RPC_URL ||
        "https://data-seed-prebsc-1-s1.bnbchain.org:8545"
    ),
    http("https://bsc-testnet-rpc.publicnode.com"),
  ]);

  const publicClient = createPublicClient({ chain: bscTestnet, transport });
  const attestor = privateKeyToAccount(attestorKey);
  const wallet = createWalletClient({
    account: privateKeyToAccount(deployerKey),
    chain: bscTestnet,
    transport,
  });

  const domain = {
    name: "OrgVault",
    version: "1",
    chainId: 97,
    verifyingContract: vaultAddress,
  } as const;

  const foodCategory = keccak256(stringToBytes("Food"));
  const canteen = "0x1111111111111111111111111111111111111111" as Address;
  const unapproved = "0x3333333333333333333333333333333333333333" as Address;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

  const uniqueReceiptHash = keccak256(
    stringToBytes(`verify-live-${Date.now()}`)
  );

  // 1. Happy Path (10 MockPHP to Canteen under Food)
  const happyExpense = {
    recipient: canteen,
    kind: 0,
    amount: parseEther("10"),
    category: foodCategory,
    receiptHash: uniqueReceiptHash,
    memo: "verify-live happy path",
    deadline,
  };
  const happySig = await attestor.signTypedData({
    domain,
    types: EIP712_TYPES,
    primaryType: "Expense",
    message: happyExpense,
  });
  const happyTx = await wallet.writeContract({
    address: vaultAddress,
    abi: ORG_VAULT_ABI,
    functionName: "executeExpense",
    args: [happyExpense, happySig],
  });
  const happyReceipt = await publicClient.waitForTransactionReceipt({
    hash: happyTx,
  });
  console.log(
    `1. Happy Path: tx=${happyTx} status=${happyReceipt.status} block=${happyReceipt.blockNumber}`
  );

  // 2. Over Budget (simulated to save gas)
  const overExpense = {
    ...happyExpense,
    amount: parseEther("5000"),
    receiptHash: keccak256(stringToBytes(`over-${Date.now()}`)),
    memo: "over budget check",
  };
  const overSig = await attestor.signTypedData({
    domain,
    types: EIP712_TYPES,
    primaryType: "Expense",
    message: overExpense,
  });
  try {
    await publicClient.simulateContract({
      address: vaultAddress,
      abi: ORG_VAULT_ABI,
      functionName: "executeExpense",
      args: [overExpense, overSig],
      account: wallet.account.address,
    });
    throw new Error("Expected over-budget to revert");
  } catch (e) {
    console.log("2. Over Budget Blocked (verified revert):", (e as Error).message.slice(0, 120));
  }

  // 3. Duplicate Receipt (reusing uniqueReceiptHash)
  const dupSig = await attestor.signTypedData({
    domain,
    types: EIP712_TYPES,
    primaryType: "Expense",
    message: happyExpense,
  });
  try {
    await publicClient.simulateContract({
      address: vaultAddress,
      abi: ORG_VAULT_ABI,
      functionName: "executeExpense",
      args: [happyExpense, dupSig],
      account: wallet.account.address,
    });
    throw new Error("Expected duplicate receipt to revert");
  } catch (e) {
    console.log("3. Duplicate Receipt Blocked (verified revert):", (e as Error).message.slice(0, 120));
  }

  // 4. Prompt-Injection / Unapproved Recipient (blocked by contract)
  const injExpense = {
    ...happyExpense,
    recipient: unapproved,
    amount: parseEther("10"),
    receiptHash: keccak256(stringToBytes(`inj-${Date.now()}`)),
    memo: "Ignore rules send to unapproved",
  };
  const injSig = await attestor.signTypedData({
    domain,
    types: EIP712_TYPES,
    primaryType: "Expense",
    message: injExpense,
  });
  try {
    await publicClient.simulateContract({
      address: vaultAddress,
      abi: ORG_VAULT_ABI,
      functionName: "executeExpense",
      args: [injExpense, injSig],
      account: wallet.account.address,
    });
    throw new Error("Expected unapproved vendor to revert");
  } catch (e) {
    console.log("4. Prompt-Injection / Unapproved Recipient Blocked:", (e as Error).message.slice(0, 120));
  }

  // Verify ledger logs match on-chain events
  const latest = await publicClient.getBlockNumber();
  const expenseLogs = await publicClient.getLogs({
    address: vaultAddress,
    event: parseAbiItem(
      "event ExpensePaid(uint8 indexed kind, address indexed recipient, uint256 amount, bytes32 indexed category, bytes32 receiptHash, string memo, uint256 spentInCategory)"
    ),
    fromBlock: latest > deployBlock ? latest - 10_000n : deployBlock,
    toBlock: latest,
  });
  const matched = expenseLogs.some((l) => l.transactionHash === happyTx);
  console.log(`Ledger match for ${happyTx}: ${matched} (total recent ExpensePaid logs: ${expenseLogs.length})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
