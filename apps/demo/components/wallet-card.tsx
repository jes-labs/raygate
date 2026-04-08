"use client";

import { useEffect, useState, useCallback } from "react";
import { cn, truncateAddress, formatBalance } from "@/lib/utils";
import { demoConfig } from "@/lib/demo-config";
import { ExternalLink, RefreshCw, Wallet, Copy, Check } from "lucide-react";

interface WalletCardProps {
  label: string;
  address: `0x${string}`;
  tokenAddress: `0x${string}`;
  tokenSymbol: string;
  tokenDecimals: number;
  variant: "user" | "merchant" | "facilitator";
  refreshTrigger?: number;
  /** Show only native BEAM balance, no ERC-20 token row */
  gasOnly?: boolean;
}

export function WalletCard({
  label,
  address,
  tokenAddress,
  tokenSymbol,
  tokenDecimals,
  variant,
  refreshTrigger,
  gasOnly = false,
}: WalletCardProps) {
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const [nativeBalance, setNativeBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset token balance when token changes to avoid stale cross-decimal display
  useEffect(() => {
    setTokenBalance(null);
  }, [tokenAddress]);

  const fetchBalances = useCallback(async () => {
    if (address === "0x0000000000000000000000000000000000000000") return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/balances?address=${address}&token=${tokenAddress}`
      );
      const data = await res.json();
      if (data.tokenBalance) setTokenBalance(data.tokenBalance);
      if (data.nativeBalance) setNativeBalance(data.nativeBalance);
    } catch {
      // Silent fail for demo
    }
    setLoading(false);
  }, [address, tokenAddress]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances, refreshTrigger]);

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const accentColor =
    variant === "user"
      ? "text-primary"
      : variant === "merchant"
        ? "text-green-400 dark:text-green-400"
        : "text-yellow-500 dark:text-yellow-400";

  const borderColor =
    variant === "user"
      ? "border-primary/20"
      : variant === "merchant"
        ? "border-green-500/20"
        : "border-yellow-500/20";

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 flex flex-col gap-3",
        borderColor
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className={cn("w-4 h-4", accentColor)} />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
        </div>
        <button
          onClick={fetchBalances}
          disabled={loading}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <code className="text-sm font-mono text-foreground">
          {truncateAddress(address)}
        </code>
        <button onClick={copyAddress} className="text-muted-foreground hover:text-foreground transition-colors">
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
        <a
          href={`${demoConfig.explorerBaseUrl}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="flex items-baseline gap-4 pt-1">
        {gasOnly ? (
          <div>
            <span className={cn("text-xl font-heading font-bold tabular-nums", accentColor)}>
              {nativeBalance !== null ? formatBalance(nativeBalance, 18) : "—"}
            </span>
            <span className="text-xs text-muted-foreground ml-1.5">BEAM</span>
          </div>
        ) : (
          <>
            <div>
              <span className={cn("text-xl font-heading font-bold tabular-nums", accentColor)}>
                {tokenBalance !== null ? formatBalance(tokenBalance, tokenDecimals) : "—"}
              </span>
              <span className="text-xs text-muted-foreground ml-1.5">
                {tokenSymbol === "BEAM" ? "WBEAM (WMC)" : tokenSymbol}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="tabular-nums">
                {nativeBalance !== null ? formatBalance(nativeBalance, 18) : "—"}
              </span>
              <span className="ml-1">BEAM (gas)</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
