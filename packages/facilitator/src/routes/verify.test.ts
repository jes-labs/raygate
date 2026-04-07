import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createVerifyRouter } from "./verify.js";
import { encodePayload, type BeamPaymentPayload } from "@raygate/core";
import { privateKeyToAccount } from "viem/accounts";
import { permit2Domain, PERMIT_TRANSFER_FROM_TYPES, NETWORK_TO_CHAIN_ID } from "@raygate/core";

const TEST_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const TEST_ACCOUNT = privateKeyToAccount(TEST_PRIVATE_KEY);
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as const;
const SPENDER = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as const;
const NETWORK = "eip155:13337" as const;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/verify", createVerifyRouter(NETWORK));
  return app;
}

async function buildValidPayload(overrides?: Partial<BeamPaymentPayload>): Promise<BeamPaymentPayload> {
  const nonce = "deadbeef01234567890abcdef01234567890abcdef01234567890abcdef0123";
  const deadline = Math.floor(Date.now() / 1000) + 300;
  const amount = "1000000";

  const chainId = NETWORK_TO_CHAIN_ID[NETWORK];
  const domain = permit2Domain(chainId);
  const message = {
    permitted: { token: USDC_ADDRESS, amount: BigInt(amount) },
    spender: SPENDER,
    nonce: BigInt(`0x${nonce}`),
    deadline: BigInt(deadline),
  };

  const signature = await TEST_ACCOUNT.signTypedData({
    domain,
    types: PERMIT_TRANSFER_FROM_TYPES,
    primaryType: "PermitTransferFrom",
    message,
  });

  return {
    scheme: "exact",
    network: NETWORK,
    owner: TEST_ACCOUNT.address,
    spender: SPENDER,
    token: USDC_ADDRESS,
    amount,
    nonce,
    deadline,
    signature,
    ...overrides,
  };
}

describe("POST /verify", () => {
  it("should return isValid: true for a correctly signed payload", async () => {
    const app = createApp();
    const payload = await buildValidPayload();
    const encoded = encodePayload(payload);

    const res = await request(app).post("/verify").send({
      paymentPayload: encoded,
      paymentRequirements: {
        tokenAddress: USDC_ADDRESS,
        maxAmountRequired: "1000000",
        payTo: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.isValid).toBe(true);
    expect(res.body.invalidReason).toBeNull();
  });

  it("should reject expired deadline", async () => {
    const app = createApp();
    const payload = await buildValidPayload({ deadline: Math.floor(Date.now() / 1000) - 60 });
    const encoded = encodePayload(payload);

    const res = await request(app).post("/verify").send({
      paymentPayload: encoded,
      paymentRequirements: {
        tokenAddress: USDC_ADDRESS,
        maxAmountRequired: "1000000",
        payTo: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      },
    });

    expect(res.body.isValid).toBe(false);
    expect(res.body.invalidReason).toBe("Payment deadline expired");
  });

  it("should reject wrong network", async () => {
    const app = createApp();
    const payload = await buildValidPayload({ network: "eip155:4337" });
    const encoded = encodePayload(payload);

    const res = await request(app).post("/verify").send({
      paymentPayload: encoded,
      paymentRequirements: {
        tokenAddress: USDC_ADDRESS,
        maxAmountRequired: "1000000",
        payTo: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      },
    });

    expect(res.body.isValid).toBe(false);
    expect(res.body.invalidReason).toBe("Wrong network");
  });

  it("should reject token mismatch", async () => {
    const app = createApp();
    const payload = await buildValidPayload();
    const encoded = encodePayload(payload);

    const res = await request(app).post("/verify").send({
      paymentPayload: encoded,
      paymentRequirements: {
        tokenAddress: "0x4200000000000000000000000000000000000023",
        maxAmountRequired: "1000000",
        payTo: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      },
    });

    expect(res.body.isValid).toBe(false);
    expect(res.body.invalidReason).toBe("Token mismatch");
  });

  it("should reject insufficient amount", async () => {
    const app = createApp();
    const payload = await buildValidPayload({ amount: "50000" });
    const encoded = encodePayload(payload);

    const res = await request(app).post("/verify").send({
      paymentPayload: encoded,
      paymentRequirements: {
        tokenAddress: USDC_ADDRESS,
        maxAmountRequired: "100000",
        payTo: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      },
    });

    expect(res.body.isValid).toBe(false);
    expect(res.body.invalidReason).toBe("Insufficient amount");
  });

  it("should reject invalid signature (tampered)", async () => {
    const app = createApp();
    const payload = await buildValidPayload();
    // Tamper the signature
    payload.signature = "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
    const encoded = encodePayload(payload);

    const res = await request(app).post("/verify").send({
      paymentPayload: encoded,
      paymentRequirements: {
        tokenAddress: USDC_ADDRESS,
        maxAmountRequired: "1000000",
        payTo: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      },
    });

    expect(res.body.isValid).toBe(false);
    expect(res.body.invalidReason).toBe("Invalid signature");
  });

  it("should reject malformed payload", async () => {
    const app = createApp();

    const res = await request(app).post("/verify").send({
      paymentPayload: "not-valid-base64!!!",
      paymentRequirements: {
        tokenAddress: USDC_ADDRESS,
        maxAmountRequired: "1000000",
        payTo: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      },
    });

    expect(res.body.isValid).toBe(false);
    expect(res.body.invalidReason).toBe("Malformed payload");
  });

  it("should return 400 for missing body fields", async () => {
    const app = createApp();

    const res = await request(app).post("/verify").send({});

    expect(res.status).toBe(400);
  });
});
