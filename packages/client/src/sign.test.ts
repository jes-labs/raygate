import { describe, it, expect } from "vitest";
import { generateNonce, signPermitTransferFrom } from "./sign.js";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import { beamTestnet } from "@raygate/core";

const TEST_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

describe("generateNonce", () => {
  it("should return a 64-character hex string", () => {
    const nonce = generateNonce();
    expect(nonce).toMatch(/^[0-9a-f]{64}$/);
  });

  it("should generate different nonces each time", () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).not.toBe(b);
  });
});

describe("signPermitTransferFrom", () => {
  it("should produce a valid BeamPaymentPayload", async () => {
    const account = privateKeyToAccount(TEST_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: beamTestnet,
      transport: http(),
    });

    const payload = await signPermitTransferFrom({
      walletClient: walletClient as any,
      token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      amount: "1000000",
      spender: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      network: "eip155:13337",
    });

    expect(payload.scheme).toBe("exact");
    expect(payload.network).toBe("eip155:13337");
    expect(payload.owner).toBe(account.address);
    expect(payload.token).toBe("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
    expect(payload.amount).toBe("1000000");
    expect(payload.signature).toMatch(/^0x[0-9a-fA-F]+$/);
    expect(payload.nonce).toMatch(/^[0-9a-f]{64}$/);
    // Deadline should be ~30s from now
    const now = Math.floor(Date.now() / 1000);
    expect(payload.deadline).toBeGreaterThanOrEqual(now + 29);
    expect(payload.deadline).toBeLessThanOrEqual(now + 31);
  });
});
