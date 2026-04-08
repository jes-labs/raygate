import Link from "next/link";
import {
  ArrowRight,
  Zap,
  Shield,
  Clock,
  Globe,
  Bot,
  Gamepad2,
  BrainCircuit,
  TrendingUp,
  Cpu,
  ArrowDown,
  ExternalLink,
  Github,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="relative min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-6 py-24 grid-pattern overflow-hidden">
        {/* Subtle glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-10">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Live on Beam Testnet
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-heading font-bold text-center max-w-4xl leading-[1.1] tracking-tight">
            The x402 Payment
            <br />
            Facilitator for{" "}
            <span className="text-primary">Beam</span>
          </h1>

          <p className="mt-6 text-base md:text-lg text-muted-foreground text-center max-w-2xl leading-relaxed">
            Raygate lets any HTTP API on Beam require pay-per-request payments settled
            on-chain in seconds — with no accounts, no API keys, and no friction for AI agents.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/playground"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all"
            >
              Try the Playground
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium text-sm hover:bg-muted transition-colors"
            >
              Read the Docs
            </Link>
          </div>

          <div className="mt-16 text-muted-foreground animate-bounce">
            <ArrowDown className="w-5 h-5" />
          </div>
        </div>
      </section>

      {/* ── The Gap ── */}
      <section className="py-20 px-6 border-t border-border/50">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-medium text-primary uppercase tracking-widest mb-3">
            The Problem
          </p>
          <h2 className="text-3xl md:text-4xl font-heading font-bold max-w-2xl leading-tight">
            Every major chain has an x402 facilitator.
            <br />
            <span className="text-muted-foreground">Beam does not.</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl leading-relaxed">
            Base, Solana, Stellar, XRPL, and Polygon already participate in the machine-native
            payment economy. Beam — despite being purpose-built for gaming, AI, and compute —
            has been left out. Until now.
          </p>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { chain: "Base", status: true },
              { chain: "Solana", status: true },
              { chain: "Stellar", status: true },
              { chain: "XRPL", status: true },
              { chain: "Polygon", status: true },
              { chain: "HyperEVM", status: true },
              { chain: "BNB Chain", status: true },
              { chain: "Beam", status: false, highlight: true },
            ].map((c) => (
              <div
                key={c.chain}
                className={`rounded-lg border p-3 text-center text-sm font-medium ${
                  c.highlight
                    ? "border-primary/40 bg-primary/5 text-primary"
                    : "border-border/50 bg-card/50 text-muted-foreground"
                }`}
              >
                {c.chain}
                <span className="block text-[10px] mt-0.5 opacity-70">
                  {c.status ? "x402 ✓" : "Raygate fills this →"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 px-6 border-t border-border/50 bg-card/30">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-medium text-primary uppercase tracking-widest mb-3">
            How It Works
          </p>
          <h2 className="text-3xl md:text-4xl font-heading font-bold max-w-2xl leading-tight mb-12">
            Six steps. Three seconds. Fully on-chain.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                num: "01",
                title: "Client requests resource",
                desc: "A simple HTTP request — GET /api/data — with no payment header attached.",
              },
              {
                num: "02",
                title: "Server returns 402",
                desc: "HTTP 402 Payment Required with price, token, merchant wallet, and facilitator URL.",
              },
              {
                num: "03",
                title: "Client signs Permit2",
                desc: "EIP-712 typed data signed off-chain. No gas cost, no transaction submitted by the payer.",
              },
              {
                num: "04",
                title: "Client retries with signature",
                desc: "Same request, now with a PAYMENT-SIGNATURE header containing the signed payload.",
              },
              {
                num: "05",
                title: "Facilitator verifies locally",
                desc: "Pure cryptographic check — zero RPC calls, under 50ms. Validates deadline, network, and signer.",
              },
              {
                num: "06",
                title: "Settlement on Beam",
                desc: "Permit2.permitTransferFrom settles atomically on-chain. Tokens transfer, nonce consumed, done.",
              },
            ].map((step) => (
              <div
                key={step.num}
                className="group rounded-xl border border-border/50 bg-card p-5 hover:border-primary/30 transition-colors"
              >
                <span className="text-2xl font-heading font-bold text-primary/30 group-hover:text-primary/60 transition-colors">
                  {step.num}
                </span>
                <h3 className="font-heading font-semibold text-sm mt-3 mb-1.5">
                  {step.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Empowering the Agentic Economy ── */}
      <section className="py-20 px-6 border-t border-border/50">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-medium text-primary uppercase tracking-widest mb-3">
            The Vision
          </p>
          <h2 className="text-3xl md:text-4xl font-heading font-bold max-w-3xl leading-tight">
            Empowering a trusted
            <br />
            <span className="text-primary">agentic economy</span> on Beam
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl leading-relaxed">
            AI agents are the fastest-growing class of API consumers. They operate
            autonomously, at scale, and need to pay for services without human
            intervention. x402 is the protocol that makes this possible — and
            Raygate brings it to Beam.
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                icon: Bot,
                title: "Agent-to-API Payments",
                desc: "AI agents autonomously discover, pay for, and consume Beam APIs. No accounts, no API keys — just HTTP and a wallet.",
              },
              {
                icon: Gamepad2,
                title: "Gaming Micropayments",
                desc: "Pay-per-asset lookup, pay-per-level unlock, in-game item purchases — all settled in USDC or BEAM with sub-cent precision.",
              },
              {
                icon: BrainCircuit,
                title: "AI Inference Markets",
                desc: "beamAI endpoints charge per-token or per-inference. Agents comparison-shop across models and pay the best price automatically.",
              },
              {
                icon: TrendingUp,
                title: "DeFi Data Feeds",
                desc: "Market data, price oracles, and trading signals gated at the API layer. Pay per query, no subscription commitment.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border/50 bg-card/50 p-6 flex gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-sm mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="py-20 px-6 border-t border-border/50 bg-card/30">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-medium text-primary uppercase tracking-widest mb-3">
            Built Right
          </p>
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-12">
            Why Raygate
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Zap,
                title: "Gasless Signing",
                desc: "Payers sign off-chain EIP-712 messages. Zero gas, zero transactions from the payer's wallet.",
              },
              {
                icon: Clock,
                title: "~3s Settlement",
                desc: "Permit2 settles atomically on Beam. Fast finality means payments confirm in a single block.",
              },
              {
                icon: Shield,
                title: "Replay Protected",
                desc: "Permit2 nonce bitmaps prevent double-spend on-chain. Each signature is single-use by construction.",
              },
              {
                icon: Cpu,
                title: "Any ERC-20",
                desc: "Permit2 works with any token — USDC, BEAM, or future Beam ecosystem tokens. No contract deployment.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border/50 bg-card p-5"
              >
                <f.icon className="w-5 h-5 text-primary mb-3" />
                <h3 className="font-heading font-semibold text-sm mb-1.5">
                  {f.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 border-t border-border/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold leading-tight">
            See it in action
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto leading-relaxed">
            The playground runs real x402 payments on Beam testnet. Call gated endpoints,
            watch Permit2 signatures get verified and settled, and inspect every
            transaction on the block explorer.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/playground"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all"
            >
              Open Playground
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://github.com/jes-labs/raygate"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg border border-border text-foreground font-medium text-sm hover:bg-muted transition-colors"
            >
              <Github className="w-4 h-4" />
              View Source
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/50 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <span className="font-heading font-bold text-sm">Raygate</span>
            <span className="text-xs text-muted-foreground">
              The first x402 facilitator for Beam
            </span>
          </div>

          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <a
              href="https://www.x402.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              x402 Protocol
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://docs.onbeam.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              Beam Docs
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://github.com/Uniswap/permit2"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              Permit2
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://github.com/jes-labs/raygate"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              GitHub
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-6 pt-6 border-t border-border/30 text-center">
          <p className="text-[11px] text-muted-foreground/60">
            Built by Jes Labs. Raygate is open source under the MIT License.
          </p>
        </div>
      </footer>
    </div>
  );
}
