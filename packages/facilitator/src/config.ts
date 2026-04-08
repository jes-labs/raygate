import type { BeamNetwork } from "@raygate/core";

export interface FacilitatorConfig {
  beamRpcUrl: string;
  beamTestnetRpcUrl: string;
  facilitatorPrivateKey: `0x${string}`;
  usdcBeamAddress: `0x${string}`;
  beamTokenAddress: `0x${string}`;
  permit2Address: `0x${string}`;
  network: BeamNetwork;
  port: number;
  gasWarningThreshold: bigint;
  logLevel: "error" | "warn" | "info" | "debug";
}

export function loadConfig(): FacilitatorConfig {
  const required = (key: string): string => {
    const value = process.env[key];
    if (!value) throw new Error(`Missing required env var: ${key}`);
    return value;
  };

  const isTestnet = process.env.NODE_ENV !== "production";

  return {
    beamRpcUrl: process.env.BEAM_RPC_URL ?? "https://build.onbeam.com/rpc",
    beamTestnetRpcUrl:
      process.env.BEAM_TESTNET_RPC_URL ??
      "https://build.onbeam.com/rpc/testnet",
    facilitatorPrivateKey: required("FACILITATOR_PRIVATE_KEY") as `0x${string}`,
    usdcBeamAddress: (process.env.USDC_BEAM_ADDRESS ??
      "0x0000000000000000000000000000000000000000") as `0x${string}`,
    beamTokenAddress: (process.env.BEAM_TOKEN_ADDRESS ??
      "0xF65B6f9c94187276C7d91F4F74134751d248bFeA") as `0x${string}`,
    permit2Address: (process.env.PERMIT2_ADDRESS ??
      "0x000000000022D473030F116dDEE9F6B43aC78BA3") as `0x${string}`,
    network: isTestnet ? "eip155:13337" : "eip155:4337",
    port: parseInt(process.env.PORT ?? "3000", 10),
    gasWarningThreshold: BigInt(
      process.env.GAS_WARNING_THRESHOLD ?? "1000000000000000000"
    ),
    logLevel: (process.env.LOG_LEVEL ?? "info") as FacilitatorConfig["logLevel"],
  };
}
