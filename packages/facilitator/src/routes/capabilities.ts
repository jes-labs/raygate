import { Router, type Request, type Response } from "express";
import type { CapabilitiesResponse, BeamNetwork } from "@raygate/core";

interface CapabilitiesConfig {
  network: BeamNetwork;
  usdcAddress: `0x${string}`;
  beamTokenAddress: `0x${string}`;
}

/** Create the capabilities router */
export function createCapabilitiesRouter(config: CapabilitiesConfig): Router {
  const router = Router();

  const response: CapabilitiesResponse = {
    facilitatorVersion: "1.0.0",
    networks: [config.network],
    schemes: ["exact"],
    tokens: [
      {
        network: config.network,
        address: config.usdcAddress,
        symbol: "USDC",
        decimals: 6,
      },
      {
        network: config.network,
        address: config.beamTokenAddress,
        symbol: "BEAM",
        decimals: 18,
      },
    ],
    feeBps: 0,
    settlementMode: "async",
  };

  router.get("/", (_req: Request, res: Response) => {
    res.json(response);
  });

  return router;
}
