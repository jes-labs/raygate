import { describe, it, expect } from "vitest";
import {
  encodePayload,
  decodePayload,
  isValidAddress,
  addressEquals,
  safeParseBigInt,
} from "./codec.js";
import type { BeamPaymentPayload } from "./types.js";

const samplePayload: BeamPaymentPayload = {
  scheme: "exact",
  network: "eip155:13337",
  owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  spender: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  amount: "1000000",
  nonce: "deadbeef01234567890abcdef01234567890abcdef01234567890abcdef0123",
  deadline: 9999999999,
  signature: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab1c",
};

describe("encodePayload / decodePayload", () => {
  it("should roundtrip a payload through base64", () => {
    const encoded = encodePayload(samplePayload);
    expect(typeof encoded).toBe("string");
    // Should be valid base64
    expect(Buffer.from(encoded, "base64").toString("base64")).toBe(encoded);

    const decoded = decodePayload(encoded);
    expect(decoded).toEqual(samplePayload);
  });

  it("should throw on invalid base64 / JSON", () => {
    expect(() => decodePayload("not-valid!!!")).toThrow();
  });
});

describe("isValidAddress", () => {
  it("should accept valid 20-byte hex addresses", () => {
    expect(isValidAddress("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")).toBe(true);
    expect(isValidAddress("0x0000000000000000000000000000000000000000")).toBe(true);
  });

  it("should reject invalid addresses", () => {
    expect(isValidAddress("0x123")).toBe(false);
    expect(isValidAddress("not an address")).toBe(false);
    expect(isValidAddress(42)).toBe(false);
    expect(isValidAddress(null)).toBe(false);
    expect(isValidAddress("0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG")).toBe(false);
  });
});

describe("addressEquals", () => {
  it("should compare case-insensitively", () => {
    expect(
      addressEquals(
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        "0xF39FD6E51AAD88F6F4CE6AB8827279CFFFB92266"
      )
    ).toBe(true);
  });

  it("should reject different addresses", () => {
    expect(
      addressEquals(
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
      )
    ).toBe(false);
  });
});

describe("safeParseBigInt", () => {
  it("should parse valid bigint strings", () => {
    expect(safeParseBigInt("1000000")).toBe(1000000n);
    expect(safeParseBigInt("0")).toBe(0n);
  });

  it("should return null for invalid strings", () => {
    expect(safeParseBigInt("not a number")).toBe(null);
    expect(safeParseBigInt("12.34")).toBe(null);
  });
});
