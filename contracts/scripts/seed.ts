import { network } from "hardhat";
import { keccak256, parseEther, toHex, type Address } from "viem";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

async function main() {
  const connection = await network.connect();
  const { viem } = connection;
  const publicClient = await viem.getPublicClient();
  const [owner, extra1, extra2, extra3] = await viem.getWalletClients();

  if (!owner) {
    throw new Error("No wallet configured. Set DEPLOYER_PRIVATE_KEY in contracts/.env.");
  }

  const chainId = await publicClient.getChainId();
  const deploymentsDir = path.resolve(import.meta.dirname, "..", "..", "deployments");
  const depFile = path.join(deploymentsDir, chainId === 97 ? "bscTestnet.json" : "local.json");

  let mockPhpAddress: Address;
  let orgVaultAddress: Address;

  if (existsSync(depFile)) {
    const dep = JSON.parse(readFileSync(depFile, "utf8"));
    mockPhpAddress = dep.contracts.MockPHP as Address;
    orgVaultAddress = dep.contracts.OrgVault as Address;
    console.log(`Loaded deployment from ${depFile}`);
  } else if (chainId !== 97) {
    // Ephemeral local hardhat network: deploy fresh for testing the seed flow
    const mockPhpDeployed = await viem.deployContract("MockPHP");
    const orgVaultDeployed = await viem.deployContract("OrgVault", [
      mockPhpDeployed.address,
      owner.account.address,
    ]);
    mockPhpAddress = mockPhpDeployed.address;
    orgVaultAddress = orgVaultDeployed.address;
    console.log("Deployed ephemeral local contracts for seed test.");
  } else {
    throw new Error(`Missing ${depFile}. Run deploy.ts first.`);
  }

  const mockPhp = await viem.getContractAt("MockPHP", mockPhpAddress);
  const orgVault = await viem.getContractAt("OrgVault", orgVaultAddress);

  const duesAmount = parseEther("3500"); // ₱3,500 initial dues
  const mintAmount = parseEther("5000"); // ₱5,000 minted to owner/member

  const currentBal = await mockPhp.read.balanceOf([owner.account.address]);
  if (currentBal < duesAmount) {
    console.log("Minting 5,000 MockPHP...");
    const mintHash = await mockPhp.write.mint([owner.account.address, mintAmount]);
    await publicClient.waitForTransactionReceipt({ hash: mintHash });
  } else {
    console.log("Skipping mint (balance already sufficient).");
  }

  const currentAllowance = await mockPhp.read.allowance([
    owner.account.address,
    orgVaultAddress,
  ]);
  if (currentAllowance < duesAmount) {
    console.log("Approving OrgVault to spend MockPHP...");
    const approveHash = await mockPhp.write.approve([orgVaultAddress, mintAmount]);
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
  } else {
    console.log("Skipping approve (allowance already sufficient).");
  }

  const vaultBal = await orgVault.read.vaultBalance();
  if (vaultBal < duesAmount) {
    console.log("Paying 3,500 MockPHP dues into OrgVault...");
    const duesHash = await orgVault.write.payDues([duesAmount]);
    await publicClient.waitForTransactionReceipt({ hash: duesHash });
  } else {
    console.log("Skipping payDues (vault already funded).");
  }

  const budgets: Array<{ name: string; limit: bigint }> = [
    { name: "Food", limit: parseEther("1000") },
    { name: "Printing", limit: parseEther("500") },
    { name: "Events", limit: parseEther("2000") },
  ];

  for (const b of budgets) {
    const catId = keccak256(toHex(b.name));
    const [existingLimit] = await orgVault.read.getBudget([catId]);
    if (existingLimit !== b.limit) {
      console.log(`Setting ${b.name} budget to ₱${Number(b.limit / 10n ** 18n)}...`);
      const h = await orgVault.write.setBudget([catId, b.limit]);
      await publicClient.waitForTransactionReceipt({ hash: h });
    } else {
      console.log(`Skipping ${b.name} budget (already set).`);
    }
  }

  // Deterministic testnet vendor addresses if single-account testnet wallet is used
  const canteenAddr = (process.env.VENDOR_CANTEEN_ADDRESS ||
    extra1?.account.address ||
    "0x1111111111111111111111111111111111111111") as Address;
  const printShopAddr = (process.env.VENDOR_PRINTSHOP_ADDRESS ||
    extra2?.account.address ||
    "0x2222222222222222222222222222222222222222") as Address;
  const unapprovedVendorAddr = (process.env.VENDOR_UNAPPROVED_ADDRESS ||
    extra3?.account.address ||
    "0x3333333333333333333333333333333333333333") as Address;

  const vendorsToApprove: Array<{ addr: Address; label: string }> = [
    { addr: canteenAddr, label: "Canteen" },
    { addr: printShopAddr, label: "PrintShop" },
  ];

  for (const v of vendorsToApprove) {
    const [, approved] = await orgVault.read.vendors([v.addr]);
    if (!approved) {
      console.log(`Approving vendor ${v.label} (${v.addr})...`);
      const h = await orgVault.write.setVendor([v.addr, v.label, true]);
      await publicClient.waitForTransactionReceipt({ hash: h });
    } else {
      console.log(`Skipping vendor ${v.label} (already approved).`);
    }
  }

  console.log("\n=== Seed Summary ===");
  console.log(`OrgVault Balance : ${Number((await orgVault.read.vaultBalance()) / 10n ** 18n)} MockPHP`);
  console.log(`Approved Canteen : ${canteenAddr}`);
  console.log(`Approved PrintShop: ${printShopAddr}`);
  console.log(`Unapproved Vendor: ${unapprovedVendorAddr} (intentionally NOT approved)`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
