import { Router, type Request, type Response } from "express";
import { verifyTypedData } from "viem";
import {
  decodePayload,
  addressEquals,
  safeParseBigInt,
  isValidAddress,
  permit2Domain,
  PERMIT_TRANSFER_FROM_TYPES,
  NETWORK_TO_CHAIN_ID,
  type VerifyRequest,
  type VerifyResponse,
  type BeamPaymentPayload,
  type BeamNetwork,
} from "@raygate/core";

/** Create the verify router */
export function createVerifyRouter(configuredNetwork: BeamNetwork): Router {
  const router = Router();

  router.post("/", async (req: Request, res: Response) => {
    try {
      const body = req.body as VerifyRequest;

      if (!body.paymentPayload || !body.paymentRequirements) {
        res.status(400).json({ error: "Missing paymentPayload or paymentRequirements" });
        return;
      }

      // Decode payload
      let payload: BeamPaymentPayload;
      try {
        payload = decodePayload(body.paymentPayload);
      } catch {
        res.json(invalid("Malformed payload"));
        return;
      }

      // Validate address fields
      if (!isValidAddress(payload.owner) || !isValidAddress(payload.spender) || !isValidAddress(payload.token)) {
        res.json(invalid("Malformed payload"));
        return;
      }

      // Check deadline (30s grace for clock skew)
      const now = Math.floor(Date.now() / 1000);
      if (payload.deadline < now - 30) {
        res.json(invalid("Payment deadline expired"));
        return;
      }

      // Check network
      if (payload.network !== configuredNetwork) {
        res.json(invalid("Wrong network"));
        return;
      }

      // Check token match
      if (!addressEquals(payload.token, body.paymentRequirements.tokenAddress)) {
        res.json(invalid("Token mismatch"));
        return;
      }

      // Check amount
      const payloadAmount = safeParseBigInt(payload.amount);
      const requiredAmount = safeParseBigInt(body.paymentRequirements.maxAmountRequired);
      if (payloadAmount === null || requiredAmount === null) {
        res.json(invalid("Malformed payload"));
        return;
      }
      if (payloadAmount < requiredAmount) {
        res.json(invalid("Insufficient amount"));
        return;
      }

      // Verify EIP-712 signature locally (zero RPC)
      const chainId = NETWORK_TO_CHAIN_ID[configuredNetwork];
      const domain = permit2Domain(chainId);

      const message = {
        permitted: {
          token: payload.token,
          amount: BigInt(payload.amount),
        },
        spender: payload.spender,
        nonce: BigInt(`0x${payload.nonce}`),
        deadline: BigInt(payload.deadline),
      };

      let isValid: boolean;
      try {
        isValid = await verifyTypedData({
          address: payload.owner,
          domain,
          types: PERMIT_TRANSFER_FROM_TYPES,
          primaryType: "PermitTransferFrom",
          message,
          signature: payload.signature,
        });
      } catch {
        res.json(invalid("Invalid signature"));
        return;
      }

      if (!isValid) {
        res.json(invalid("Invalid signature"));
        return;
      }

      res.json({ isValid: true, invalidReason: null } satisfies VerifyResponse);
    } catch (err) {
      console.error("[verify] Unexpected error:", err);
      res.json(invalid("Verification error"));
    }
  });

  return router;
}

function invalid(reason: string): VerifyResponse {
  return { isValid: false, invalidReason: reason };
}
