import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, maxUint256, erc20Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { beamTestnet, PERMIT2_ADDRESS } from "@raygate/core";

/**
 * POST /api/approve
 *
 * Approves Permit2 to spend a token on behalf of the user wallet.
 * This is a one-time on-chain transaction per token.
 *
 * Request body: { tokenAddress }
 * Returns: { success, txHash } or { success: false, error }
 */
export async function POST(req: NextRequest) {
  try {
    const { tokenAddress } = (await req.json()) as { tokenAddress: string };

    const userPrivateKey = process.env.USER_PRIVATE_KEY;
    if (!userPrivateKey) {
      return NextResponse.json({ success: false, error: "Missing USER_PRIVATE_KEY" });
    }

    const rpcUrl = process.env.BEAM_TESTNET_RPC_URL ?? "https://build.onbeam.com/rpc/testnet";
    const account = privateKeyToAccount(
      (userPrivateKey.startsWith("0x") ? userPrivateKey : `0x${userPrivateKey}`) as `0x${string}`
    );

    const publicClient = createPublicClient({
      chain: beamTestnet,
      transport: http(rpcUrl),
    });

    const walletClient = createWalletClient({
      account,
      chain: beamTestnet,
      transport: http(rpcUrl),
    });

    // Check current allowance first
    const currentAllowance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: "allowance",
      args: [account.address, PERMIT2_ADDRESS],
    });

    if (currentAllowance > 0n) {
      return NextResponse.json({
        success: true,
        alreadyApproved: true,
        allowance: currentAllowance.toString(),
      });
    }

    // Submit approve transaction
    const txHash = await walletClient.writeContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: "approve",
      args: [PERMIT2_ADDRESS, maxUint256],
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 30_000,
    });

    return NextResponse.json({
      success: receipt.status === "success",
      txHash,
      blockNumber: receipt.blockNumber.toString(),
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: errMsg.slice(0, 300) });
  }
}

/**
 * GET /api/approve?token=0x...
 *
 * Check if Permit2 is already approved for a token.
 */
export async function GET(req: NextRequest) {
  const tokenAddress = req.nextUrl.searchParams.get("token");
  if (!tokenAddress) {
    return NextResponse.json({ error: "Missing token param" }, { status: 400 });
  }

  const userPrivateKey = process.env.USER_PRIVATE_KEY;
  if (!userPrivateKey) {
    return NextResponse.json({ approved: false });
  }

  const rpcUrl = process.env.BEAM_TESTNET_RPC_URL ?? "https://build.onbeam.com/rpc/testnet";
  const account = privateKeyToAccount(
    (userPrivateKey.startsWith("0x") ? userPrivateKey : `0x${userPrivateKey}`) as `0x${string}`
  );

  try {
    const publicClient = createPublicClient({
      chain: beamTestnet,
      transport: http(rpcUrl),
    });

    const allowance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: "allowance",
      args: [account.address, PERMIT2_ADDRESS],
    });

    return NextResponse.json({ approved: allowance > 0n, allowance: allowance.toString() });
  } catch {
    return NextResponse.json({ approved: false });
  }
}
