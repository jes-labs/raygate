import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { paymentMiddleware } from "./middleware.js";
import { encodePayload, type BeamPaymentPayload } from "@raygate/core";
import http from "http";

const FACILITATOR_PORT = 9877;
const FACILITATOR_URL = `http://localhost:${FACILITATOR_PORT}`;

const samplePayload: BeamPaymentPayload = {
  scheme: "exact",
  network: "eip155:13337",
  owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  spender: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  amount: "1000000",
  nonce: "deadbeef01234567890abcdef0123456",
  deadline: 9999999999,
  signature: "0xabcdef" as `0x${string}`,
};

function createMockFacilitator(verifyResult: any, settleResult?: any) {
  const facilitator = express();
  facilitator.use(express.json());
  facilitator.post("/verify", (_req, res) => {
    res.json(verifyResult);
  });
  facilitator.post("/settle", (_req, res) => {
    res.json(settleResult ?? { success: true, txHash: "0x123" });
  });
  return facilitator;
}

function createResourceServer(facilitatorUrl: string, settlementMode: "sync" | "async" = "async") {
  const app = express();
  app.use(
    paymentMiddleware(
      {
        "GET /api/data": {
          accepts: [
            {
              scheme: "exact",
              network: "eip155:13337",
              maxAmountRequired: "1000000",
              asset: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
              payTo: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
              facilitatorUrl,
              description: "Test endpoint",
            },
          ],
          description: "Test data",
        },
      },
      { facilitatorUrl, settlementMode }
    )
  );
  app.get("/api/data", (_req, res) => {
    res.json({ data: "secret stuff" });
  });
  app.get("/api/free", (_req, res) => {
    res.json({ data: "free stuff" });
  });
  return app;
}

describe("paymentMiddleware", () => {
  let facilitatorServer: http.Server;

  afterEach(() => {
    if (facilitatorServer) {
      facilitatorServer.close();
    }
  });

  it("should return 402 when no PAYMENT-SIGNATURE header is present", async () => {
    const mockFacilitator = createMockFacilitator({ isValid: true });
    facilitatorServer = mockFacilitator.listen(FACILITATOR_PORT);

    const app = createResourceServer(FACILITATOR_URL);
    const res = await request(app).get("/api/data");

    expect(res.status).toBe(402);
    expect(res.body.x402Version).toBe(1);
    expect(res.body.accepts).toHaveLength(1);
    expect(res.body.error).toBe("Payment required");
  });

  it("should pass through non-gated routes", async () => {
    const mockFacilitator = createMockFacilitator({ isValid: true });
    facilitatorServer = mockFacilitator.listen(FACILITATOR_PORT);

    const app = createResourceServer(FACILITATOR_URL);
    const res = await request(app).get("/api/free");

    expect(res.status).toBe(200);
    expect(res.body.data).toBe("free stuff");
  });

  it("should pass through OPTIONS requests", async () => {
    const mockFacilitator = createMockFacilitator({ isValid: true });
    facilitatorServer = mockFacilitator.listen(FACILITATOR_PORT);

    const app = createResourceServer(FACILITATOR_URL);
    const res = await request(app).options("/api/data");

    // OPTIONS should not get 402
    expect(res.status).not.toBe(402);
  });

  it("should return 200 when payment is valid (async mode)", async () => {
    const mockFacilitator = createMockFacilitator({ isValid: true, invalidReason: null });
    facilitatorServer = mockFacilitator.listen(FACILITATOR_PORT);

    const app = createResourceServer(FACILITATOR_URL, "async");
    const encoded = encodePayload(samplePayload);

    const res = await request(app)
      .get("/api/data")
      .set("PAYMENT-SIGNATURE", encoded);

    expect(res.status).toBe(200);
    expect(res.body.data).toBe("secret stuff");
  });

  it("should return 402 when payment is invalid", async () => {
    const mockFacilitator = createMockFacilitator({
      isValid: false,
      invalidReason: "Invalid signature",
    });
    facilitatorServer = mockFacilitator.listen(FACILITATOR_PORT);

    const app = createResourceServer(FACILITATOR_URL);
    const encoded = encodePayload(samplePayload);

    const res = await request(app)
      .get("/api/data")
      .set("PAYMENT-SIGNATURE", encoded);

    expect(res.status).toBe(402);
    expect(res.body.error).toBe("Invalid signature");
  });

  it("should return 503 when facilitator is unreachable", async () => {
    // No facilitator running on this port
    const app = createResourceServer("http://localhost:19999");
    const encoded = encodePayload(samplePayload);

    const res = await request(app)
      .get("/api/data")
      .set("PAYMENT-SIGNATURE", encoded);

    expect(res.status).toBe(503);
    expect(res.body.error).toBe("Facilitator unavailable");
  });

  it("should include PAYMENT-RESPONSE header in sync mode", async () => {
    const settleResult = { success: true, txHash: "0xabc123" };
    const mockFacilitator = createMockFacilitator(
      { isValid: true, invalidReason: null },
      settleResult
    );
    facilitatorServer = mockFacilitator.listen(FACILITATOR_PORT);

    const app = createResourceServer(FACILITATOR_URL, "sync");
    const encoded = encodePayload(samplePayload);

    const res = await request(app)
      .get("/api/data")
      .set("PAYMENT-SIGNATURE", encoded);

    expect(res.status).toBe(200);
    expect(res.headers["payment-response"]).toBeDefined();
    const decoded = JSON.parse(
      Buffer.from(res.headers["payment-response"], "base64").toString()
    );
    expect(decoded.success).toBe(true);
  });

  it("should return 402 in sync mode when settlement fails", async () => {
    const mockFacilitator = createMockFacilitator(
      { isValid: true, invalidReason: null },
      { success: false, error: "Transaction reverted" }
    );
    facilitatorServer = mockFacilitator.listen(FACILITATOR_PORT);

    const app = createResourceServer(FACILITATOR_URL, "sync");
    const encoded = encodePayload(samplePayload);

    const res = await request(app)
      .get("/api/data")
      .set("PAYMENT-SIGNATURE", encoded);

    expect(res.status).toBe(402);
    expect(res.body.error).toBe("Settlement failed");
  });
});
