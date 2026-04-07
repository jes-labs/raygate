import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createSettleRouter } from "./settle.js";
import { encodePayload, type BeamPaymentPayload, type IdempotencyStore } from "@raygate/core";
import { MemoryIdempotencyStore } from "../store/memory.js";

const NETWORK = "eip155:13337" as const;
const TX_HASH = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as const;

const samplePayload: BeamPaymentPayload = {
  scheme: "exact",
  network: NETWORK,
  owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  spender: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  amount: "1000000",
  nonce: "deadbeef01234567890abcdef01234567890abcdef01234567890abcdef0123",
  deadline: 9999999999,
  signature: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab1c",
};

function createMockClients(opts: {
  writeContractResult?: `0x${string}`;
  writeContractError?: Error;
  receiptStatus?: "success" | "reverted";
  receiptError?: Error;
}) {
  const publicClient = {
    waitForTransactionReceipt: vi.fn().mockImplementation(async () => {
      if (opts.receiptError) throw opts.receiptError;
      return {
        status: opts.receiptStatus ?? "success",
        blockNumber: 12345n,
      };
    }),
    getBalance: vi.fn().mockResolvedValue(10n ** 18n),
  };

  const walletClient = {
    writeContract: vi.fn().mockImplementation(async () => {
      if (opts.writeContractError) throw opts.writeContractError;
      return opts.writeContractResult ?? TX_HASH;
    }),
    account: {
      address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as const,
    },
  };

  return { publicClient, walletClient };
}

function createApp(
  mockClients: ReturnType<typeof createMockClients>,
  store?: IdempotencyStore
) {
  const app = express();
  app.use(express.json());
  app.use(
    "/settle",
    createSettleRouter({
      publicClient: mockClients.publicClient as any,
      walletClient: mockClients.walletClient as any,
      idempotencyStore: store ?? new MemoryIdempotencyStore(),
      network: NETWORK,
      gasWarningThreshold: 10n ** 18n,
    })
  );
  return app;
}

describe("POST /settle", () => {
  it("should settle successfully", async () => {
    const mocks = createMockClients({ receiptStatus: "success" });
    const app = createApp(mocks);
    const encoded = encodePayload(samplePayload);

    const res = await request(app).post("/settle").send({
      paymentPayload: encoded,
      paymentRequirements: {
        payTo: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      },
    });

    expect(res.body.success).toBe(true);
    expect(res.body.txHash).toBe(TX_HASH);
    expect(res.body.blockNumber).toBe("12345");
    expect(res.body.network).toBe(NETWORK);
    expect(mocks.walletClient.writeContract).toHaveBeenCalledOnce();
  });

  it("should return cached result on idempotency hit", async () => {
    const store = new MemoryIdempotencyStore();
    const key = `${samplePayload.owner.toLowerCase()}:${samplePayload.nonce}`;
    await store.set(key, TX_HASH);

    const mocks = createMockClients({});
    const app = createApp(mocks, store);
    const encoded = encodePayload(samplePayload);

    const res = await request(app).post("/settle").send({
      paymentPayload: encoded,
      paymentRequirements: {
        payTo: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      },
    });

    expect(res.body.success).toBe(true);
    expect(res.body.cached).toBe(true);
    expect(res.body.txHash).toBe(TX_HASH);
    expect(mocks.walletClient.writeContract).not.toHaveBeenCalled();
  });

  it("should handle reverted transaction", async () => {
    const mocks = createMockClients({ receiptStatus: "reverted" });
    const app = createApp(mocks);
    const encoded = encodePayload(samplePayload);

    const res = await request(app).post("/settle").send({
      paymentPayload: encoded,
      paymentRequirements: {
        payTo: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      },
    });

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Transaction reverted on Beam");
    expect(res.body.txHash).toBe(TX_HASH);
  });

  it("should handle RPC timeout", async () => {
    const mocks = createMockClients({
      receiptError: new Error("Timeout waiting for transaction receipt"),
    });
    const app = createApp(mocks);
    const encoded = encodePayload(samplePayload);

    const res = await request(app).post("/settle").send({
      paymentPayload: encoded,
      paymentRequirements: {
        payTo: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      },
    });

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("RPC timeout");
  });

  it("should handle insufficient gas", async () => {
    const mocks = createMockClients({
      writeContractError: new Error("insufficient funds for gas"),
    });
    const app = createApp(mocks);
    const encoded = encodePayload(samplePayload);

    const res = await request(app).post("/settle").send({
      paymentPayload: encoded,
      paymentRequirements: {
        payTo: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      },
    });

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Insufficient gas on facilitator");
  });

  it("should return 400 for missing body", async () => {
    const mocks = createMockClients({});
    const app = createApp(mocks);

    const res = await request(app).post("/settle").send({});

    expect(res.status).toBe(400);
  });
});
