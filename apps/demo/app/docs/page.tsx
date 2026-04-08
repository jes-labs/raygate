import {
  Zap,
  ArrowRight,
  Shield,
  Code2,
  Layers,
  Globe,
  Terminal,
  Rocket,
  Coins,
  ShieldCheck,
  Users,
} from "lucide-react";

export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-heading font-bold mb-2">Documentation</h1>
      <p className="text-muted-foreground mb-12">
        How Raygate brings x402 payments to the Beam blockchain.
      </p>

      {/* What is Raygate */}
      <Section icon={Zap} title="What is Raygate?">
        <p>
          Raygate is the first{" "}
          <a href="https://www.x402.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            x402
          </a>{" "}
          payment facilitator built for{" "}
          <a href="https://docs.onbeam.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Beam
          </a>
          . It turns any HTTP API into a pay-per-request endpoint settled on-chain —
          without accounts, API keys, or subscriptions.
        </p>
        <p>
          The x402 protocol extends HTTP with a native payment layer. When a client
          hits a gated endpoint, the server responds with <Code>402 Payment Required</Code>.
          The client signs a payment authorization, retries the request, and the
          facilitator settles the payment on Beam. The entire round-trip takes about
          3 seconds.
        </p>
      </Section>

      {/* Why Beam */}
      <Section icon={Globe} title="Why Beam Needs This">
        <p>
          Base, Solana, Stellar, XRPL, and Polygon all have x402 facilitators.
          Beam does not — despite being purpose-built for gaming, AI, and compute,
          the exact verticals driving x402 adoption everywhere else.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
          {[
            { vertical: "Gaming", useCase: "Pay-per-asset lookup, pay-per-level unlock" },
            { vertical: "AI (beamAI)", useCase: "Pay-per-inference, agent-to-agent commerce" },
            { vertical: "DeFi", useCase: "Pay-per-query market data, trading signals" },
            { vertical: "Compute", useCase: "Pay-per-compute-unit, GPU rental" },
          ].map((item) => (
            <div key={item.vertical} className="rounded-lg border border-border/50 bg-card/50 p-3">
              <span className="text-xs font-medium text-primary">{item.vertical}</span>
              <p className="text-xs text-muted-foreground mt-0.5">{item.useCase}</p>
            </div>
          ))}
        </div>
        <p>
          Without an x402 facilitator, Beam&apos;s APIs and AI inference endpoints are
          invisible to AI agents making autonomous payments across the x402 ecosystem.
          Raygate bridges that gap.
        </p>
      </Section>

      {/* Permit2 Deployment */}
      <Section icon={Rocket} title="Deploying Permit2 on Beam">
        <p>
          A critical prerequisite for Raygate was deploying{" "}
          <a href="https://github.com/Uniswap/permit2" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Permit2
          </a>{" "}
          on Beam. Although Permit2 is deployed at a{" "}
          <a href="https://docs.uniswap.org/contracts/permit2/overview" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            canonical address
          </a>{" "}
          on most EVM chains, Beam (as an Avalanche subnet) did not have it.
        </p>
        <p>
          We deployed Permit2 at its canonical address on Beam testnet using the deterministic{" "}
          <Code>CREATE2</Code> factory that was already present on Beam.
          The deployment replayed the exact same calldata used on Ethereum and
          Avalanche C-Chain, producing the contract at the same deterministic address:
        </p>
        <CodeBlock
          language="address"
          code="0x000000000022D473030F116dDEE9F6B43aC78BA3"
        />
        <p>
          View on explorer:{" "}
          <a
            href="https://subnets-test.avax.network/beam/address/0x000000000022D473030F116dDEE9F6B43aC78BA3"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Permit2 on Beam Testnet
          </a>
        </p>
        <p>
          This means any tooling, SDK, or agent that interacts with Permit2 on other
          chains works identically on Beam — no address changes, no compatibility shims.
          Mainnet deployment will follow before production launch.
        </p>
      </Section>

      {/* Payment Flow */}
      <Section icon={ArrowRight} title="Payment Flow">
        <p>
          The x402 payment flow has six steps. The payer never submits a
          transaction — they sign an off-chain message, and the facilitator pays gas.
        </p>
        <ol className="space-y-4 my-6">
          {[
            {
              step: "1. Client requests resource",
              detail: "GET /api/market-data with no payment header.",
            },
            {
              step: "2. Server returns 402",
              detail: "Response includes price, token address, merchant wallet, and facilitator URL.",
            },
            {
              step: "3. Client signs Permit2 payload",
              detail: "EIP-712 typed data with token, amount, nonce, and 30-second deadline. No gas, no transaction.",
            },
            {
              step: "4. Client retries with signature",
              detail: "Same request + PAYMENT-SIGNATURE header containing the base64-encoded signed payload.",
            },
            {
              step: "5. Facilitator verifies locally",
              detail: "Pure signature check — zero RPC calls, under 50ms. Validates deadline, network, token, amount, and signer.",
            },
            {
              step: "6. Facilitator settles on Beam",
              detail: "Calls Permit2.permitTransferFrom — atomically verifies sig, transfers tokens, marks nonce used. ~3 seconds.",
            },
          ].map((item) => (
            <li key={item.step} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-mono font-bold text-primary">
                  {item.step.charAt(0)}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium">{item.step.slice(3)}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* Why Permit2 */}
      <Section icon={Shield} title="Why Permit2">
        <p>
          The standard x402 EVM scheme uses <Code>transferWithAuthorization</Code>{" "}
          (EIP-3009), which USDC on Base natively supports. But Beam uses
          LayerZero-bridged USDC — an OFT wrapper that doesn&apos;t implement EIP-3009.
        </p>
        <p>
          <a href="https://github.com/Uniswap/permit2" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Permit2</a>{" "}
          (Uniswap&apos;s universal token allowance contract) solves this:
        </p>
        <ul className="space-y-2 my-4 text-sm">
          {[
            "Works with any ERC-20 — USDC, WBEAM (WMC), USDT, or future Beam ecosystem tokens",
            "Deployed at the canonical address 0x000000000022D473030F116dDEE9F6B43aC78BA3 on Beam testnet via deterministic CREATE2",
            "Nonce bitmap provides on-chain replay protection — each signature is single-use",
            "One-time approve(Permit2, maxUint256) per token, then every payment is a pure off-chain signature",
            "Facilitator pays gas — payers never submit transactions",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Token Approval */}
      <Section icon={ShieldCheck} title="Token Approval (One-Time Setup)">
        <p>
          Before Permit2 can transfer tokens on a payer&apos;s behalf, the payer must
          approve Permit2 to spend each token. This is a <strong>one-time on-chain
          transaction</strong> per token per wallet — after that, every payment is a
          gasless off-chain signature.
        </p>
        <CodeBlock
          language="typescript"
          code={`import { approvePermit2 } from "@raygate/client";

// One-time: approve Permit2 to spend USDC
await approvePermit2(walletClient, publicClient, USDC_ADDRESS);

// One-time: approve Permit2 to spend WBEAM (WMC)
await approvePermit2(walletClient, publicClient, WBEAM_ADDRESS);`}
        />
        <p>
          In the Playground, the &quot;Approve Permit2&quot; button handles this automatically.
          It checks the current allowance on load — if already approved, it stays
          disabled with a green checkmark. Each token (USDC, WBEAM) requires its own
          approval.
        </p>
      </Section>

      {/* Supported Tokens */}
      <Section icon={Coins} title="Supported Tokens on Beam Testnet">
        <p>
          Raygate supports any ERC-20 token on Beam via Permit2. The demo uses
          two tokens from the Beam testnet:
        </p>
        <div className="overflow-x-auto my-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Token</th>
                <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Symbol</th>
                <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Decimals</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Address</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr className="border-b border-border/30">
                <td className="py-2 pr-4 text-foreground font-sans">USD Coin</td>
                <td className="py-2 pr-4">USDC</td>
                <td className="py-2 pr-4">6</td>
                <td className="py-2">
                  <a href="https://subnets-test.avax.network/beam/token/0x007Fdc86FD12924C9116025C7F594843087397E3" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    0x007Fdc86...87397E3
                  </a>
                </td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2 pr-4 text-foreground font-sans">Wrapped BEAM</td>
                <td className="py-2 pr-4">WBEAM (WMC)</td>
                <td className="py-2 pr-4">18</td>
                <td className="py-2">
                  <a href="https://subnets-test.avax.network/beam/token/0xF65B6f9c94187276C7d91F4F74134751d248bFeA" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    0xF65B6f9c...d248bFeA
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          <strong>Note:</strong> BEAM is the native gas token on the Beam chain (like ETH on Ethereum).
          WBEAM is the ERC-20 wrapped version (on-chain symbol: <Code>WMC</Code> — Wrapped Merit Circle,
          from Beam&apos;s original name). Permit2 requires ERC-20 tokens, so payments in BEAM use the
          WBEAM wrapper. The facilitator pays gas in native BEAM.
        </p>
      </Section>

      {/* Packages */}
      <Section icon={Layers} title="Packages">
        <div className="space-y-3 my-4">
          {[
            {
              name: "@raygate/core",
              desc: "Shared types, Permit2 ABI, Beam chain definitions, encode/decode utilities",
            },
            {
              name: "@raygate/facilitator",
              desc: "Standalone Express service — /verify, /settle, /capabilities, /health",
            },
            {
              name: "@raygate/express",
              desc: "One-line Express middleware for gating any route with x402 payments",
            },
            {
              name: "@raygate/client",
              desc: "Client library — beamFetch() handles the full 402 → sign → retry loop, plus approvePermit2() for one-time token approval",
            },
          ].map((pkg) => (
            <div key={pkg.name} className="rounded-lg border border-border/50 bg-card/50 p-3">
              <code className="text-sm font-mono text-primary">{pkg.name}</code>
              <p className="text-xs text-muted-foreground mt-0.5">{pkg.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Quick Start */}
      <Section icon={Terminal} title="Quick Start">
        <p>Gate an API endpoint:</p>
        <CodeBlock
          language="bash"
          code="pnpm add @raygate/express"
        />
        <CodeBlock
          language="typescript"
          code={`import { paymentMiddleware } from "@raygate/express";

app.use(paymentMiddleware({
  "GET /api/data": {
    description: "Market data",
    accepts: [{
      scheme: "exact",
      network: "eip155:4337",
      maxAmountRequired: "100000", // 0.10 USDC
      asset: "0x76BF5E7d2Bcb06b1444C0a2742780051D8D0E304", // USDC on Beam mainnet
      payTo: "0xMERCHANT_WALLET",
      facilitatorUrl: "https://facilitator.raygate.dev",
      description: "Market data feed",
    }],
  },
}, { facilitatorUrl: "https://facilitator.raygate.dev" }));`}
        />
        <p className="mt-4">Make a payment-aware request from an AI agent:</p>
        <CodeBlock
          language="typescript"
          code={`import { createBeamFetch, approvePermit2 } from "@raygate/client";

// One-time setup: approve Permit2 for USDC
await approvePermit2(walletClient, publicClient, USDC_ADDRESS);

// Create a payment-aware fetch
const beamFetch = await createBeamFetch({
  walletClient,
  facilitatorUrl: "https://facilitator.raygate.dev",
});

// Use it like normal fetch — payments handled transparently
const res = await beamFetch("https://api.example.com/data");
const data = await res.json();`}
        />
      </Section>

      {/* ERC-4337 Future */}
      <Section icon={Users} title="What's Next: User as Transaction Origin">
        <p>
          Today, the facilitator wallet appears as <Code>from</Code> on every settlement
          transaction — this matches the standard x402 design used by Coinbase on Base
          and other chains. The facilitator submits the Permit2 call, so it&apos;s the
          facilitator&apos;s address in the transaction log.
        </p>
        <p>
          But Beam already has ERC-4337 Account Abstraction infrastructure deployed —
          an EntryPoint contract and a Paymaster — which opens a path to something
          better.
        </p>
        <p>
          In the production Go implementation, we plan to integrate ERC-4337 so that
          the <strong>user appears as <Code>from</Code></strong> on each settlement
          while the <strong>facilitator&apos;s Paymaster sponsors the gas</strong>. This means:
        </p>
        <ul className="space-y-2 my-4 text-sm">
          {[
            "On-chain history shows which users called which APIs — a richer, more transparent activity graph",
            "The facilitator still covers gas, preserving the gasless experience for payers",
            "Every user who calls a gated endpoint becomes visible on-chain as the transaction origin",
            "Beam gets a genuinely unique x402 implementation that no other chain's facilitator has",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
        <p>
          This is documented in the{" "}
          <a
            href="https://github.com/jes-labs/raygate/blob/main/WHITEPAPER.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Raygate Whitepaper
          </a>{" "}
          as a Phase 2 milestone.
        </p>
      </Section>

      {/* About this demo */}
      <Section icon={Code2} title="About This Demo">
        <p>
          This demo runs the full x402 payment flow on <strong>Beam testnet</strong>{" "}
          (chainId 13337). When you click &quot;Execute&quot; in the Playground:
        </p>
        <ol className="space-y-1.5 my-4 text-sm text-muted-foreground list-decimal list-inside">
          <li>The payer&apos;s wallet must have approved Permit2 for the selected token (one-time, via the Approve button)</li>
          <li>A Permit2 EIP-712 payload is signed server-side using the demo payer&apos;s private key</li>
          <li>The signature is verified locally (zero RPC calls, under 50ms)</li>
          <li>The API endpoint is called and returns data</li>
          <li><Code>Permit2.permitTransferFrom</Code> is submitted to Beam testnet — tokens transfer from payer to merchant atomically</li>
          <li>The transaction confirms in ~2-3 seconds and balances update in the UI</li>
        </ol>
        <p>
          All transactions are real on-chain settlements on Beam testnet. You can
          verify every transaction on the{" "}
          <a
            href="https://subnets-test.avax.network/beam"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Beam Testnet Explorer
          </a>
          .
        </p>
        <div className="rounded-lg border border-border/50 bg-card/50 p-4 my-4">
          <h4 className="text-xs font-medium text-foreground mb-2">Key Addresses (Testnet)</h4>
          <div className="space-y-1.5 text-xs font-mono text-muted-foreground">
            <div className="flex justify-between">
              <span className="font-sans text-foreground/70">Permit2</span>
              <a href="https://subnets-test.avax.network/beam/address/0x000000000022D473030F116dDEE9F6B43aC78BA3" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">0x00000000...aC78BA3</a>
            </div>
            <div className="flex justify-between">
              <span className="font-sans text-foreground/70">USDC</span>
              <a href="https://subnets-test.avax.network/beam/token/0x007Fdc86FD12924C9116025C7F594843087397E3" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">0x007Fdc86...7397E3</a>
            </div>
            <div className="flex justify-between">
              <span className="font-sans text-foreground/70">WBEAM (WMC)</span>
              <a href="https://subnets-test.avax.network/beam/token/0xF65B6f9c94187276C7d91F4F74134751d248bFeA" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">0xF65B6f9c...48bFeA</a>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Zap;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-heading font-semibold">{title}</h2>
      </div>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-xs font-mono">
      {children}
    </code>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden my-3">
      <div className="px-3 py-1.5 border-b border-border/50 text-[10px] font-mono text-muted-foreground uppercase">
        {language}
      </div>
      <pre className="p-4 overflow-x-auto text-xs font-mono text-foreground leading-relaxed">
        {code}
      </pre>
    </div>
  );
}
