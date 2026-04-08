# Raygate: Bringing x402 Payments to Beam

**April 2026**

---

## Abstract

Raygate is the first x402 payment facilitator for the Beam blockchain. It allows any HTTP API running on Beam to charge per-request fees settled on-chain, without requiring accounts, API keys, subscriptions, or custodial payment processors. Payments flow directly from payer to merchant through Uniswap's Permit2 contract, while the facilitator covers gas. The payer signs an off-chain message; the facilitator handles everything else.

This paper explains why Beam needs x402, how Raygate works at a technical level, the challenges we encountered building it, and where the project is headed.

---

## 1. The Problem

### 1.1 APIs Are Hard to Monetize

Most developers who build APIs face an ugly choice. They can give the API away for free and hope it drives adoption. Or they can put it behind a paywall, which means building account systems, integrating a payment processor like Stripe, issuing API keys, managing rate limits, handling failed payments, and reconciling invoices at the end of the month.

Neither option works well for micropayments. If an API call is worth $0.001, the overhead of credit card processing alone makes it uneconomical. Stripe takes 2.9% + $0.30 per transaction. At $0.001 per call, you lose money on every request.

### 1.2 AI Agents Can't Sign Up for Accounts

The bigger shift is that API consumers are increasingly not human. AI agents - autonomous software that browses, plans, and acts on behalf of users - are the fastest-growing class of API consumers. LangChain, Mastra, Vercel AI SDK, and similar frameworks are producing agents that need to discover services, evaluate pricing, and pay, all without a human clicking buttons.

These agents cannot create accounts. They cannot enter credit card details. They cannot solve CAPTCHAs or complete KYC forms. Every traditional API monetization model assumes a human is in the loop at signup time. That assumption is breaking.

### 1.3 Beam Is Missing from the x402 Ecosystem

The x402 protocol, pioneered by Coinbase, solves this by embedding payment into HTTP itself. When a server wants payment, it returns HTTP 402 (Payment Required) with a price. The client signs a payment authorization, attaches it to the retry, and the server settles it on-chain. No accounts. No API keys. Just HTTP and a wallet.

Facilitator implementations exist on Base, Solana, Stellar, XRPL, Polygon, HyperEVM, BNB Chain, Near, Sui, and Avalanche C-Chain. Beam (an EVM-compatible Layer 1 built as an Avalanche subnet), with active verticals in gaming, AI, DeFi, and compute, does not have one.

This is a gap worth filling. Beam's own verticals are the exact sectors where x402 is gaining traction everywhere else. Gaming needs pay-per-asset and pay-per-level models. AI inference needs pay-per-token pricing. DeFi data feeds need pay-per-query access. Compute providers need pay-per-unit billing. All of these map directly to x402's per-request payment model.

---

## 2. How x402 Works

The x402 protocol adds a payment layer to HTTP without changing the protocol itself. It uses the existing `402 Payment Required` status code, which has been reserved in the HTTP specification since 1997 but never had a standard implementation until now.

The flow works like this:

1. A client sends a normal HTTP request to an API endpoint.
2. The server checks for a payment header. Finding none, it returns 402 with a JSON body describing what payment it accepts: which token, how much, which wallet to pay, and where the facilitator is.
3. The client reads the 402 response, constructs a signed payment authorization, and retries the request with the signature attached in a `PAYMENT-SIGNATURE` header.
4. The server forwards the signature to the facilitator for verification.
5. If valid, the server processes the request and returns the data.
6. The facilitator settles the payment on-chain, transferring tokens from the payer's wallet to the merchant's wallet.

The entire round-trip adds about 2-3 seconds to the request on Beam, most of which is waiting for on-chain confirmation. The verification step is pure cryptography and takes under 50 milliseconds.

---

## 3. The Permit2 Decision

### 3.1 Why Not EIP-3009

The standard x402 EVM implementation, as used on Base, relies on EIP-3009 - a standard called `transferWithAuthorization` that USDC on Base natively supports. With EIP-3009, the payer signs an authorization message, and anyone (the facilitator) can submit it to the token contract to execute the transfer.

This does not work on Beam. Beam uses LayerZero-bridged USDC, which is an Omnichain Fungible Token (OFT) wrapper around the standard USDC. This wrapper implements the basic ERC-20 interface but does not include EIP-3009's `transferWithAuthorization` function. A direct port of the Base facilitator to Beam would fail at the settlement step.

### 3.2 Permit2 as the Solution

Uniswap's Permit2 contract provides the same capability (gasless signed token transfers), but works with any ERC-20 token, not just those that implement specific extensions. The payer approves Permit2 once (a standard ERC-20 `approve` call), and after that, every payment is a pure off-chain EIP-712 signature.

