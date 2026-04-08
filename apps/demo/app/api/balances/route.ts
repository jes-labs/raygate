import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, erc20Abi } from "viem";
import { beamTestnet } from "@raygate/core";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  const tokenAddress = req.nextUrl.searchParams.get("token");

  if (!address || !tokenAddress) {
    return NextResponse.json({ error: "Missing address or token" }, { status: 400 });
  }

  const rpcUrl = process.env.BEAM_TESTNET_RPC_URL ?? "https://build.onbeam.com/rpc/testnet";

  try {
    const publicClient = createPublicClient({
      chain: beamTestnet,
      transport: http(rpcUrl),
    });

    const [tokenBalance, nativeBalance] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      }),
      publicClient.getBalance({ address: address as `0x${string}` }),
    ]);

    return NextResponse.json({
      address,
      tokenBalance: tokenBalance.toString(),
      nativeBalance: nativeBalance.toString(),
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
