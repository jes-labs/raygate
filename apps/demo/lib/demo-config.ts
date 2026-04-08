/**
 * Demo configuration — all addresses/keys loaded from environment.
 * In production these come from .env; for the demo they're set at deploy time.
 */
export const demoConfig = {
  // Network
  network: "eip155:13337" as const,
  chainId: 13337,
  rpcUrl: process.env.NEXT_PUBLIC_BEAM_TESTNET_RPC ?? "https://build.onbeam.com/rpc/testnet",

  // Wallets (public addresses only — private keys stay server-side)
  merchantWallet: (process.env.NEXT_PUBLIC_MERCHANT_WALLET ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  userWallet: (process.env.NEXT_PUBLIC_USER_WALLET ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  facilitatorWallet: (process.env.NEXT_PUBLIC_FACILITATOR_WALLET ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,

  // Tokens
  usdcAddress: (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
  beamTokenAddress: (process.env.NEXT_PUBLIC_BEAM_TOKEN_ADDRESS ?? "0xF65B6f9c94187276C7d91F4F74134751d248bFeA") as `0x${string}`,

  // Explorer
  explorerBaseUrl: "https://subnets-test.avax.network/beam",
};
