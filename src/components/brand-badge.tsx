import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: "default" | "pink" | "blue" | "gold" | "muted" | "destructive";
  className?: string;
}) {
  const variants: Record<string, string> = {
    default: "bg-foreground text-background",
    pink: "bg-[var(--pink)] text-ink",
    blue: "bg-[var(--blue)] text-ink",
    gold: "bg-[var(--gold)] text-ink",
    muted: "bg-muted text-muted-foreground",
    destructive: "bg-destructive text-destructive-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
