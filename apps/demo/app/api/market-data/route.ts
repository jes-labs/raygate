import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    symbol: "BEAM",
    price: 0.0234 + Math.random() * 0.002 - 0.001,
    volume_24h: Math.floor(1_200_000 + Math.random() * 100_000),
    market_cap: Math.floor(58_500_000 + Math.random() * 500_000),
    change_24h: Number((-2.4 + Math.random() * 1.5).toFixed(2)),
    timestamp: new Date().toISOString(),
  });
}
