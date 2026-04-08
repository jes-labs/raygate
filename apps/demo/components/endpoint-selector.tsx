"use client";

import { cn } from "@/lib/utils";
import { DEMO_ENDPOINTS, type DemoEndpoint } from "@/lib/endpoints";
import { ChevronRight, DollarSign, Cpu, Image } from "lucide-react";

interface EndpointSelectorProps {
  selected: DemoEndpoint;
  onSelect: (endpoint: DemoEndpoint) => void;
}

const icons: Record<string, typeof DollarSign> = {
  "market-data": DollarSign,
  nft: Image,
  inference: Cpu,
};

export function EndpointSelector({ selected, onSelect }: EndpointSelectorProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          API Endpoints
        </h3>
      </div>
      <div className="divide-y divide-border/50">
        {DEMO_ENDPOINTS.map((ep) => {
          const Icon = icons[ep.id] ?? ChevronRight;
          const isActive = selected.id === ep.id;
          return (
            <button
              key={ep.id}
              onClick={() => onSelect(ep)}
              className={cn(
                "w-full text-left px-4 py-3.5 flex items-center gap-3 transition-colors",
                isActive
                  ? "bg-primary/5 border-l-2 border-l-primary"
                  : "hover:bg-muted/50 border-l-2 border-l-transparent"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  isActive ? "bg-primary/10" : "bg-muted"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded",
                      ep.method === "GET"
                        ? "bg-green-500/10 text-green-500"
                        : "bg-blue-500/10 text-blue-500"
                    )}
                  >
                    {ep.method}
                  </span>
                  <code className="text-sm font-mono truncate">{ep.path}</code>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {ep.description}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-mono font-medium text-primary">
                  {ep.priceLabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