Permit2 uses a nonce bitmap for replay protection. Each signature includes a random nonce, and the contract marks that nonce as consumed when the transfer executes. Attempting to reuse a nonce causes the transaction to revert. This is the same level of replay protection that EIP-3009 provides, just implemented differently.

The contract is designed to be deployed at the same address on every EVM chain: `0x000000000022D473030F116dDEE9F6B43aC78BA3`. It uses deterministic CREATE2 deployment, meaning the same bytecode deployed through the same factory with the same salt produces the same address regardless of which chain it runs on.

### 3.3 Deploying Permit2 on Beam

We discovered during development that Permit2 was not deployed on Beam — neither testnet nor mainnet. The deterministic deployment proxy (`0x4e59b44847b379578588920cA78FbF26c0B4956C`) was present on Beam, but nobody had sent the Permit2 deployment calldata to it.

We extracted the original deployment transaction from Avalanche C-Chain (where Permit2 was already deployed), replayed the identical calldata to the same CREATE2 factory on Beam testnet, and Permit2 appeared at the canonical address. The deployment transaction is verifiable on the [Beam Testnet Explorer](https://subnets-test.avax.network/beam/address/0x000000000022D473030F116dDEE9F6B43aC78BA3).

This deployment is not specific to Raygate. Any project on Beam that needs Permit2 — DEX aggregators, intent-based protocols, gasless transfer tools — can now use it at the standard address.

---

## 4. Architecture

Raygate has four components, each published as a separate npm package.

### 4.1 Core (`@raygate/core`)

Shared types, constants, and utilities. Defines the Beam chain configuration for viem, the Permit2 ABI, EIP-712 type definitions, and encoding/decoding functions for the payment payload format. Everything else imports from core.

### 4.2 Facilitator (`@raygate/facilitator`)

A standalone Express service with four endpoints:

- **POST /verify** — Takes a signed payment payload and validates it locally. Checks the deadline, network, token address, amount, and EIP-712 signature. This is pure cryptography — no RPC calls, no network I/O. Returns valid or invalid with a reason.

- **POST /settle** — Takes a verified payment payload and submits `Permit2.permitTransferFrom` to Beam. Waits for the transaction receipt. Includes an idempotency layer keyed on `owner:nonce` to prevent duplicate settlements if the same payload is submitted twice.

- **GET /capabilities** — Returns what the facilitator supports: which networks, which tokens, which payment schemes.

- **GET /health** — Liveness check. Reports the facilitator's wallet address and network.

The facilitator is the only component that needs a funded wallet (for gas) and an RPC connection to Beam. It never holds user funds or merchant funds — tokens flow directly from payer to merchant through Permit2.

### 4.3 Express Middleware (`@raygate/express`)

A drop-in middleware for Express applications. A developer configures which routes require payment and at what price. The middleware handles the rest: returning 402 responses, forwarding signatures to the facilitator for verification, and triggering settlement after the response is sent.

### 4.4 Client (`@raygate/client`)

A TypeScript library for making x402 payments. The main export, `createBeamFetch`, returns a function that works like the standard `fetch` API but handles 402 responses transparently — signing Permit2 payloads and retrying with payment attached. Also exports `approvePermit2` for the one-time token approval.

---

## 5. Supported Tokens

Raygate works with any ERC-20 token on Beam through Permit2. The demo uses two:

**USDC** — LayerZero-bridged USD Coin. 6 decimals. The primary payment token for most API monetization use cases.

**WBEAM (WMC)** — Wrapped BEAM, the ERC-20 version of Beam's native gas token. 18 decimals. The on-chain symbol is WMC (Wrapped Merit Circle) from before the Beam rebrand. Used for pricing in the chain's native denomination.

Each token requires a one-time `approve(Permit2, maxUint256)` call from the payer's wallet. After that, every payment is a gasless off-chain signature. The facilitator pays gas for settlement in native BEAM.

---

## 6. Security Model

### 6.1 Signature Verification

Every payment signature is verified using `viem.verifyTypedData` against the Permit2 EIP-712 domain. The recovered signer must match the `owner` field in the payload. The domain includes the chain ID, so a signature valid on testnet is rejected on mainnet and vice versa.

### 6.2 Replay Protection

Permit2 uses a nonce bitmap. Each `permitTransferFrom` call consumes the nonce on-chain. If the same nonce is submitted again, the contract reverts. The facilitator also maintains an off-chain idempotency store to avoid submitting duplicate transactions.

### 6.3 Deadline Enforcement

Every signature includes a deadline (typically 30 seconds from signing). The facilitator checks the deadline off-chain (with a 30-second grace period for clock skew), and Permit2 enforces it on-chain. Expired signatures cannot be settled.

### 6.4 Facilitator Wallet

The facilitator wallet pays gas but never holds user funds. Tokens move directly from payer to merchant via Permit2's atomic `permitTransferFrom`. The facilitator cannot redirect funds, alter amounts, or spend tokens it hasn't been authorized to transfer.

---

## 7. What We Learned Building This

### 7.1 Permit2 Deployment Gap

The biggest surprise was that Permit2 wasn't on Beam. The PRD assumed it was — the contract is deployed at the same address on "every EVM chain." But Beam, as an Avalanche subnet, wasn't included in Uniswap's deployment scripts. The fix was straightforward (replay the CREATE2 calldata), but it required investigation and is worth flagging for other teams building on Beam.

### 7.2 Token Naming Confusion

Beam was originally called Merit Circle. The wrapped native token contract on testnet has the symbol WMC (Wrapped Merit Circle), not WBEAM. This creates confusion when users add the token to MetaMask and see a different symbol than the documentation describes. We label it as "WBEAM (WMC)" throughout the UI to bridge the gap.

### 7.3 Native Token vs. ERC-20

Permit2 requires ERC-20 tokens. Beam's native gas token (BEAM) is not an ERC-20 — it's the chain's native currency, like ETH on Ethereum. To accept BEAM-denominated payments through Permit2, payers need to wrap their native BEAM into the WBEAM ERC-20 contract first. This is an extra step that doesn't exist for USDC payments.

---

## 8. Roadmap

### Phase 1: TypeScript PoC (Complete)

Four npm packages, 44 unit tests, a working demo on Beam testnet with real on-chain settlements. Permit2 deployed at the canonical address. Three gated demo endpoints accepting USDC and WBEAM payments.

### Phase 2: ERC-4337 Integration

The current design has the facilitator as the `from` address on every settlement transaction. This works, and it matches how x402 operates on every other chain. But it means the on-chain record shows one wallet (the facilitator) making all the calls, which obscures the actual payer activity.

Beam already has ERC-4337 infrastructure deployed — an EntryPoint contract and a Paymaster. By integrating Account Abstraction, we can make the user appear as `from` on each settlement while the facilitator's Paymaster sponsors the gas. The payer still signs an off-chain message and never pays gas, but the on-chain footprint is richer: you can see which users called which APIs, building a natural activity graph.

No other x402 facilitator on any chain does this. It would make Beam's x402 implementation genuinely unique in the ecosystem.

### Phase 3: Go Production Implementation

The TypeScript implementation is designed for correctness and developer experience, not throughput. The production facilitator will be written in Go with:

- Goroutine-per-request concurrency
- PostgreSQL-backed idempotency (replacing the in-memory store)
- Redis caching for signature verification results
- Prometheus metrics and OpenTelemetry tracing
- Helm charts for Kubernetes deployment
- Target: 1,000+ settlements per second sustained

### Phase 4: Ecosystem

- Permit2 deployment on Beam mainnet
- npm publish under `@raygate` scope
- Submission to the x402.org ecosystem directory
- Developer documentation and integration guides

---

## 9. Contract Addresses

### Beam Testnet (chainId 13337)

| Contract | Address |
|---|---|
| Permit2 | [`0x000000000022D473030F116dDEE9F6B43aC78BA3`](https://subnets-test.avax.network/beam/address/0x000000000022D473030F116dDEE9F6B43aC78BA3) |
| USDC | [`0x007Fdc86FD12924C9116025C7F594843087397E3`](https://subnets-test.avax.network/beam/token/0x007Fdc86FD12924C9116025C7F594843087397E3) |
| WBEAM (WMC) | [`0xF65B6f9c94187276C7d91F4F74134751d248bFeA`](https://subnets-test.avax.network/beam/token/0xF65B6f9c94187276C7d91F4F74134751d248bFeA) |
| CREATE2 Factory | `0x4e59b44847b379578588920cA78FbF26c0B4956C` |

### Beam Mainnet (chainId 4337)

| Contract | Address |
|---|---|
| Permit2 | Not yet deployed |
| USDC | `0x76BF5E7d2Bcb06b1444C0a2742780051D8D0E304` |
| WBEAM | `0xD51BFa777609213A653a2CD067c9A0132a2D316A` |

---

## 10. References

- [x402 Protocol](https://www.x402.org) — The HTTP payment standard
- [Beam Documentation](https://docs.onbeam.com) — Beam chain developer docs
- [Permit2](https://github.com/Uniswap/permit2) — Uniswap's universal token allowance contract
- [EIP-712](https://eips.ethereum.org/EIPS/eip-712) — Typed structured data hashing and signing
- [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337) — Account Abstraction specification
- [Raygate Source Code](https://github.com/jes-labs/raygate) — MIT licensed

---

*Raygate is built by Jes Labs and released under the MIT License.*
