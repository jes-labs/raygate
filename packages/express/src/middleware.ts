import type { Request, Response, NextFunction } from "express";
import type {
  PaymentOption,
  PaymentRequired,
  VerifyRequest,
  VerifyResponse,
  SettleRequest,
  SettleResponse,
  BeamPaymentPayload,
} from "@raygate/core";

export interface RoutePaymentConfig {
  accepts: PaymentOption[];
  description: string;
}

export interface PaymentMiddlewareConfig {
  [routePattern: string]: RoutePaymentConfig;
}

export interface PaymentMiddlewareOptions {
  facilitatorUrl: string;
  settlementMode?: "sync" | "async";
  timeout?: number;
  onPayment?: (payload: BeamPaymentPayload, settlement: SettleResponse) => void;
  onRejection?: (payload: BeamPaymentPayload, reason: string) => void;
}

/**
 * Create x402 payment middleware for Express.
 *
 * Usage:
 * ```ts
 * app.use(paymentMiddleware(routes, { facilitatorUrl: "http://localhost:3000" }));
 * ```
 */
export function paymentMiddleware(
  routes: PaymentMiddlewareConfig,
  options: PaymentMiddlewareOptions
) {
  const {
    facilitatorUrl,
    settlementMode = "async",
    timeout = 5000,
    onPayment,
    onRejection,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip OPTIONS preflight
    if (req.method === "OPTIONS") {
      next();
      return;
    }

    // Find matching route config
    const routeConfig = findMatchingRoute(req.method, req.path, routes);
    if (!routeConfig) {
      next();
      return;
    }

    // Check for PAYMENT-SIGNATURE header (case-insensitive)
    const paymentHeader =
      req.headers["payment-signature"] as string | undefined;

    if (!paymentHeader) {
      const body: PaymentRequired = {
        x402Version: 1,
        accepts: routeConfig.accepts,
        error: "Payment required",
      };
      res.status(402).json(body);
      return;
    }

    // Verify with facilitator
    const firstAccept = routeConfig.accepts[0];
    const verifyBody: VerifyRequest = {
      paymentPayload: paymentHeader,
      paymentRequirements: {
        tokenAddress: firstAccept.asset,
        maxAmountRequired: firstAccept.maxAmountRequired,
        payTo: firstAccept.payTo,
      },
    };

    let verifyResult: VerifyResponse;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const resp = await fetch(`${facilitatorUrl}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verifyBody),
        signal: controller.signal,
      });
      clearTimeout(timer);
      verifyResult = (await resp.json()) as VerifyResponse;
    } catch {
      res.status(503).json({ error: "Facilitator unavailable" });
      return;
    }

    if (!verifyResult.isValid) {
      if (onRejection) {
        try {
          const { decodePayload } = await import("@raygate/core");
          const payload = decodePayload(paymentHeader);
          onRejection(payload, verifyResult.invalidReason ?? "Unknown");
        } catch {
          // Can't decode — skip callback
        }
      }
      res.status(402).json({
        x402Version: 1,
        accepts: routeConfig.accepts,
        error: verifyResult.invalidReason ?? "Payment verification failed",
      });
      return;
    }

    // Payment verified — handle settlement based on mode
    if (settlementMode === "sync") {
      // Sync: settle before responding
      const settleResult = await settlePayment(
        facilitatorUrl,
        paymentHeader,
        firstAccept.payTo,
        timeout
      );

      if (!settleResult || !settleResult.success) {
        res.status(402).json({ error: "Settlement failed" });
        return;
      }

      // Attach settlement info for the response
      res.setHeader(
        "PAYMENT-RESPONSE",
        Buffer.from(JSON.stringify(settleResult)).toString("base64")
      );

      if (onPayment) {
        try {
          const { decodePayload } = await import("@raygate/core");
          const payload = decodePayload(paymentHeader);
          onPayment(payload, settleResult);
        } catch {
          // Skip callback on error
        }
      }

      next();
    } else {
      // Async: pass through, settle after response
      next();

      // Fire-and-forget settlement
      settlePayment(facilitatorUrl, paymentHeader, firstAccept.payTo, timeout)
        .then(async (settleResult) => {
          if (settleResult && onPayment) {
            try {
              const { decodePayload } = await import("@raygate/core");
              const payload = decodePayload(paymentHeader);
              onPayment(payload, settleResult);
            } catch {
              // Skip
            }
          }
          if (settleResult && !settleResult.success) {
            console.error("[raygate/express] Settlement failed:", settleResult.error);
          }
        })
        .catch((err) => {
          console.error("[raygate/express] Settlement error:", err);
        });
    }
  };
}

async function settlePayment(
  facilitatorUrl: string,
  paymentPayload: string,
  payTo: `0x${string}`,
  timeout: number
): Promise<SettleResponse | null> {
  try {
    const settleBody: SettleRequest = {
      paymentPayload,
      paymentRequirements: { payTo },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const resp = await fetch(`${facilitatorUrl}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settleBody),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return (await resp.json()) as SettleResponse;
  } catch (err) {
    console.error("[raygate/express] Settle request failed:", err);
    return null;
  }
}

/**
 * Match request method + path against route patterns.
 * Supports patterns like "GET /api/data" or "/api/data" (any method).
 * Supports Express-style params: "/api/nft/:contract/:tokenId"
 */
function findMatchingRoute(
  method: string,
  path: string,
  routes: PaymentMiddlewareConfig
): RoutePaymentConfig | null {
  for (const [pattern, config] of Object.entries(routes)) {
    const parts = pattern.split(" ");
    let routeMethod: string | null = null;
    let routePath: string;

    if (parts.length === 2) {
      routeMethod = parts[0].toUpperCase();
      routePath = parts[1];
    } else {
      routePath = parts[0];
    }

    // Check method if specified
    if (routeMethod && routeMethod !== method.toUpperCase()) {
      continue;
    }

    // Match path (simple pattern matching with :param support)
    if (pathMatches(path, routePath)) {
      return config;
    }
  }
  return null;
}

function pathMatches(actual: string, pattern: string): boolean {
  const actualParts = actual.split("/").filter(Boolean);
  const patternParts = pattern.split("/").filter(Boolean);

  if (actualParts.length !== patternParts.length) return false;

  return patternParts.every(
    (part, i) => part.startsWith(":") || part === actualParts[i]
  );
}
