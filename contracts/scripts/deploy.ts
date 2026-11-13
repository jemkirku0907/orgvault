import { network } from "hardhat";
import { encodeDeployData, formatEther, formatGwei } from "viem";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
    throw new Error("No deployer wallet configured. Set DEPLOYER_PRIVATE_KEY in contracts/.env.");
  }

  const chainId = await publicClient.getChainId();
  const balance = await publicClient.getBalance({ address: deployer.account.address });
  const gasPrice = await publicClient.getGasPrice();
  const attestorAddress = (process.env.ATTESTOR_ADDRESS || deployer.account.address) as `0x${string}`;

  const mockPhpArtifact = loadArtifact("MockPHP.sol/MockPHP.json");
  const orgVaultArtifact = loadArtifact("OrgVault.sol/OrgVault.json");

  const mockPhpGas = await publicClient.estimateGas({
    account: deployer.account.address,
    data: encodeDeployData({ abi: mockPhpArtifact.abi, bytecode: mockPhpArtifact.bytecode }),
  });
  const orgVaultGas = await publicClient.estimateGas({
    account: deployer.account.address,
    data: encodeDeployData({
      abi: orgVaultArtifact.abi,
      bytecode: orgVaultArtifact.bytecode,
      args: [deployer.account.address, attestorAddress],
    }),
  });

  const estCost = (mockPhpGas + orgVaultGas) * gasPrice;
  console.log(`Chain ID: ${chainId} | Deployer: ${deployer.account.address}`);
  console.log(`Balance: ${formatEther(balance)} tBNB | Gas Price: ${formatGwei(gasPrice)} gwei`);
  console.log(`Estimated Deploy Cost: ${formatEther(estCost)} tBNB`);

  if (balance < estCost) {
    throw new Error(
      `Insufficient tBNB balance (${formatEther(balance)} tBNB < ${formatEther(estCost)} tBNB). Claim tBNB from the BSC Testnet faucet first.`
    );
  }

  console.log("\nDeploying MockPHP...");
  const mockPhp = await viem.deployContract("MockPHP");
  console.log(`MockPHP deployed at: ${mockPhp.address}`);

  console.log("Deploying OrgVault...");
  const orgVault = await viem.deployContract("OrgVault", [mockPhp.address, attestorAddress]);
  console.log(`OrgVault deployed at: ${orgVault.address}`);

  const blockNumber = await publicClient.getBlockNumber();
  const isTestnet = chainId === 97;
  const explorerBase = isTestnet ? "https://testnet.bscscan.com" : "";

  const deploymentData = {
    network: isTestnet ? "bscTestnet" : "local",
    chainId,
    deployedAt: new Date().toISOString(),
    blockNumber: Number(blockNumber),
    deployer: deployer.account.address,
    attestor: attestorAddress,
    contracts: {
      MockPHP: mockPhp.address,
      OrgVault: orgVault.address,
    },
    explorer: isTestnet
      ? {
          MockPHP: `${explorerBase}/address/${mockPhp.address}`,
          OrgVault: `${explorerBase}/address/${orgVault.address}`,
        }
      : {},
  };

  const deploymentsDir = path.resolve(import.meta.dirname, "..", "..", "deployments");
  mkdirSync(deploymentsDir, { recursive: true });
  const outFile = path.join(deploymentsDir, isTestnet ? "bscTestnet.json" : "local.json");
  writeFileSync(outFile, JSON.stringify(deploymentData, null, 2) + "\n", "utf8");

  console.log(`\nSaved deployment metadata to ${outFile}`);
  if (isTestnet) {
    console.log(`MockPHP Explorer : ${deploymentData.explorer.MockPHP}`);
    console.log(`OrgVault Explorer: ${deploymentData.explorer.OrgVault}`);
    console.log("\nVerify commands:");
    console.log(`  npx hardhat verify --network bscTestnet ${mockPhp.address}`);
    console.log(`  npx hardhat verify --network bscTestnet ${orgVault.address} ${mockPhp.address} ${attestorAddress}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
