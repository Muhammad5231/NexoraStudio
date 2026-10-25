"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENQUIRY_STATUS_LABELS } from "@/lib/types";
import { statusBadgeClass, statusDotClass } from "./admin-utils";

// ---------------------------------------------------------------------------
// Shared admin building blocks — light "premium product" surfaces on top of
// the shadcn/ui kit. Every view composes from here for a consistent look.
// ---------------------------------------------------------------------------

/* ------------------------------------------------------------- Loading bits */
export function Spin({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} aria-hidden="true" />;
}

export function AdminSkeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-ink/10", className)} />;
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <AdminSkeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------- Cards */
export function AdminCard({
  children,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return (
    <As
      className={cn(
        "rounded-xl border border-ink/10 bg-white shadow-[0_1px_2px_rgba(11,11,12,0.04)]",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function CardHead({
  title,
  desc,
  right,
}: {
  title: string;
  desc?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/10 px-5 py-4">
      <div>
        <h3 className="font-display text-sm font-bold tracking-tight text-ink">{title}</h3>
        {desc ? <p className="mt-0.5 text-xs leading-relaxed text-graphite">{desc}</p> : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

/* ---------------------------------------------------------------- Page head */
export function PageHead({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {title}
        </h1>
        {desc ? <p className="mt-1 text-sm text-graphite">{desc}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------- Empty state */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-ink/5 text-ink/60">
        {icon}
      </div>
      <p className="mt-4 font-display text-base font-bold text-ink">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-sm leading-relaxed text-graphite">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------- Badges */
export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        statusBadgeClass(status),
      )}
    >
      <span className={cn("size-1.5 rounded-full", statusDotClass(status))} aria-hidden="true" />
      {ENQUIRY_STATUS_LABELS[status as keyof typeof ENQUIRY_STATUS_LABELS] ?? status}
    </span>
  );
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-ink/5 px-2 py-0.5 text-[11px] font-medium text-graphite",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PubDot({ published }: { published: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-graphite">
      <span
        className={cn("size-2 rounded-full", published ? "bg-volt-2 ring-1 ring-ink/10" : "bg-amber-400")}
        aria-hidden="true"
      />
      {published ? "Published" : "Draft"}
    </span>
  );
}

/* ------------------------------------------------------------- Error banner */
export function ErrorNote({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  );
}

/* -------------------------------------------------------------- Motion wrap */
export function FadeUp({
  children,
  i = 0,
  className,
}: {
  children: ReactNode;
  i?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.3), ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ---------------------------------------------------------------- Form bits */
export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 sm:grid-cols-2", className)}>{children}</div>;
}
