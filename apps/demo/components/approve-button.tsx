"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { demoConfig } from "@/lib/demo-config";
import { ShieldCheck, Loader2, CheckCircle2, ExternalLink } from "lucide-react";

interface ApproveButtonProps {
  tokenAddress: `0x${string}`;
  tokenLabel: string;
}

export function ApproveButton({ tokenAddress, tokenLabel }: ApproveButtonProps) {
  const [status, setStatus] = useState<"checking" | "needed" | "approving" | "approved">("checking");
  const [txHash, setTxHash] = useState<string | null>(null);

  const checkApproval = useCallback(async () => {
    setStatus("checking");
    try {
      const res = await fetch(`/api/approve?token=${tokenAddress}`);
      const data = await res.json();
      setStatus(data.approved ? "approved" : "needed");
    } catch {
      setStatus("needed");
    }
  }, [tokenAddress]);

  useEffect(() => {
    checkApproval();
  }, [checkApproval]);

  const handleApprove = async () => {
    setStatus("approving");
    setTxHash(null);
    try {
      const res = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenAddress }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("approved");
        if (data.txHash) setTxHash(data.txHash);
      } else {
        setStatus("needed");
      }
    } catch {
      setStatus("needed");
    }
  };

  if (status === "checking") {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Checking Permit2 approval for {tokenLabel}...
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-green-500/20 bg-green-500/5">
        <div className="flex items-center gap-2 text-xs text-green-500">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Permit2 approved for {tokenLabel}
        </div>
        {txHash && (
          <a
            href={`${demoConfig.explorerBaseUrl}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-green-500/70 hover:text-green-500 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleApprove}
      disabled={status === "approving"}
      className={cn(
        "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-medium transition-colors",
        status === "approving"
          ? "border-border bg-card text-muted-foreground cursor-not-allowed"
          : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
      )}
    >
      {status === "approving" ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Approving Permit2 for {tokenLabel}...
        </>
      ) : (
        <>
          <ShieldCheck className="w-3.5 h-3.5" />
          Approve Permit2 for {tokenLabel} (one-time)
        </>
      )}
    </button>
  );
}
