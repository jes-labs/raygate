import { describe, it, expect } from "vitest";
import { beam, beamTestnet, NETWORK_TO_CHAIN_ID, CHAIN_ID_TO_NETWORK, getChainFromNetwork } from "./chain.js";

describe("chain definitions", () => {
  it("beam mainnet has correct chainId", () => {
    expect(beam.id).toBe(4337);
  });

  it("beam testnet has correct chainId", () => {
    expect(beamTestnet.id).toBe(13337);
  });

  it("NETWORK_TO_CHAIN_ID maps correctly", () => {
    expect(NETWORK_TO_CHAIN_ID["eip155:4337"]).toBe(4337);
    expect(NETWORK_TO_CHAIN_ID["eip155:13337"]).toBe(13337);
  });

  it("CHAIN_ID_TO_NETWORK maps correctly", () => {
    expect(CHAIN_ID_TO_NETWORK[4337]).toBe("eip155:4337");
    expect(CHAIN_ID_TO_NETWORK[13337]).toBe("eip155:13337");
  });

  it("getChainFromNetwork returns correct chain", () => {
    expect(getChainFromNetwork("eip155:4337")).toBe(beam);
    expect(getChainFromNetwork("eip155:13337")).toBe(beamTestnet);
  });
});
