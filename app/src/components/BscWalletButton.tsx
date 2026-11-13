"use client";

import { useCallback, useEffect, useState } from "react";
import { BSC_TESTNET_RPC, CHAIN_ID, EXPLORER_BASE } from "@/lib/contracts";

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, cb: (...args: unknown[]) => void) => void;
}

const BSC_CHAIN_HEX = `0x${CHAIN_ID.toString(16)}`; // 0x61

function getEthereum(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { ethereum?: EthereumProvider }).ethereum;
}

function formatShortAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function BscWalletButton() {
  const [address, setAddress] = useState<string | null>(null);
  const [chainHex, setChainHex] = useState<string | null>(null);
  const [tbnbBalance, setTbnbBalance] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBalance = useCallback(async (eth: EthereumProvider, addr: string) => {
    try {
      const hexBal = (await eth.request({
        method: "eth_getBalance",
        params: [addr, "latest"],
      })) as string;
      const wei = BigInt(hexBal);
      const whole = Number(wei) / 1e18;
      setTbnbBalance(whole.toFixed(4));
    } catch {
      setTbnbBalance(null);
    }
  }, []);

  const syncState = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) return;
    try {
      const accounts = (await eth.request({ method: "eth_accounts" })) as string[];
      const currentChain = (await eth.request({ method: "eth_chainId" })) as string;
      setChainHex(currentChain?.toLowerCase() ?? null);
      if (accounts && accounts[0]) {
        setAddress(accounts[0]);
        if (currentChain?.toLowerCase() === BSC_CHAIN_HEX) {
          await refreshBalance(eth, accounts[0]);
        } else {
          setTbnbBalance(null);
        }
      } else {
        setAddress(null);
        setTbnbBalance(null);
      }
    } catch {
      // ignore silent sync errors
    }
  }, [refreshBalance]);

  useEffect(() => {
    syncState();
    const eth = getEthereum();
    if (!eth?.on) return;

    const onAccountsChanged = () => void syncState();
    const onChainChanged = () => void syncState();
    eth.on("accountsChanged", onAccountsChanged);
    eth.on("chainChanged", onChainChanged);
    return () => {
      eth.removeListener?.("accountsChanged", onAccountsChanged);
      eth.removeListener?.("chainChanged", onChainChanged);
    };
  }, [syncState]);

  const switchToBscTestnet = async (eth: EthereumProvider) => {
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BSC_CHAIN_HEX }],
      });
    } catch (switchErr) {
      const code = (switchErr as { code?: number })?.code;
      if (code === 4902) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: BSC_CHAIN_HEX,
              chainName: "BNB Smart Chain Testnet",
              nativeCurrency: {
                name: "tBNB",
                symbol: "tBNB",
                decimals: 18,
              },
              rpcUrls: [BSC_TESTNET_RPC],
              blockExplorerUrls: [EXPLORER_BASE],
            },
          ],
        });
      } else {
        throw switchErr;
      }
    }
  };

  const handleConnect = async () => {
    setError(null);
    const eth = getEthereum();
    if (!eth) {
      setError("Install MetaMask or an EVM wallet extension to connect.");
      return;
    }

    setConnecting(true);
    try {
      const accounts = (await eth.request({
        method: "eth_requestAccounts",
      })) as string[];
      await switchToBscTestnet(eth);
      const currentChain = (await eth.request({ method: "eth_chainId" })) as string;
      setChainHex(currentChain?.toLowerCase() ?? null);
      if (accounts[0]) {
        setAddress(accounts[0]);
        await refreshBalance(eth, accounts[0]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not connect wallet."
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleSwitchChain = async () => {
    setError(null);
    const eth = getEthereum();
    if (!eth) return;
    setConnecting(true);
    try {
      await switchToBscTestnet(eth);
      await syncState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network switch rejected.");
    } finally {
      setConnecting(false);
    }
  };

  const onBscTestnet = chainHex === BSC_CHAIN_HEX;

  if (!address) {
    return (
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={handleConnect}
          disabled={connecting}
          className="w-full py-2 px-3 rounded-xl bg-[#0F172A] hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>{connecting ? "Connecting..." : "Connect BSC Wallet"}</span>
        </button>
        {error && (
          <p className="text-[11px] text-[#EF4444] leading-snug">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
      <div className="flex items-center justify-between gap-2">
        <a
          href={`${EXPLORER_BASE}/address/${address}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-mono font-semibold text-[#0F172A] hover:text-[#2563EB] truncate"
        >
          {formatShortAddress(address)}
        </a>
        <span
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
            onBscTestnet
              ? "bg-[#ECFDF5] text-[#065F46]"
              : "bg-amber-50 text-amber-800"
          }`}
        >
          {onBscTestnet ? "BSC Testnet" : "Wrong Net"}
        </span>
      </div>

      {onBscTestnet ? (
        <div className="flex items-center justify-between text-[11px] text-[#64748B]">
          <span>Wallet Gas</span>
          <span className="font-mono font-semibold text-[#0F172A]">
            {tbnbBalance !== null ? `${tbnbBalance} tBNB` : "—"}
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSwitchChain}
          disabled={connecting}
          className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold transition-colors"
        >
          Switch to BSC Testnet (97)
        </button>
      )}

      {error && (
        <p className="text-[11px] text-[#EF4444] leading-snug">{error}</p>
      )}
    </div>
  );
}
