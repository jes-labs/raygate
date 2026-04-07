import type {
  WalletClient,
  PublicClient,
  Account,
  Chain,
  Transport,
} from "viem";
import { maxUint256 } from "viem";
import { PERMIT2_ADDRESS, ERC20_APPROVE_ABI } from "@raygate/core";

/**
 * Approve Permit2 to spend a token on behalf of the connected wallet.
 * This is a one-time on-chain transaction per token per wallet.
 * After approval, all subsequent payments are pure off-chain EIP-712 signatures.
 *
 * @returns Transaction hash of the approval
 */
export async function approvePermit2(
  walletClient: WalletClient<Transport, Chain, Account>,
  publicClient: PublicClient<Transport, Chain>,
  tokenAddress: `0x${string}`
): Promise<`0x${string}`> {
  const txHash = await walletClient.writeContract({
    address: tokenAddress,
    abi: ERC20_APPROVE_ABI,
    functionName: "approve",
    args: [PERMIT2_ADDRESS, maxUint256],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return txHash;
}
