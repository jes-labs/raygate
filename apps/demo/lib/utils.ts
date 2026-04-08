import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatBalance(balance: string, decimals: number): string {
  const raw = BigInt(balance);
  const divisor = BigInt(10 ** decimals);
  const whole = raw / divisor;
  const frac = raw % divisor;
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, 4);
  return `${whole}.${fracStr}`;
}

export function beamExplorerUrl(txHash: string, testnet = true): string {
  const base = testnet
    ? "https://subnets-test.avax.network/beam"
    : "https://subnets.avax.network/beam";
  return `${base}/tx/${txHash}`;
}
