import "dotenv/config";
import { defineConfig } from "hardhat/config";
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";

const bscTestnetRpc =
  process.env.BSC_TESTNET_RPC ||
  "https://data-seed-prebsc-1-s1.bnbchain.org:8545";
const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;

export default defineConfig({
  plugins: [hardhatToolboxViem],
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    bscTestnet: {
      type: "http",
      chainType: "l1",
      url: bscTestnetRpc,
      chainId: 97,
      accounts: deployerKey ? [deployerKey] : [],
    },
  },
  verify: {
    etherscan: {
      apiKey: process.env.BSCSCAN_API_KEY || "",
    },
  },
});
