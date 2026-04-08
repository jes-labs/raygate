"use client";

import { cn } from "@/lib/utils";
import { demoConfig } from "@/lib/demo-config";
import {
  CheckCircle2,
  XCircle,
  Info,
  ExternalLink,
  Loader2,
} from "lucide-react";

export interface LogEntry {
  step: string;
  status: "info" | "success" | "error";
  detail: string;
  elapsed: number;
}

interface TransactionLogProps {
  logs: LogEntry[];
  txHash?: string;
  isRunning: boolean;
}

const stepLabels: Record<string, string> = {
  init: "Initialize",
  sign: "Sign Permit2",
  verify: "Verify Signature",
  resource: "Call Endpoint",
  settle: "Submit to Beam",
  confirm: "Confirm On-Chain",
  config: "Configuration",
  error: "Error",
};

const statusIcons = {
  info: Info,
  success: CheckCircle2,
  error: XCircle,
};

const statusColors = {
  info: "text-blue-400",
  success: "text-green-400",
  error: "text-red-400",
};

export function TransactionLog({ logs, txHash, isRunning }: TransactionLogProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Transaction Log
        </h3>
        {isRunning && (
          <div className="flex items-center gap-1.5 text-xs text-primary">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing
          </div>
        )}
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {logs.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            Execute an endpoint to see the x402 payment flow
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {logs.map((entry, i) => {
              const Icon = statusIcons[entry.status];
              return (
                <div
                  key={i}
                  className="px-4 py-2.5 flex items-start gap-3 text-sm"
                >
                  <Icon
                    className={cn("w-4 h-4 mt-0.5 shrink-0", statusColors[entry.status])}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-xs">
                        {stepLabels[entry.step] ?? entry.step}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                        {entry.elapsed}ms
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 break-all leading-relaxed">
                      {entry.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {txHash && (
        <div className="px-4 py-3 border-t border-border/50 bg-success/5">
          <a
            href={`${demoConfig.explorerBaseUrl}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-mono text-success hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View on Beam Explorer: {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </a>
        </div>
      )}
    </div>
  );
}
