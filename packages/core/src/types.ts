/**
 * Beam network identifiers in CAIP-2 format.
 * Mainnet: chainId 4337 | Testnet: chainId 13337
 */
export type BeamNetwork = "eip155:4337" | "eip155:13337";

/** The signed payload the client constructs and sends via PAYMENT-SIGNATURE header */
export interface BeamPaymentPayload {
  scheme: "exact";
  network: BeamNetwork;
  /** Payer wallet address */
  owner: `0x${string}`;
  /** Facilitator wallet address (Permit2 spender) */
  spender: `0x${string}`;
  /** ERC-20 token address */
  token: `0x${string}`;
  /** Amount in smallest unit (decimal string) */
  amount: string;
  /** Random uint256 as lowercase hex string (no 0x prefix) */
  nonce: string;
  /** Unix timestamp in seconds */
  deadline: number;
  /** EIP-712 signature */
  signature: `0x${string}`;
}

/** A single payment option advertised in the 402 response */
export interface PaymentOption {
  scheme: "exact";
  network: BeamNetwork;
  /** Minimum amount required (decimal string in smallest unit) */
  maxAmountRequired: string;
  /** ERC-20 token address */
  asset: `0x${string}`;
  /** Merchant wallet that receives payment */
  payTo: `0x${string}`;
  /** URL of the facilitator service */
  facilitatorUrl: string;
  description: string;
  extra?: {
    name: string;
    version: string;
  };
}

/** HTTP 402 response body per x402 specification */
export interface PaymentRequired {
  x402Version: 1;
  accepts: PaymentOption[];
  error: string;
}

/** Facilitator /verify response */
export interface VerifyResponse {
  isValid: boolean;
  invalidReason: string | null;
}

/** Facilitator /verify request body */
export interface VerifyRequest {
  paymentPayload: string;
  paymentRequirements: {
    tokenAddress: `0x${string}`;
    maxAmountRequired: string;
    payTo: `0x${string}`;
  };
}

/** Facilitator /settle request body */
export interface SettleRequest {
  paymentPayload: string;
  paymentRequirements: {
    payTo: `0x${string}`;
  };
}

/** Facilitator /settle response */
export interface SettleResponse {
  success: boolean;
  txHash?: `0x${string}`;
  blockNumber?: string;
  network?: BeamNetwork;
  settledAt?: number;
  cached?: boolean;
  error?: string;
}

/** Facilitator /capabilities response */
export interface CapabilitiesResponse {
  facilitatorVersion: string;
  networks: BeamNetwork[];
  schemes: string[];
  tokens: TokenInfo[];
  feeBps: number;
  settlementMode: "sync" | "async";
}

export interface TokenInfo {
  network: BeamNetwork;
  address: `0x${string}`;
  symbol: string;
  decimals: number;
}

/** Idempotency store interface — in-memory for TS, Redis/Postgres for production */
export interface IdempotencyStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  has(key: string): Promise<boolean>;
}
