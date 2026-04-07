import type { WalletClient, Account, Chain, Transport } from "viem";
import {
  permit2Domain,
  PERMIT_TRANSFER_FROM_TYPES,
  PERMIT2_ADDRESS,
  NETWORK_TO_CHAIN_ID,
  type BeamPaymentPayload,
  type BeamNetwork,
} from "@raygate/core";

export interface SignPermitParams {
  walletClient: WalletClient<Transport, Chain, Account>;
  token: `0x${string}`;
  amount: string;
  spender: `0x${string}`;
  network: BeamNetwork;
}

/** Generate a cryptographically random 256-bit nonce as hex string (no 0x prefix) */
export function generateNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Build and sign a Permit2 PermitTransferFrom EIP-712 payload.
 * Returns a complete BeamPaymentPayload ready for base64 encoding.
 */
export async function signPermitTransferFrom(
  params: SignPermitParams
): Promise<BeamPaymentPayload> {
  const { walletClient, token, amount, spender, network } = params;
  const chainId = NETWORK_TO_CHAIN_ID[network];
  const nonce = generateNonce();
  const deadline = Math.floor(Date.now() / 1000) + 30;

  const domain = permit2Domain(chainId);
  const message = {
    permitted: {
      token,
      amount: BigInt(amount),
    },
    spender,
    nonce: BigInt(`0x${nonce}`),
    deadline: BigInt(deadline),
  };

  let signature: `0x${string}`;
  try {
    signature = await walletClient.signTypedData({
      domain,
      types: PERMIT_TRANSFER_FROM_TYPES,
      primaryType: "PermitTransferFrom",
      message,
    });
  } catch (err) {
    throw new Error("User rejected payment signature");
  }

  return {
    scheme: "exact",
    network,
    owner: walletClient.account.address,
    spender,
    token,
    amount,
    nonce,
    deadline,
    signature,
  };
}
