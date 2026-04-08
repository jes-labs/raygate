"use client";

import { useState } from "react";
import { WalletCard } from "@/components/wallet-card";
import { EndpointSelector } from "@/components/endpoint-selector";
import { TransactionLog, type LogEntry } from "@/components/transaction-log";
import { ResponseViewer } from "@/components/response-viewer";
import { DEMO_ENDPOINTS, type DemoEndpoint } from "@/lib/endpoints";
import { demoConfig } from "@/lib/demo-config";
import { ApproveButton } from "@/components/approve-button";
import { Play, RotateCcw } from "lucide-react";

export default function PlaygroundPage() {
  const [selected, setSelected] = useState<DemoEndpoint>(DEMO_ENDPOINTS[0]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [txHash, setTxHash] = useState<string | undefined>();
  const [responseData, setResponseData] = useState<Record<string, unknown> | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const tokenAddress =
    selected.token === "USDC"
      ? demoConfig.usdcAddress
      : demoConfig.beamTokenAddress;

  const tokenDecimals = selected.token === "USDC" ? 6 : 18;

  const handleExecute = async () => {
    setIsRunning(true);
    setLogs([]);
    setTxHash(undefined);
    setResponseData(null);

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpointId: selected.id,
          tokenAddress,
          amount: selected.price,
          merchantWallet: demoConfig.merchantWallet,
        }),
      });

      const data = await res.json();
      setLogs(data.logs ?? []);
      setTxHash(data.txHash);
      setResponseData(data.resourceData ?? null);

      // Refresh balances after settlement
      if (data.success) {
        setTimeout(() => setRefreshTrigger((n) => n + 1), 1000);
      }
    } catch (err) {
      setLogs([
        {
          step: "error",
          status: "error",
          detail: err instanceof Error ? err.message : "Request failed",
          elapsed: 0,
        },
      ]);
    }

    setIsRunning(false);
  };

  const handleReset = () => {
    setLogs([]);
    setTxHash(undefined);
    setResponseData(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold">Playground</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Execute x402-gated API calls on Beam testnet and watch payments settle on-chain.
        </p>
      </div>

      {/* Wallet panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <WalletCard
          label="Payer (User)"
          address={demoConfig.userWallet}
          tokenAddress={tokenAddress}
          tokenSymbol={selected.token}
          tokenDecimals={tokenDecimals}
          variant="user"
          refreshTrigger={refreshTrigger}
        />
        <WalletCard
          label="Merchant"
          address={demoConfig.merchantWallet}
          tokenAddress={tokenAddress}
          tokenSymbol={selected.token}
          tokenDecimals={tokenDecimals}
          variant="merchant"
          refreshTrigger={refreshTrigger}
        />
        <WalletCard
          label="Facilitator (Gas)"
          address={demoConfig.facilitatorWallet}
          tokenAddress={demoConfig.beamTokenAddress}
          tokenSymbol="BEAM"
          tokenDecimals={18}
          variant="facilitator"
          refreshTrigger={refreshTrigger}
          gasOnly
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Endpoint selector + execute */}
        <div className="lg:col-span-4 space-y-4">
          <EndpointSelector selected={selected} onSelect={setSelected} />

          {/* Permit2 approval */}
          <ApproveButton
            tokenAddress={tokenAddress}
            tokenLabel={selected.token === "BEAM" ? "WBEAM (WMC)" : selected.token}
          />

          {/* Execute button */}
          <div className="flex gap-2">
            <button
              onClick={handleExecute}
              disabled={isRunning}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Execute {selected.method} {selected.path}
                </>
              )}
            </button>
            {logs.length > 0 && (
              <button
                onClick={handleReset}
                className="px-3 py-3 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Clear"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Endpoint info */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Expected Response
            </h4>
            <pre className="text-xs font-mono text-muted-foreground leading-relaxed overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(selected.responseExample, null, 2)}
            </pre>
          </div>
        </div>

        {/* Right: Transaction log + response */}
        <div className="lg:col-span-8 space-y-4">
          <TransactionLog logs={logs} txHash={txHash} isRunning={isRunning} />
          <ResponseViewer data={responseData} label="API Response" />
        </div>
      </div>
    </div>
  );
}
