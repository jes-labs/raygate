import type { WalletClient, Account, Chain, Transport } from "viem";
import {
  encodePayload,
  type PaymentRequired,
  type BeamNetwork,
} from "@raygate/core";
import { signPermitTransferFrom } from "./sign.js";

export interface BeamFetchOptions {
  network?: BeamNetwork;
}

/**
 * Drop-in replacement for `fetch` that handles x402 payment flows on Beam.
 *
 * On HTTP 402:
 * 1. Parses the PaymentRequired body
 * 2. Signs a Permit2 EIP-712 payload
 * 3. Retries the request with the PAYMENT-SIGNATURE header
 *
 * @param url - The URL to fetch
 * @param walletClient - viem WalletClient with a connected account
 * @param init - Standard fetch RequestInit options
 * @param beamOptions - Beam-specific options (network selection)
 * @returns The fetch Response (either direct 200 or post-payment response)
 */
export async function beamFetch(
  url: string | URL,
  walletClient: WalletClient<Transport, Chain, Account>,
  init?: RequestInit,
  beamOptions?: BeamFetchOptions
): Promise<globalThis.Response> {
  const targetNetwork = beamOptions?.network ?? "eip155:4337";

  // First request — no payment header
  const firstResponse = await fetch(url, init);

  if (firstResponse.status !== 402) {
    return firstResponse;
  }

  // Parse 402 body
  let paymentRequired: PaymentRequired;
  try {
    paymentRequired = (await firstResponse.json()) as PaymentRequired;
  } catch {
    throw new Error("Invalid 402 response body");
  }

  // Find matching accept option for our network
  const acceptOption = paymentRequired.accepts.find(
    (a) => a.network === targetNetwork
  );

  if (!acceptOption) {
    throw new Error(
      `No payment option found for network ${targetNetwork}`
    );
  }

  // Sign Permit2 payload
  const payload = await signPermitTransferFrom({
    walletClient,
    token: acceptOption.asset,
    amount: acceptOption.maxAmountRequired,
    spender: extractSpenderFromFacilitator(acceptOption.facilitatorUrl),
    network: targetNetwork,
  });

  const encodedPayload = encodePayload(payload);

  // Retry with payment header
  const retryHeaders = new Headers(init?.headers);
  retryHeaders.set("PAYMENT-SIGNATURE", encodedPayload);

  const retryResponse = await fetch(url, {
    ...init,
    headers: retryHeaders,
  });

  if (retryResponse.status === 402) {
    throw new Error("Payment rejected by facilitator");
  }

  return retryResponse;
}

/**
 * For the PoC, the spender address (facilitator wallet) needs to be known.
 * In production, this would be fetched from the facilitator's /capabilities endpoint.
 * For now, we accept it as part of the PaymentOption.extra or require explicit config.
 */
function extractSpenderFromFacilitator(_facilitatorUrl: string): `0x${string}` {
  // This will be resolved at runtime — the spender is the facilitator's wallet address.
  // In the full flow, the client should call GET /health or /capabilities to learn this.
  // For the PoC, we expose a helper that fetches it.
  throw new Error(
    "Spender address must be provided. Use createBeamFetch() for automatic resolution."
  );
}

export interface CreateBeamFetchOptions {
  walletClient: WalletClient<Transport, Chain, Account>;
  facilitatorUrl: string;
  network?: BeamNetwork;
}

/**
 * Create a pre-configured beamFetch with automatic facilitator resolution.
 * Fetches the facilitator wallet address once and reuses it for all requests.
 */
export async function createBeamFetch(options: CreateBeamFetchOptions) {
  const { walletClient, facilitatorUrl, network = "eip155:4337" } = options;

  // Resolve facilitator wallet address from /health
  let facilitatorAddress: `0x${string}`;
  try {
    const healthResp = await fetch(`${facilitatorUrl}/health`);
    const health = (await healthResp.json()) as {
      facilitator: `0x${string}`;
    };
    facilitatorAddress = health.facilitator;
  } catch {
    throw new Error(`Cannot reach facilitator at ${facilitatorUrl}`);
  }

  return async (
    url: string | URL,
    init?: RequestInit
  ): Promise<globalThis.Response> => {
    // First request
    const firstResponse = await fetch(url, init);

    if (firstResponse.status !== 402) {
      return firstResponse;
    }

    // Parse 402 body
    let paymentRequired: PaymentRequired;
    try {
      paymentRequired = (await firstResponse.json()) as PaymentRequired;
    } catch {
      throw new Error("Invalid 402 response body");
    }

    const acceptOption = paymentRequired.accepts.find(
      (a) => a.network === network
    );
    if (!acceptOption) {
      throw new Error(`No payment option found for network ${network}`);
    }

    // Sign Permit2 payload
    const payload = await signPermitTransferFrom({
      walletClient,
      token: acceptOption.asset,
      amount: acceptOption.maxAmountRequired,
      spender: facilitatorAddress,
      network,
    });

    const encodedPayload = encodePayload(payload);

    // Retry with payment header
    const retryHeaders = new Headers(init?.headers);
    retryHeaders.set("PAYMENT-SIGNATURE", encodedPayload);

    const retryResponse = await fetch(url, {
      ...init,
      headers: retryHeaders,
    });

    if (retryResponse.status === 402) {
      throw new Error("Payment rejected by facilitator");
    }

    return retryResponse;
  };
}
