import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    contract: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
    tokenId: "42",
    name: "Beam Knight #42",
    rarity: "legendary",
    attributes: [
      { trait: "Power", value: 95 },
      { trait: "Speed", value: 87 },
      { trait: "Defense", value: 72 },
    ],
    image: "https://assets.onbeam.com/nft/42.png",
    owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  });
}
