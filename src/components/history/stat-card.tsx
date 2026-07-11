"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

type Accent = "amber" | "emerald" | "rose" | "stone";

const ACCENT: Record<
  Accent,
  { box: string; icon: string }
> = {
  amber: {
    box: "bg-amber-50 text-amber-700 border-amber-100",
    icon: "text-amber-600",
  },
  emerald: {
    box: "bg-emerald-50 text-emerald-700 border-emerald-100",
    icon: "text-emerald-600",
  },
  rose: {
    box: "bg-rose-50 text-rose-700 border-rose-100",
    icon: "text-rose-600",
  },
  stone: {
    box: "bg-stone-100 text-stone-700 border-stone-200",
    icon: "text-stone-600",
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  hint,
  accent = "stone",
  className,
}: {
  title: string;
  value: number | string;
  icon: LucideIcon;
  hint?: string;
  accent?: Accent;
  className?: string;
}) {
  const a = ACCENT[accent];
  return (
    <Card
      className={cn(
        "gap-3 rounded-lg border-stone-200 bg-white p-5 shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-stone-500">{title}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-stone-800">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs text-stone-400">{hint}</p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg border",
            a.box
          )}
        >
          <Icon className={cn("size-5", a.icon)} />
        </div>
      </div>
    </Card>
  );
}
