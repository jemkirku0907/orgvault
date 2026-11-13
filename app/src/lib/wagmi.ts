import { createConfig, fallback, http } from "wagmi";
import { injected } from "wagmi/connectors";
import {
  BSC_TESTNET_FALLBACK_RPC,
  BSC_TESTNET_RPC,
  orgVaultChain,
} from "@/lib/contracts";

export const wagmiConfig = createConfig({
  chains: [orgVaultChain],
  connectors: [injected()],
  multiInjectedProviderDiscovery: true,
  ssr: true,
  transports: {
    [orgVaultChain.id]: fallback([
      http(BSC_TESTNET_RPC),
      http(BSC_TESTNET_FALLBACK_RPC),
    ]),
  },
});
