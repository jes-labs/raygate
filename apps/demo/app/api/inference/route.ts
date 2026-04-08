import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    model: "beam-llm-7b",
    prompt: "What is the Beam blockchain?",
    completion:
      "Beam is an EVM-compatible Layer 1 blockchain built as an Avalanche subnet. It spans six divisions — gaming, AI, finance, trading, RWA, and ventures — positioning itself as a broad frontier tech L1. The BEAM token serves as the native gas currency.",
    tokens_used: 42,
    latency_ms: Math.floor(150 + Math.random() * 100),
  });
}
