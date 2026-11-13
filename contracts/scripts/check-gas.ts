import { network } from "hardhat";
import { encodeDeployData, formatEther, formatGwei } from "viem";
import { readFileSync } from "node:fs";
import path from "node:path";

function loadArtifact(relPath: string) {
  const full = path.resolve(import.meta.dirname, "..", "artifacts", "contracts", relPath);
  return JSON.parse(readFileSync(full, "utf8"));
}

async function main() {
  const connection = await network.connect();
  const { viem } = connection;
  const publicClient = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();

  if (!deployer) {
    console.error("No deployer wallet configured. Set DEPLOYER_PRIVATE_KEY in contracts/.env for bscTestnet.");
    process.exitCode = 1;
    return;
  }

  const chainId = await publicClient.getChainId();
  const balance = await publicClient.getBalance({ address: deployer.account.address });
  const gasPrice = await publicClient.getGasPrice();

  const mockPhpArtifact = loadArtifact("MockPHP.sol/MockPHP.json");
  const orgVaultArtifact = loadArtifact("OrgVault.sol/OrgVault.json");

  const mockPhpData = encodeDeployData({
    abi: mockPhpArtifact.abi,
    bytecode: mockPhpArtifact.bytecode,
  });

  // Use deployer as placeholder attestor for gas estimation
  const attestorAddress = (process.env.ATTESTOR_ADDRESS || deployer.account.address) as `0x${string}`;
  const orgVaultData = encodeDeployData({
    abi: orgVaultArtifact.abi,
    bytecode: orgVaultArtifact.bytecode,
    args: [deployer.account.address, attestorAddress],
  });

  const mockPhpGas = await publicClient.estimateGas({
    account: deployer.account.address,
    data: mockPhpData,
  });

  // Estimate OrgVault gas (uses placeholder token address; identical calldata size)
  const orgVaultGas = await publicClient.estimateGas({
    account: deployer.account.address,
    data: orgVaultData,
  });

  const totalGas = mockPhpGas + orgVaultGas;
  const estimatedCostWei = totalGas * gasPrice;
  const bufferedCostWei = (estimatedCostWei * 120n) / 100n;

  console.log("=== OrgVault Gas & Balance Check ===");
  console.log(`Network Chain ID : ${chainId}`);
  console.log(`Deployer Address : ${deployer.account.address}`);
  console.log(`Balance          : ${formatEther(balance)} tBNB`);
  console.log(`Gas Price        : ${formatGwei(gasPrice)} gwei`);
  console.log(`MockPHP Est Gas  : ${mockPhpGas.toString()}`);
  console.log(`OrgVault Est Gas : ${orgVaultGas.toString()}`);
  console.log(`Total Est Gas    : ${totalGas.toString()}`);
  console.log(`Estimated Cost   : ${formatEther(estimatedCostWei)} tBNB (with 20% buffer: ${formatEther(bufferedCostWei)} tBNB)`);
  console.log(`Sufficient Funds : ${balance >= bufferedCostWei ? "YES" : "NO - claim tBNB from faucet"}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
