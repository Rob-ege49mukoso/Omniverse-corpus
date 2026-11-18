
import React from "react";
import { cn } from "../utils/cn";

type ClassProps = {
  className?: string;
  children?: React.ReactNode;
};

export function Button({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ className, children }: ClassProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-white/[0.03] p-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Badge({ className, children }: ClassProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}

export function SectionTitle({ className, children }: ClassProps) {
  return (
    <h2 className={cn("text-lg font-semibold tracking-tight", className)}>
      {children}
    </h2>
  );
  }
