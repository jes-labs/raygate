import { Router, type Request, type Response } from "express";
import {
  type PublicClient,
  type WalletClient,
  type Chain,
  type Transport,
  type Account,
} from "viem";
import {
  decodePayload,
  isValidAddress,
  PERMIT2_ADDRESS,
  PERMIT2_ABI,
  type SettleRequest,
  type SettleResponse,
  type IdempotencyStore,
  type BeamNetwork,
} from "@raygate/core";

interface SettleRouterDeps {
  publicClient: PublicClient<Transport, Chain>;
  walletClient: WalletClient<Transport, Chain, Account>;
  idempotencyStore: IdempotencyStore;
  network: BeamNetwork;
  gasWarningThreshold: bigint;
}

/** Create the settle router */
export function createSettleRouter(deps: SettleRouterDeps): Router {
  const { publicClient, walletClient, idempotencyStore, network, gasWarningThreshold } = deps;
  const router = Router();

  // Check gas balance periodically
  checkGasBalance(publicClient, walletClient.account.address, gasWarningThreshold);

  router.post("/", async (req: Request, res: Response) => {
    try {
      const body = req.body as SettleRequest;

      if (!body.paymentPayload || !body.paymentRequirements?.payTo) {
        res.status(400).json({ error: "Missing paymentPayload or paymentRequirements.payTo" });
        return;
      }

      // Decode payload
      let payload;
      try {
        payload = decodePayload(body.paymentPayload);
      } catch {
        res.json(failure("Malformed payload"));
        return;
      }

      if (!isValidAddress(payload.owner)) {
        res.json(failure("Invalid owner address"));
        return;
      }

      // Idempotency check: owner:nonce
      const idempotencyKey = `${payload.owner.toLowerCase()}:${payload.nonce}`;
      const existingTxHash = await idempotencyStore.get(idempotencyKey);
      if (existingTxHash) {
        res.json({
          success: true,
          txHash: existingTxHash as `0x${string}`,
          network,
          cached: true,
        } satisfies SettleResponse);
        return;
      }

      // Submit Permit2.permitTransferFrom
      const nonce = BigInt(`0x${payload.nonce}`);
      const amount = BigInt(payload.amount);

      let txHash: `0x${string}`;
      try {
        txHash = await walletClient.writeContract({
          address: PERMIT2_ADDRESS,
          abi: PERMIT2_ABI,
          functionName: "permitTransferFrom",
          args: [
            {
              permitted: { token: payload.token, amount },
              nonce,
              deadline: BigInt(payload.deadline),
            },
            {
              to: body.paymentRequirements.payTo,
              requestedAmount: amount,
            },
            payload.owner,
            payload.signature,
          ],
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        if (message.includes("insufficient funds") || message.includes("gas")) {
          res.json(failure("Insufficient gas on facilitator"));
        } else {
          res.json(failure(`Transaction submission failed: ${message}`));
        }
        return;
      }

      // Wait for receipt with 30s timeout
      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
          timeout: 30_000,
        });

        if (receipt.status === "success") {
          await idempotencyStore.set(idempotencyKey, txHash);
          res.json({
            success: true,
            txHash,
            blockNumber: receipt.blockNumber.toString(),
            network,
            settledAt: Date.now(),
          } satisfies SettleResponse);
        } else {
          res.json({
            success: false,
            error: "Transaction reverted on Beam",
            txHash,
          } satisfies SettleResponse);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        if (message.includes("timeout") || message.includes("Timeout")) {
          res.json(failure("RPC timeout"));
        } else {
          res.json({
            success: false,
            error: `Receipt wait failed: ${message}`,
            txHash,
          } satisfies SettleResponse);
        }
      }
    } catch (err) {
      console.error("[settle] Unexpected error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

function failure(error: string): SettleResponse {
  return { success: false, error };
}

async function checkGasBalance(
  publicClient: PublicClient<Transport, Chain>,
  address: `0x${string}`,
  threshold: bigint
) {
  try {
    const balance = await publicClient.getBalance({ address });
    if (balance < threshold) {
      console.warn(
        `[gas-warning] Facilitator wallet balance (${balance}) is below threshold (${threshold}). Fund wallet: ${address}`
      );
    }
  } catch (err) {
    console.warn("[gas-warning] Could not check gas balance:", err);
  }
}
