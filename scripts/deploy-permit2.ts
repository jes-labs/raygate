/**
 * Deploy Permit2 on Beam Testnet at the canonical address
 * 
 * This replays the exact CREATE2 deployment transaction that was used
 * on Ethereum, Avalanche C-Chain, and other EVM chains.
 * 
 * The CREATE2 factory at 0x4e59b44847b379578588920cA78FbF26c0B4956C
 * is already deployed on Beam testnet, so sending the same calldata
 * produces Permit2 at the same deterministic address:
 * 0x000000000022D473030F116dDEE9F6B43aC78BA3
 * 
 * Usage: npx tsx scripts/deploy-permit2.ts
 */

import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { beamTestnet, PERMIT2_ADDRESS } from "@raygate/core";
import * as fs from "fs";
import * as path from "path";

const CREATE2_FACTORY = "0x4e59b44847b379578588920cA78FbF26c0B4956C" as const;

async function main() {
  const privateKey = process.env.FACILITATOR_PRIVATE_KEY;
  if (!privateKey) {
    console.error("Set FACILITATOR_PRIVATE_KEY in environment");
    process.exit(1);
  }

  const rpcUrl = process.env.BEAM_TESTNET_RPC_URL ?? "https://build.onbeam.com/rpc/testnet";
  const account = privateKeyToAccount(
    (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as `0x${string}`
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

  // Step 1: Check if Permit2 is already deployed
  console.log(`Checking if Permit2 exists at ${PERMIT2_ADDRESS}...`);
  const existingCode = await publicClient.getCode({ address: PERMIT2_ADDRESS });
  if (existingCode && existingCode !== "0x") {
    console.log(`✓ Permit2 already deployed at ${PERMIT2_ADDRESS} (${(existingCode.length - 2) / 2} bytes)`);
    process.exit(0);
  }
  console.log("✗ Permit2 not found — deploying...");

  // Step 2: Check CREATE2 factory exists
  const factoryCode = await publicClient.getCode({ address: CREATE2_FACTORY });
  if (!factoryCode || factoryCode === "0x") {
    console.error(`✗ CREATE2 factory not found at ${CREATE2_FACTORY}`);
    process.exit(1);
  }
  console.log(`✓ CREATE2 factory found at ${CREATE2_FACTORY}`);

  // Step 3: Load the deployment calldata
  const calldataPath = path.join(__dirname, "permit2-calldata.hex");
  if (!fs.existsSync(calldataPath)) {
    console.error(`✗ Missing ${calldataPath} — run this script from the raygate root`);
    process.exit(1);
  }
  const calldata = fs.readFileSync(calldataPath, "utf-8").trim() as `0x${string}`;
  console.log(`✓ Loaded deployment calldata (${(calldata.length - 2) / 2} bytes)`);

  // Step 4: Check gas balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`  Deployer: ${account.address}`);
  console.log(`  Balance: ${Number(balance) / 1e18} BEAM`);
  if (balance < BigInt(1e17)) {
    console.error("✗ Insufficient BEAM for gas (need at least 0.1 BEAM)");
    process.exit(1);
  }

  // Step 5: Send the deployment transaction
  console.log("\nSubmitting Permit2 deployment to Beam testnet...");
  const txHash = await walletClient.sendTransaction({
    to: CREATE2_FACTORY,
    data: calldata,
    gas: 3_000_000n, // Permit2 deployment uses ~1.8M gas
  });
  console.log(`  Transaction: ${txHash}`);

  // Step 6: Wait for confirmation
  console.log("Waiting for confirmation...");
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    timeout: 60_000,
  });

  if (receipt.status === "success") {
    // Verify deployment
    const deployedCode = await publicClient.getCode({ address: PERMIT2_ADDRESS });
    if (deployedCode && deployedCode !== "0x") {
      console.log(`\n✓ Permit2 deployed successfully!`);
      console.log(`  Address: ${PERMIT2_ADDRESS}`);
      console.log(`  Block: ${receipt.blockNumber}`);
      console.log(`  Tx: ${txHash}`);
      console.log(`  Code size: ${(deployedCode.length - 2) / 2} bytes`);
      console.log(`\n  Explorer: https://subnets-test.avax.network/beam/tx/${txHash}`);
    } else {
      console.error("✗ Transaction succeeded but Permit2 not found at expected address");
      process.exit(1);
    }
  } else {
    console.error("✗ Transaction reverted");
    console.error(`  Tx: ${txHash}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
