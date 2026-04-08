export interface DemoEndpoint {
  id: string;
  method: "GET" | "POST";
  path: string;
  description: string;
  price: string;
  priceLabel: string;
  token: "USDC" | "BEAM";
  responseExample: Record<string, unknown>;
}

export const DEMO_ENDPOINTS: DemoEndpoint[] = [
  {
    id: "market-data",
    method: "GET",
    path: "/api/market-data",
    description: "Beam market data — price, volume, and market cap",
    price: "100000",
    priceLabel: "0.10 USDC",
    token: "USDC",
    responseExample: {
      symbol: "BEAM",
      price: 0.0234,
      volume_24h: 1_200_000,
      market_cap: 58_500_000,
      change_24h: -2.4,
      timestamp: "2026-04-07T12:00:00Z",
    },
  },
  {
    id: "nft",
    method: "GET",
    path: "/api/nft",
    description: "NFT metadata lookup — contract and token details",
    price: "1000000",
    priceLabel: "1.00 USDC",
    token: "USDC",
    responseExample: {
      contract: "0x1234...abcd",
      tokenId: "42",
      name: "Beam Knight #42",
      rarity: "legendary",
      attributes: [
        { trait: "Power", value: 95 },
        { trait: "Speed", value: 87 },
      ],
      image: "https://assets.onbeam.com/nft/42.png",
    },
  },
  {
    id: "inference",
    method: "POST",
    path: "/api/inference",
    description: "AI inference endpoint — text completion on Beam",
    price: "500000000000000",
    priceLabel: "0.0005 WBEAM (WMC)",
    token: "BEAM",
    responseExample: {
      model: "beam-llm-7b",
      prompt: "What is the Beam blockchain?",
      completion:
        "Beam is an EVM-compatible Layer 1 blockchain built as an Avalanche subnet, focused on gaming, AI, and DeFi.",
      tokens_used: 42,
      latency_ms: 180,
    },
  },
];
