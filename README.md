# Raygate

**The x402 Payment Facilitator for Beam**

Pay-per-request API monetization settled on-chain. No accounts. No API keys. No subscriptions.

[![Beam](https://img.shields.io/badge/chain-Beam-8B5CF6?style=flat-square)](https://docs.onbeam.com)
[![x402](https://img.shields.io/badge/protocol-x402-000000?style=flat-square)](https://www.x402.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)

**[Live Link](https://raygate.vercel.app)** · **[Demo Video](https://www.youtube.com/watch?v=Ryw7OkVKnpM)** · **[Pitchdeck](https://gamma.app/docs/Raygate-uk9fxeaapmyx3pj)**

---

## The Problem

Every paid API today requires the same ritual: create an account, add a credit card, generate an API key, manage rate limits, reconcile invoices. This model breaks down for three reasons:

1. **AI agents can't sign up for accounts.** The agentic economy runs on autonomous software that needs to pay for services without a human in the loop.
2. **Micropayments don't work with credit cards.** Charging $0.001 per API call through Stripe costs more in fees than the payment itself.
3. **Beam has no x402 facilitator.** Base, Solana, Stellar, XRPL, and Polygon all have one. Beam despite being purpose-built for gaming, AI, and compute does not.

Raygate fixes all three.

## Why Beam Needs This Now

The x402 protocol turns HTTP into a payment rail. Any API can return `402 Payment Required` with a price, and any client human or machine can pay and retry in a single round-trip. No middleware. No billing vendor. No accounts.

Beam's own verticals are the exact sectors driving x402 adoption everywhere else:

| Beam Vertical | x402 Use Case |
|---|---|
| **Gaming** | Pay-per-asset lookup, pay-per-level unlock, in-game item purchases |
| **AI (beamAI)** | Pay-per-inference, pay-per-token, agent-to-agent commerce |
| **DeFi** | Pay-per-query market data, pay-per-signal trading alerts |
| **Compute** | Pay-per-compute-unit, decentralized GPU rental |

Every other major EVM chain already participates in the machine-native payment economy. Without an x402 facilitator, Beam's APIs, gaming assets, and AI inference endpoints are invisible to the thousands of AI agents already making autonomous payments across the x402 ecosystem.

**Raygate is the bridge.** It makes Beam a first-class citizen in the agentic economy and it's the first to do it.

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

**Verify** is local pure EIP-712 signature check, zero RPC calls, under 50ms.

**Settle** is atomic Permit2 verifies the signature, transfers tokens from payer to merchant, and marks the nonce as used in a single transaction. ~3 seconds on Beam.

**The payer never submits a transaction.** They sign an off-chain message. The facilitator pays gas. From the payer's perspective, it's gasless.

## Why Permit2, Not EIP-3009

The standard x402 EVM scheme uses `transferWithAuthorization` (EIP-3009), which USDC on Base natively supports. But Beam uses LayerZero-bridged USDC — an OFT wrapper that doesn't implement EIP-3009.

[Permit2](https://github.com/Uniswap/permit2) (Uniswap's universal token allowance contract) solves this cleanly:

- Works with **any ERC-20** — USDC, WBEAM (WMC), USDT, or any future Beam ecosystem token
- **Deployed by Raygate** at the canonical address [`0x000000000022D473030F116dDEE9F6B43aC78BA3`](https://subnets-test.avax.network/beam/address/0x000000000022D473030F116dDEE9F6B43aC78BA3) on Beam testnet via deterministic CREATE2
- Nonce bitmap provides **on-chain replay protection**
- One-time `approve(Permit2, maxUint256)` per token, then every payment is a pure off-chain signature
- Facilitator pays gas — payers never submit transactions

### Permit2 on Beam

Permit2 was not previously deployed on Beam. As part of building Raygate, we deployed it on Beam testnet using the deterministic CREATE2 factory (`0x4e59b44847b379578588920cA78FbF26c0B4956C`) that was already present on the chain. By replaying the exact deployment calldata used on Ethereum and Avalanche C-Chain, Permit2 now lives at the same canonical address on Beam testnet — meaning any tooling or SDK that works with Permit2 on other chains works identically on Beam.

View the deployed contract: [Permit2 on Beam Testnet Explorer](https://subnets-test.avax.network/beam/address/0x000000000022D473030F116dDEE9F6B43aC78BA3)

Mainnet deployment will follow before production launch.

### What's Next: User as `from` via ERC-4337

Today, the facilitator wallet appears as `from` on every settlement transaction — matching the standard x402 design used by Coinbase on Base and other chains. But Beam already has ERC-4337 infrastructure deployed (EntryPoint + Paymaster), which opens a path to a stronger model.

In the production Go implementation, we plan to integrate ERC-4337 Account Abstraction so that **the user appears as `from`** on each settlement while the **facilitator's Paymaster sponsors the gas**. This means:

- On-chain history shows which users are calling which APIs — a richer activity graph
- The facilitator still covers gas, preserving the gasless payer experience
- Beam gets a genuinely unique x402 implementation that no other chain's facilitator has

This is documented in the [Raygate Whitepaper](./WHITEPAPER.md) as a Phase 2 milestone.

### Token Approval (One-Time Setup)

Before Permit2 can transfer tokens on a payer's behalf, the payer must approve Permit2 to spend each token. This is a **one-time on-chain transaction** per token per wallet:

```typescript
import { approvePermit2 } from "@raygate/client";

// Approve Permit2 for USDC (one-time)
await approvePermit2(walletClient, publicClient, USDC_ADDRESS);

// Approve Permit2 for WBEAM (one-time)
await approvePermit2(walletClient, publicClient, WBEAM_ADDRESS);
```

After approval, every subsequent payment is a gasless off-chain EIP-712 signature.

## Packages

| Package | Description |
|---|---|
| [`@raygate/core`](./packages/core) | Shared types, Permit2 ABI, Beam chain definitions, encoding utilities |
| [`@raygate/facilitator`](./packages/facilitator) | Standalone Express service `/verify`, `/settle`, `/capabilities`, `/health` |
| [`@raygate/express`](./packages/express) | One-line Express middleware for gating any route with x402 payments |
| [`@raygate/client`](./packages/client) | Client library — `beamFetch()` for the 402 → sign → retry loop, `approvePermit2()` for one-time token approval |

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

Required environment variables see [`.env.example`](./.env.example) for the full list.

## Architecture

```
raygate/
├── packages/
│   ├── core/               # Shared types, Permit2 ABI, Beam chain defs
│   ├── facilitator/        # Express service: /verify, /settle, /capabilities
│   ├── express/            # Drop-in payment middleware
│   └── client/             # beamFetch() + Permit2 signing
├── apps/
│   └── demo/               # Interactive demo (Next.js) — live on Beam testnet
├── scripts/
│   ├── deploy-permit2.ts   # Deploy Permit2 on Beam via deterministic CREATE2
│   └── permit2-calldata.hex
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
| 2 | Deploy Permit2 on Beam testnet | Done |
| 3 | Demo application (playground + docs) | Done |
| 4 | npm publish + documentation + demo video | Planned |
| 5 | Beam Foundation pitch + x402.org ecosystem listing | Planned |
| 6 | Go production implementation | Planned |

## Token Support

| Token | Symbol | Decimals | Testnet Address | Mainnet Address |
|---|---|---|---|---|
| USD Coin | USDC | 6 | `0x007Fdc86FD12924C9116025C7F594843087397E3` | `0x76BF5E7d2Bcb06b1444C0a2742780051D8D0E304` |
| Wrapped BEAM | WBEAM (WMC) | 18 | `0xF65B6f9c94187276C7d91F4F74134751d248bFeA` | `0xD51BFa777609213A653a2CD067c9A0132a2D316A` |

**Note:** BEAM is the native gas token (like ETH). WBEAM is the ERC-20 wrapped version (on-chain symbol: `WMC` — Wrapped Merit Circle, from Beam's original name). Permit2 requires ERC-20 tokens, so payments in BEAM use the WBEAM wrapper.

Additional Beam ecosystem ERC-20 tokens can be supported without code changes — Permit2 works with any ERC-20.

## Security

- **Signatures are verified locally** no RPC calls in `/verify`, no network latency, no external dependency
- **Permit2 nonce bitmaps** provide on-chain replay protection each signature can only be used once
- **Facilitator wallet is gas-only** it never holds user funds; tokens flow directly from payer to merchant
- **Deadlines** are enforced both off-chain (30s grace for clock skew) and on-chain by the Permit2 contract
- **Rate limiting** on `/settle` prevents gas-draining attacks

## Whitepaper

For the full technical story — the problem, the Permit2 decision, architecture, security model, what we learned deploying on Beam, and the roadmap including ERC-4337 integration — read the [Raygate Whitepaper](./WHITEPAPER.md).

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

## License

[MIT](./LICENSE)

---

**Raygate** Bringing Beam into the machine-native payment economy.

[x402 Protocol](https://www.x402.org) · [Beam Docs](https://docs.onbeam.com) · [Permit2](https://github.com/Uniswap/permit2)
