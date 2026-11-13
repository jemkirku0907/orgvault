"use client";

import { useState } from "react";
import { formatEther, type Address } from "viem";
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useReadContract,
} from "wagmi";
import { injected } from "wagmi/connectors";
import {
  CHAIN_ID,
  ENV_TOKEN_ADDRESS,
  ENV_VAULT_ADDRESS,
  EXPLORER_BASE,
  MOCK_PHP_ABI,
  ORG_VAULT_ABI,
} from "@/lib/contracts";
import {
  formatWalletError,
  METAMASK_INSTALL_URL,
  switchOrAddBscTestnet,
} from "@/lib/chain/walletErrors";

function formatShortAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function BscWalletButton({
  compact = false,
  vaultAddress,
  tokenAddress,
}: {
  compact?: boolean;
  vaultAddress?: Address;
  tokenAddress?: Address;
}) {
  const { address, chainId, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const [errorInfo, setErrorInfo] = useState<{
    message: string;
    showInstall?: boolean;
  } | null>(null);
  const [switching, setSwitching] = useState(false);

  const resolvedVault = vaultAddress ?? ENV_VAULT_ADDRESS;
  const resolvedToken = tokenAddress ?? ENV_TOKEN_ADDRESS;

  const { data: nativeBal } = useBalance({
    address,
    chainId: CHAIN_ID,
    query: { enabled: Boolean(address && chainId === CHAIN_ID) },
  });

  const { data: phpBalRaw } = useReadContract({
    address: resolvedToken,
    abi: MOCK_PHP_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: Boolean(address && resolvedToken && chainId === CHAIN_ID) },
  });

  const { data: vaultOwner } = useReadContract({
    address: resolvedVault,
    abi: ORG_VAULT_ABI,
    functionName: "owner",
    chainId: CHAIN_ID,
    query: { enabled: Boolean(resolvedVault) },
  });

  const onBscTestnet = chainId === CHAIN_ID;
  const isOwner = Boolean(
    address && vaultOwner && address.toLowerCase() === vaultOwner.toLowerCase()
  );

  const handleConnect = () => {
    setErrorInfo(null);
    if (
      typeof window !== "undefined" &&
      !(window as unknown as { ethereum?: unknown }).ethereum
    ) {
      setErrorInfo({
        message: "MetaMask is not installed.",
        showInstall: true,
      });
      return;
    }

    connect(
      { connector: injected() },
      {
        onError: (err) => {
          setErrorInfo(formatWalletError(err));
        },
      }
    );
  };

  const handleSwitch = async () => {
    setErrorInfo(null);
    setSwitching(true);
    try {
      await switchOrAddBscTestnet();
    } catch (err) {
      setErrorInfo(formatWalletError(err));
    } finally {
      setSwitching(false);
    }
  };

  if (!isConnected || !address) {
    return (
      <div className={compact ? "flex items-center gap-2" : "space-y-1.5"}>
        <button
          type="button"
          onClick={handleConnect}
          disabled={isConnecting}
          className={
            compact
              ? "px-3.5 py-2 rounded-xl bg-brand hover:opacity-90 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
              : "w-full py-2 px-3 rounded-xl bg-brand hover:opacity-90 disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          }
        >
          <span className="w-2 h-2 rounded-full bg-amber-300" />
          <span>{isConnecting ? "Connecting..." : "Connect BSC Wallet"}</span>
        </button>
        {errorInfo && (
          <p className="text-[11px] text-[#EF4444] leading-snug">
            {errorInfo.message}{" "}
            {errorInfo.showInstall && (
              <a
                href={METAMASK_INSTALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold"
              >
                Install MetaMask ↗
              </a>
            )}
          </p>
        )}
      </div>
    );
  }

  const phpFormatted =
    phpBalRaw !== undefined
      ? Number(formatEther(phpBalRaw)).toLocaleString("en-US", {
          maximumFractionDigits: 2,
        })
      : "—";
  const tbnbFormatted = nativeBal
    ? Number(formatEther(nativeBal.value)).toFixed(4)
    : "—";

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <a
          href={`${EXPLORER_BASE}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E2E8F0] text-xs font-mono font-semibold text-[#0F172A] hover:border-brand"
        >
          {formatShortAddress(address)}
        </a>
        <span
          className={`px-2 py-1 rounded-lg text-[11px] font-semibold ${
            isOwner
              ? "bg-brand-light text-brand"
              : "bg-slate-100 text-[#475569]"
          }`}
        >
          {isOwner ? "Owner" : "Member"}
        </span>
        {!onBscTestnet ? (
          <button
            type="button"
            onClick={handleSwitch}
            disabled={switching}
            className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold"
          >
            {switching ? "Switching..." : "Switch to BSC Testnet"}
          </button>
        ) : (
          <span className="text-[11px] font-mono text-[#64748B]">
            {tbnbFormatted} tBNB · ₱{phpFormatted}
          </span>
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
          rel="noopener noreferrer"
          className="text-xs font-mono font-semibold text-[#0F172A] hover:text-brand truncate"
        >
          {formatShortAddress(address)}
        </a>
        <span
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
            isOwner
              ? "bg-brand-light text-brand"
              : "bg-slate-200/70 text-[#475569]"
          }`}
        >
          {isOwner ? "Owner" : "Member"}
        </span>
      </div>

      {onBscTestnet ? (
        <div className="space-y-1 text-[11px] text-[#64748B]">
          <div className="flex items-center justify-between">
            <span>Gas</span>
            <span className="font-mono font-semibold text-[#0F172A]">
              {tbnbFormatted} tBNB
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>MockPHP</span>
            <span className="font-mono font-semibold text-[#0F172A]">
              ₱{phpFormatted}
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSwitch}
          disabled={switching}
          className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold transition-colors"
        >
          {switching ? "Switching..." : "Switch to BSC Testnet"}
        </button>
      )}

      <button
        type="button"
        onClick={() => disconnect()}
        className="w-full py-1 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[11px] font-medium text-[#64748B]"
      >
        Disconnect
      </button>

      {errorInfo && (
        <p className="text-[11px] text-[#EF4444] leading-snug">
          {errorInfo.message}
        </p>
      )}
    </div>
  );
}
