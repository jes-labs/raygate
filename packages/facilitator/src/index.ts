import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import {
  createPublicClient,
  createWalletClient,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getChainFromNetwork, decodePayload } from "@raygate/core";
import { createVerifyRouter } from "./routes/verify.js";
import { createSettleRouter } from "./routes/settle.js";
import { createCapabilitiesRouter } from "./routes/capabilities.js";
import { MemoryIdempotencyStore } from "./store/memory.js";
import { type FacilitatorConfig, loadConfig } from "./config.js";

export { createVerifyRouter } from "./routes/verify.js";
export { createSettleRouter } from "./routes/settle.js";
export { createCapabilitiesRouter } from "./routes/capabilities.js";
export { MemoryIdempotencyStore } from "./store/memory.js";
export { loadConfig, type FacilitatorConfig } from "./config.js";

/** Create the full facilitator Express app */
export function createFacilitatorApp(config: FacilitatorConfig): express.Express {
  const app = express();
  const chain = getChainFromNetwork(config.network);
  const rpcUrl =
    config.network === "eip155:13337"
      ? config.beamTestnetRpcUrl
      : config.beamRpcUrl;

  // Viem clients
  const account = privateKeyToAccount(config.facilitatorPrivateKey);
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  const idempotencyStore = new MemoryIdempotencyStore();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Rate limit on /settle to prevent gas draining
  const settleLimiter = rateLimit({
    windowMs: 1000,
    max: 10,
    keyGenerator: (req) => {
      try {
        const body = req.body;
        if (body?.paymentPayload) {
          const payload = decodePayload(body.paymentPayload);
          return `${payload.owner}:${payload.nonce}`;
        }
      } catch {
        // Fall through to default
      }
      return req.ip ?? "unknown";
    },
    message: { error: "Rate limit exceeded" },
  });

  // Routes
  app.use("/verify", createVerifyRouter(config.network));
  app.use("/settle", settleLimiter, createSettleRouter({
    publicClient: publicClient as any,
    walletClient: walletClient as any,
    idempotencyStore,
    network: config.network,
    gasWarningThreshold: config.gasWarningThreshold,
  }));
  app.use("/capabilities", createCapabilitiesRouter({
    network: config.network,
    usdcAddress: config.usdcBeamAddress,
    beamTokenAddress: config.beamTokenAddress,
  }));

  // Health check
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      network: config.network,
      facilitator: account.address,
      timestamp: Date.now(),
    });
  });

  return app;
}
