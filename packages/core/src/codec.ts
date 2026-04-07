import type { BeamPaymentPayload } from "./types.js";

/** Encode a BeamPaymentPayload to base64 string for the PAYMENT-SIGNATURE header */
export function encodePayload(payload: BeamPaymentPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, "utf-8").toString("base64");
}

/** Decode a base64-encoded PAYMENT-SIGNATURE header to a BeamPaymentPayload */
export function decodePayload(encoded: string): BeamPaymentPayload {
  const json = Buffer.from(encoded, "base64").toString("utf-8");
  return JSON.parse(json) as BeamPaymentPayload;
}

/** Validate that a string is a valid 20-byte hex address */
export function isValidAddress(value: unknown): value is `0x${string}` {
  return (
    typeof value === "string" &&
    /^0x[0-9a-fA-F]{40}$/.test(value)
  );
}

/** Case-insensitive address comparison */
export function addressEquals(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/** Safely parse a string to BigInt, returning null on failure */
export function safeParseBigInt(value: string): bigint | null {
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}
