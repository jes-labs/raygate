# Raygate

**The x402 Payment Facilitator for Beam**

Pay-per-request API monetization settled on-chain. No accounts. No API keys. No subscriptions.

[![Beam](https://img.shields.io/badge/chain-Beam-8B5CF6?style=flat-square)](https://docs.onbeam.com)
[![x402](https://img.shields.io/badge/protocol-x402-000000?style=flat-square)](https://www.x402.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)

---

## The Problem

Every paid API today requires the same ritual: create an account, add a credit card, generate an API key, manage rate limits, reconcile invoices. This model breaks down for three reasons:

1. **AI agents can't sign up for accounts.** The agentic economy runs on autonomous software that needs to pay for services without a human in the loop.
2. **Micropayments don't work with credit cards.** Charging $0.001 per API call through Stripe costs more in fees than the payment itself.
3. **Beam has no x402 facilitator.** Base, Solana, Stellar, XRPL, and Polygon all have one. Beam — despite being purpose-built for gaming, AI, and compute — does not.

Raygate fixes all three.

## Why Beam Needs This Now

The x402 protocol turns HTTP into a payment rail. Any API can return `402 Payment Required` with a price, and any client — human or machine — can pay and retry in a single round-trip. No middleware. No billing vendor. No accounts.

Beam's own verticals are the exact sectors driving x402 adoption everywhere else:

| Beam Vertical | x402 Use Case |
|---|---|
| **Gaming** | Pay-per-asset lookup, pay-per-level unlock, in-game item purchases |
| **AI (beamAI)** | Pay-per-inference, pay-per-token, agent-to-agent commerce |
| **DeFi** | Pay-per-query market data, pay-per-signal trading alerts |
| **Compute** | Pay-per-compute-unit, decentralized GPU rental |

Every other major EVM chain already participates in the machine-native payment economy. Without an x402 facilitator, Beam's APIs, gaming assets, and AI inference endpoints are invisible to the thousands of AI agents already making autonomous payments across the x402 ecosystem.

**Raygate is the bridge.** It makes Beam a first-class citizen in the agentic economy — and it's the first to do it.

## How It Works

```
Client (AI Agent / Browser)          Resource Server              Raygate Facilitator          Beam
        │                                  │                              │                      │
        │──── GET /api/data ──────────────>│                              │                      │
        │<─── 402 Payment Required ────────│                              │                      │
        │                                  │                              │                      │
        │  [sign Permit2 EIP-712 payload]  │                              │                      │
        │                                  │                              │                      │
        │──── GET /api/data ──────────────>│                              │                      │
        │     + PAYMENT-SIGNATURE header   │── POST /verify ─────────────>│                      │
        │                                  │<─ { isValid: true } ─────────│                      │
        │                                  │                              │                      │
        │<─── 200 OK + data ──────────────│── POST /settle ─────────────>│                      │
        │                                  │                              │── permitTransferFrom─>│
        │                                  │                              │<── tx confirmed ──────│
        │                                  │<─ { txHash } ───────────────│                      │
```

**Verify** is local — pure EIP-712 signature check, zero RPC calls, under 50ms.

**Settle** is atomic — Permit2 verifies the signature, transfers tokens from payer to merchant, and marks the nonce as used in a single transaction. ~3 seconds on Beam.

**The payer never submits a transaction.** They sign an off-chain message. The facilitator pays gas. From the payer's perspective, it's gasless.

## Why Permit2, Not EIP-3009

The standard x402 EVM scheme uses `transferWithAuthorization` (EIP-3009), which USDC on Base natively supports. But Beam uses LayerZero-bridged USDC — an OFT wrapper that doesn't implement EIP-3009.

[Permit2](https://github.com/Uniswap/permit2) (Uniswap's universal token allowance contract) solves this cleanly:

- Works with **any ERC-20** — USDC, BEAM token, any future Beam ecosystem token
- **Already deployed** on Beam at `0x000000000022D473030F116dDEE9F6B43aC78BA3`
- **No contract deployment** required
- Nonce bitmap provides **on-chain replay protection**
- One-time `approve(Permit2, maxUint256)` per token, then every payment is a pure off-chain signature

## Packages

| Package | Description |
|---|---|
| [`@raygate/core`](./packages/core) | Shared types, Permit2 ABI, Beam chain definitions, encoding utilities |
| [`@raygate/facilitator`](./packages/facilitator) | Standalone Express service — `/verify`, `/settle`, `/capabilities`, `/health` |
| [`@raygate/express`](./packages/express) | One-line Express middleware for gating any route with x402 payments |
| [`@raygate/client`](./packages/client) | Client library — `beamFetch()` handles the full 402 → sign → retry loop |

## Quick Start

### Gate an API (Resource Server)

```bash
pnpm add @raygate/express
```

```typescript
import express from "express";
import { paymentMiddleware } from "@raygate/express";

const app = express();

app.use(paymentMiddleware({
  "GET /api/market-data": {
    description: "Beam market data",
    accepts: [{
      scheme: "exact",
      network: "eip155:4337",
      maxAmountRequired: "100000",  // 0.10 USDC
      asset: "0xUSDC_BEAM_ADDRESS",
      payTo: "0xYOUR_MERCHANT_WALLET",
      facilitatorUrl: "https://facilitator.raygate.dev",
      description: "Market data feed",
    }],
  },
}, {
  facilitatorUrl: "https://facilitator.raygate.dev",
}));

app.get("/api/market-data", (_req, res) => {
  res.json({ price: 0.0234, volume: 1_200_000 });
});

app.listen(8080);
```

### Pay for an API (AI Agent / Client)

```bash
pnpm add @raygate/client
```

```typescript
import { createBeamFetch, approvePermit2 } from "@raygate/client";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { beam } from "@raygate/core";

const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY);
const walletClient = createWalletClient({ account, chain: beam, transport: http() });
const publicClient = createPublicClient({ chain: beam, transport: http() });

// One-time: approve Permit2 to spend USDC
await approvePermit2(walletClient, publicClient, "0xUSDC_BEAM_ADDRESS");

// Create a payment-aware fetch
const beamFetch = await createBeamFetch({
  walletClient,
  facilitatorUrl: "https://facilitator.raygate.dev",
  network: "eip155:4337",
});

// Use it like normal fetch — payments are handled transparently
const res = await beamFetch("https://api.example.com/api/market-data");
const data = await res.json();
```

### Run the Facilitator

```bash
pnpm add @raygate/facilitator
```

```typescript
import { createFacilitatorApp, loadConfig } from "@raygate/facilitator";

const config = loadConfig();
const app = createFacilitatorApp(config);

app.listen(config.port, () => {
  console.log(`Raygate facilitator running on port ${config.port}`);
});
```

Required environment variables — see [`.env.example`](./.env.example) for the full list.

## Architecture

```
raygate/
├── packages/
│   ├── core/               # Shared types, Permit2 ABI, Beam chain defs
│   ├── facilitator/        # Express service: /verify, /settle, /capabilities
│   ├── express/            # Drop-in payment middleware
│   └── client/             # beamFetch() + Permit2 signing
├── apps/
│   └── demo/               # Demo application (coming soon)
├── pnpm-workspace.yaml
└── vitest.config.ts
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Dev mode (facilitator with hot reload)
pnpm --filter @raygate/facilitator dev
```

## Roadmap

**This TypeScript implementation** is the proof-of-concept: ship fast, validate on Beam testnet, demonstrate the x402 flow end-to-end, and pitch to the Beam Foundation.

**The Go implementation** is the production target: goroutine-per-request concurrency, PostgreSQL-backed idempotency, Redis caching, Prometheus metrics, OpenTelemetry tracing, Helm charts, and 1,000+ RPS sustained throughput.

| Phase | Milestone | Status |
|---|---|---|
| 1 | Core packages + facilitator + middleware + client | Done |
| 2 | Demo application (gated Beam API + frontend) | Next |
| 3 | npm publish + documentation + demo video | Planned |
| 4 | Beam Foundation pitch + x402.org ecosystem listing | Planned |
| 5 | Go production implementation | Planned |

## Token Support

| Token | Decimals | Example Price | Amount String |
|---|---|---|---|
| USDC (LayerZero-bridged) | 6 | $0.10 | `"100000"` |
| BEAM | 18 | 0.001 BEAM | `"1000000000000000"` |

Additional Beam ecosystem ERC-20 tokens can be supported without code changes — Permit2 works with any ERC-20.

## Security

- **Signatures are verified locally** — no RPC calls in `/verify`, no network latency, no external dependency
- **Permit2 nonce bitmaps** provide on-chain replay protection — each signature can only be used once
- **Facilitator wallet is gas-only** — it never holds user funds; tokens flow directly from payer to merchant
- **Deadlines** are enforced both off-chain (30s grace for clock skew) and on-chain by the Permit2 contract
- **Rate limiting** on `/settle` prevents gas-draining attacks

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

## License

[MIT](./LICENSE)

---

**Raygate** — Bringing Beam into the machine-native payment economy.

[x402 Protocol](https://www.x402.org) · [Beam Docs](https://docs.onbeam.com) · [Permit2](https://github.com/Uniswap/permit2)
