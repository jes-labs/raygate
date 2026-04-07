import { describe, it, expect, afterEach } from "vitest";
import express from "express";
import http from "http";
import { createBeamFetch } from "./fetch.js";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http as viemHttp } from "viem";
import { beamTestnet } from "@raygate/core";

const TEST_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

function createTestWalletClient() {
  const account = privateKeyToAccount(TEST_PRIVATE_KEY);
  return createWalletClient({
    account,
    chain: beamTestnet,
    transport: viemHttp(),
  });
}

function listenAsync(app: express.Express): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const addr = server.address() as { port: number };
      resolve({ server, port: addr.port });
    });
  });
}

describe("createBeamFetch", () => {
  const servers: http.Server[] = [];

  afterEach(() => {
    servers.forEach((s) => s.close());
    servers.length = 0;
  });

  it("should return directly on 200 (no payment needed)", async () => {
    const resource = express();
    resource.get("/api/free", (_req, res) => res.json({ data: "free" }));
    const { server: rs, port: rPort } = await listenAsync(resource);
    servers.push(rs);

    const facilitator = express();
    facilitator.get("/health", (_req, res) =>
      res.json({ facilitator: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" })
    );
    const { server: fs, port: fPort } = await listenAsync(facilitator);
    servers.push(fs);

    const walletClient = createTestWalletClient();
    const beamFetch = await createBeamFetch({
      walletClient: walletClient as any,
      facilitatorUrl: `http://localhost:${fPort}`,
      network: "eip155:13337",
    });

    const res = await beamFetch(`http://localhost:${rPort}/api/free`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toBe("free");
  });

  it("should handle 402 → sign → retry → 200 flow", async () => {
    const facilitator = express();
    facilitator.get("/health", (_req, res) =>
      res.json({ facilitator: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" })
    );
    const { server: fs, port: fPort } = await listenAsync(facilitator);
    servers.push(fs);

    let requestCount = 0;
    const resource = express();
    resource.get("/api/paid", (req, res) => {
      requestCount++;
      if (!req.headers["payment-signature"]) {
        res.status(402).json({
          x402Version: 1,
          accepts: [
            {
              scheme: "exact",
              network: "eip155:13337",
              maxAmountRequired: "1000000",
              asset: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
              payTo: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
              facilitatorUrl: `http://localhost:${fPort}`,
              description: "Test",
            },
          ],
          error: "Payment required",
        });
      } else {
        res.json({ data: "paid content" });
      }
    });
    const { server: rs, port: rPort } = await listenAsync(resource);
    servers.push(rs);

    const walletClient = createTestWalletClient();
    const beamFetch = await createBeamFetch({
      walletClient: walletClient as any,
      facilitatorUrl: `http://localhost:${fPort}`,
      network: "eip155:13337",
    });

    const res = await beamFetch(`http://localhost:${rPort}/api/paid`);
    const body = await res.json();

    expect(requestCount).toBe(2);
    expect(res.status).toBe(200);
    expect(body.data).toBe("paid content");
  });

  it("should throw when retry also returns 402", async () => {
    const facilitator = express();
    facilitator.get("/health", (_req, res) =>
      res.json({ facilitator: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" })
    );
    const { server: fs, port: fPort } = await listenAsync(facilitator);
    servers.push(fs);

    const resource = express();
    resource.get("/api/reject", (_req, res) => {
      res.status(402).json({
        x402Version: 1,
        accepts: [
          {
            scheme: "exact",
            network: "eip155:13337",
            maxAmountRequired: "1000000",
            asset: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            payTo: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            facilitatorUrl: `http://localhost:${fPort}`,
            description: "Test",
          },
        ],
        error: "Always rejected",
      });
    });
    const { server: rs, port: rPort } = await listenAsync(resource);
    servers.push(rs);

    const walletClient = createTestWalletClient();
    const beamFetch = await createBeamFetch({
      walletClient: walletClient as any,
      facilitatorUrl: `http://localhost:${fPort}`,
      network: "eip155:13337",
    });

    await expect(
      beamFetch(`http://localhost:${rPort}/api/reject`)
    ).rejects.toThrow("Payment rejected by facilitator");
  });
});
