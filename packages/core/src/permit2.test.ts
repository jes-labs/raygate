import { describe, it, expect } from "vitest";
import { PERMIT2_ADDRESS, permit2Domain, PERMIT_TRANSFER_FROM_TYPES } from "./permit2.js";

describe("Permit2 constants", () => {
  it("PERMIT2_ADDRESS is the canonical Uniswap address", () => {
    expect(PERMIT2_ADDRESS).toBe("0x000000000022D473030F116dDEE9F6B43aC78BA3");
  });

  it("permit2Domain returns correct structure", () => {
    const domain = permit2Domain(4337);
    expect(domain.name).toBe("Permit2");
    expect(domain.chainId).toBe(4337);
    expect(domain.verifyingContract).toBe(PERMIT2_ADDRESS);
  });

  it("PERMIT_TRANSFER_FROM_TYPES has correct EIP-712 structure", () => {
    expect(PERMIT_TRANSFER_FROM_TYPES.PermitTransferFrom).toHaveLength(4);
    expect(PERMIT_TRANSFER_FROM_TYPES.TokenPermissions).toHaveLength(2);
    expect(PERMIT_TRANSFER_FROM_TYPES.PermitTransferFrom[0].name).toBe("permitted");
    expect(PERMIT_TRANSFER_FROM_TYPES.PermitTransferFrom[1].name).toBe("spender");
    expect(PERMIT_TRANSFER_FROM_TYPES.PermitTransferFrom[2].name).toBe("nonce");
    expect(PERMIT_TRANSFER_FROM_TYPES.PermitTransferFrom[3].name).toBe("deadline");
  });
});
