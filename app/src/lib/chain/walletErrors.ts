export const FAUCET_URL = "https://www.bnbchain.org/en/testnet-faucet";
export const METAMASK_INSTALL_URL = "https://metamask.io/download/";

export function formatWalletError(err: unknown): {
  message: string;
  showFaucet?: boolean;
  showInstall?: boolean;
} {
  const raw = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: number; cause?: { code?: number } })?.code ??
    (err as { cause?: { code?: number } })?.cause?.code;

  if (code === 4001 || /user rejected|rejected the request/i.test(raw)) {
    return { message: "Transaction cancelled in MetaMask." };
  }
  if (/insufficient funds|insufficient tBNB/i.test(raw)) {
    return {
      message: "Not enough tBNB for gas fees. Claim free testnet BNB from the faucet.",
      showFaucet: true,
    };
  }
  if (/provider not found|no ethereum|metamask/i.test(raw)) {
    return {
      message: "MetaMask is not installed in this browser.",
      showInstall: true,
    };
  }
  return {
    message: raw.length > 220 ? `${raw.slice(0, 220)}...` : raw,
  };
}

export async function switchOrAddBscTestnet(): Promise<void> {
  const eth = (
    window as unknown as {
      ethereum?: {
        request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      };
    }
  ).ethereum;

  if (!eth) {
    throw new Error("MetaMask provider not found.");
  }

  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x61" }],
    });
  } catch (switchErr) {
    const code = (switchErr as { code?: number })?.code;
    if (code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0x61",
            chainName: "BSC Testnet",
            nativeCurrency: {
              name: "tBNB",
              symbol: "tBNB",
              decimals: 18,
            },
            rpcUrls: ["https://data-seed-prebsc-1-s1.bnbchain.org:8545"],
            blockExplorerUrls: ["https://testnet.bscscan.com"],
          },
        ],
      });
    } else {
      throw switchErr;
    }
  }
}
