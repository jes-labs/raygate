import { defineChain } from "viem";
import type { BeamNetwork } from "./types.js";

/** Beam Mainnet — chainId 4337 */
export const beam = defineChain({
  id: 4337,
  name: "Beam",
  nativeCurrency: {
    name: "BEAM",
    symbol: "BEAM",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://build.onbeam.com/rpc"],
    },
  },
  blockExplorers: {
    default: {
      name: "Beam Explorer",
      url: "https://subnets.avax.network/beam",
    },
  },
});

/** Beam Testnet — chainId 13337 */
export const beamTestnet = defineChain({
  id: 13337,
  name: "Beam Testnet",
  nativeCurrency: {
    name: "BEAM",
    symbol: "BEAM",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://build.onbeam.com/rpc/testnet"],
    },
  },
  blockExplorers: {
    default: {
      name: "Beam Testnet Explorer",
      url: "https://subnets-test.avax.network/beam",
    },
  },
  testnet: true,
});

/** Map CAIP-2 network string to chain ID */
export const NETWORK_TO_CHAIN_ID: Record<BeamNetwork, number> = {
  "eip155:4337": 4337,
  "eip155:13337": 13337,
};

/** Map chain ID to CAIP-2 network string */
export const CHAIN_ID_TO_NETWORK: Record<number, BeamNetwork> = {
  4337: "eip155:4337",
  13337: "eip155:13337",
};

/** Get viem chain definition from CAIP-2 network string */
export function getChainFromNetwork(network: BeamNetwork) {
  return network === "eip155:4337" ? beam : beamTestnet;
}
