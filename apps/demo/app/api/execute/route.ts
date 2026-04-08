import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  beamTestnet,
  PERMIT2_ADDRESS,
  PERMIT2_ABI,
  permit2Domain,
  PERMIT_TRANSFER_FROM_TYPES,
} from "@raygate/core";

/**
 * POST /api/execute
 *
 * Orchestrates the full x402 demo flow:
 * 1. Signs a Permit2 payload on behalf of the user (using server-side private key)
 * 2. Verifies the signature locally
 * 3. Calls the demo endpoint
 * 4. Settles on Beam testnet via Permit2.permitTransferFrom
 *
 * Request body: { endpointId, tokenAddress, amount, merchantWallet }
 * Returns: step-by-step log of the entire flow with timing
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const logs: Array<{ step: string; status: "info" | "success" | "error"; detail: string; elapsed: number }> = [];

  function log(step: string, status: "info" | "success" | "error", detail: string) {
    logs.push({ step, status, detail, elapsed: Date.now() - startTime });
  }

  try {
    const body = await req.json();
    const { endpointId, tokenAddress, amount, merchantWallet } = body as {
      endpointId: string;
      tokenAddress: string;
      amount: string;
      merchantWallet: string;
    };

    // Validate env
    const userPrivateKey = process.env.USER_PRIVATE_KEY;
    const facilitatorPrivateKey = process.env.FACILITATOR_PRIVATE_KEY;

    if (!userPrivateKey || !facilitatorPrivateKey) {
      log("config", "error", "Missing USER_PRIVATE_KEY or FACILITATOR_PRIVATE_KEY in environment");
      return NextResponse.json({ success: false, logs });
    }

    const rpcUrl = process.env.BEAM_TESTNET_RPC_URL ?? "https://build.onbeam.com/rpc/testnet";

    // Step 1: Build clients
    log("init", "info", "Initializing viem clients for Beam testnet (chainId 13337)");

    const userAccount = privateKeyToAccount(
      (userPrivateKey.startsWith("0x") ? userPrivateKey : `0x${userPrivateKey}`) as `0x${string}`
    );
    const facilitatorAccount = privateKeyToAccount(
      (facilitatorPrivateKey.startsWith("0x") ? facilitatorPrivateKey : `0x${facilitatorPrivateKey}`) as `0x${string}`
    );

    const publicClient = createPublicClient({
      chain: beamTestnet,
      transport: http(rpcUrl),
    });

    const userWalletClient = createWalletClient({
      account: userAccount,
      chain: beamTestnet,
      transport: http(rpcUrl),
    });

    const facilitatorWalletClient = createWalletClient({
      account: facilitatorAccount,
      chain: beamTestnet,
      transport: http(rpcUrl),
    });

    log("init", "success", `User: ${userAccount.address} | Facilitator: ${facilitatorAccount.address}`);

    // Step 2: Sign Permit2 payload (simulating client-side signing)
    log("sign", "info", "Signing Permit2 EIP-712 typed data (off-chain, gasless)");

    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const deadline = Math.floor(Date.now() / 1000) + 60;

    const domain = permit2Domain(13337);
    const message = {
      permitted: {
        token: tokenAddress as `0x${string}`,
        amount: BigInt(amount),
      },
      spender: facilitatorAccount.address,
      nonce: BigInt(`0x${nonce}`),
      deadline: BigInt(deadline),
    };

    const signature = await userWalletClient.signTypedData({
      domain,
      types: PERMIT_TRANSFER_FROM_TYPES,
      primaryType: "PermitTransferFrom",
      message,
    });

    log("sign", "success", `Signed payload — nonce: ${nonce.slice(0, 16)}... deadline: ${deadline}`);

    // Step 3: Verify signature locally (simulating facilitator /verify)
    log("verify", "info", "Verifying EIP-712 signature locally (zero RPC calls)");

    const { verifyTypedData } = await import("viem");
    let isValid: boolean;
    try {
      isValid = await verifyTypedData({
        address: userAccount.address,
        domain,
        types: PERMIT_TRANSFER_FROM_TYPES,
        primaryType: "PermitTransferFrom",
        message,
        signature,
      });
    } catch {
      isValid = false;
    }

    if (!isValid) {
      log("verify", "error", "Signature verification failed");
      return NextResponse.json({ success: false, logs });
    }

    log("verify", "success", "Signature valid — owner matches recovered signer");

    // Step 4: Call the demo endpoint
    log("resource", "info", `Calling ${endpointId} endpoint`);

    const origin = req.nextUrl.origin;
    const endpointMap: Record<string, { url: string; method: string }> = {
      "market-data": { url: `${origin}/api/market-data`, method: "GET" },
      nft: { url: `${origin}/api/nft`, method: "GET" },
      inference: { url: `${origin}/api/inference`, method: "POST" },
    };

    const endpoint = endpointMap[endpointId];
    if (!endpoint) {
      log("resource", "error", `Unknown endpoint: ${endpointId}`);
      return NextResponse.json({ success: false, logs });
    }

    const resourceResponse = await fetch(endpoint.url, { method: endpoint.method });
    const resourceData = await resourceResponse.json();

    log("resource", "success", `HTTP ${resourceResponse.status} — data received`);

    // Step 5: Settle on Beam testnet (simulating facilitator /settle)
    log("settle", "info", "Submitting Permit2.permitTransferFrom to Beam testnet");

    let txHash: `0x${string}`;
    try {
      txHash = await facilitatorWalletClient.writeContract({
        address: PERMIT2_ADDRESS,
        abi: PERMIT2_ABI,
        functionName: "permitTransferFrom",
        args: [
          {
            permitted: {
              token: tokenAddress as `0x${string}`,
              amount: BigInt(amount),
            },
            nonce: BigInt(`0x${nonce}`),
            deadline: BigInt(deadline),
          },
          {
            to: merchantWallet as `0x${string}`,
            requestedAmount: BigInt(amount),
          },
          userAccount.address,
          signature,
        ],
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      log("settle", "error", `Transaction failed: ${errMsg.slice(0, 200)}`);
      return NextResponse.json({ success: false, logs, resourceData });
    }

    log("settle", "info", `Transaction submitted: ${txHash}`);

    // Step 6: Wait for confirmation
    log("confirm", "info", "Waiting for transaction receipt on Beam");

    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 30_000,
      });

      if (receipt.status === "success") {
        log(
          "confirm",
          "success",
          `Confirmed in block ${receipt.blockNumber} — payment settled on-chain`
        );
      } else {
        log("confirm", "error", "Transaction reverted on Beam");
        return NextResponse.json({
          success: false,
          logs,
          txHash,
          resourceData,
        });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Timeout";
      log("confirm", "error", `Receipt wait failed: ${errMsg.slice(0, 200)}`);
      return NextResponse.json({
        success: false,
        logs,
        txHash,
        resourceData,
      });
    }

    return NextResponse.json({
      success: true,
      logs,
      txHash,
      resourceData,
      totalTime: Date.now() - startTime,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    log("error", "error", errMsg.slice(0, 300));
    return NextResponse.json({ success: false, logs });
  }
}
