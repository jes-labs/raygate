"use client";

import { cn } from "@/lib/utils";
import { FileJson } from "lucide-react";

interface ResponseViewerProps {
  data: Record<string, unknown> | null;
  label?: string;
}

export function ResponseViewer({ data, label = "Response" }: ResponseViewerProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
        <FileJson className="w-3.5 h-3.5 text-muted-foreground" />
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </h3>
      </div>
      <div className="p-4 overflow-x-auto">
        {data ? (
          <pre className="text-xs font-mono text-foreground leading-relaxed whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No response yet
          </p>
        )}
      </div>
    </div>
  );
}
