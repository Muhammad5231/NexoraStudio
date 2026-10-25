"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, FolderKanban, Inbox, Layers, Settings, Sparkles } from "lucide-react";
import { Link, navigate } from "@/lib/router";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { ENQUIRY_STATUSES, ENQUIRY_STATUS_LABELS, type DashboardStats } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { AdminCard, AdminSkeleton, EmptyState, ErrorNote, FadeUp, StatusBadge } from "./admin-ui";
import { useAdmin } from "./admin-context";
import { timeAgo } from "./admin-utils";

// ---------------------------------------------------------------------------
// Dashboard — real metrics from /api/stats, recent leads, quick actions.
// ---------------------------------------------------------------------------

const BAR_COLOR: Record<string, string> = {
  NEW: "bg-volt",
  CONTACTED: "bg-smoke",
  QUALIFIED: "bg-amber-400",
  PROPOSAL_SENT: "bg-ink/60",
  WON: "bg-ink",
  LOST: "bg-ink/15",
};

function StatCard({
  icon,
  label,
  value,
  sub,
  highlight,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  highlight?: boolean;
  href: string;
}) {
  return (
    <Link href={href} className="block rounded-xl focus-visible:outline-2">
      <AdminCard
        className={cn(
          "h-full p-5 transition-shadow hover:shadow-md",
          highlight && "border-volt/60 bg-volt/10",
        )}
      >
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-lg",
              highlight ? "bg-volt text-ink" : "bg-ink/5 text-ink/70",
            )}
          >
            {icon}
          </span>
          <ArrowRight className="size-4 text-ink/25" aria-hidden="true" />
        </div>
        <p className="mt-4 font-display text-3xl font-bold tabular-nums tracking-tight text-ink">{value}</p>
        <p className="mt-1 text-sm font-medium text-ink/80">{label}</p>
        {sub ? <p className="text-xs text-graphite">{sub}</p> : null}
      </AdminCard>
    </Link>
  );
}

export function DashboardView() {
  const { onApiError } = useAdmin();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ stats: DashboardStats }>("api/stats", { admin: true });
      setStats(res.stats);
    } catch (err) {
      if (onApiError(err)) return;
      setError(err instanceof Error ? err.message : "Could not load stats.");
    } finally {
      setLoading(false);
    }
  }, [onApiError]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <AdminSkeleton key={i} className="h-36" />
          ))}
        </div>
        <AdminSkeleton className="h-40" />
        <AdminSkeleton className="h-64" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-4">
        <ErrorNote message={error ?? "Stats unavailable."} />
        <Button variant="outline" onClick={() => void load()}>
          Try again
        </Button>
      </div>
    );
  }

  const totalEnquiries = stats.enquiries.total;
  const statusRows = ENQUIRY_STATUSES.map((s) => ({ status: s, count: stats.enquiries.byStatus[s] ?? 0 }));

  return (
    <div className="space-y-6">
      {/* stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <FadeUp i={0}><StatCard icon={<Inbox className="size-4" aria-hidden="true" />} label="Total enquiries" value={totalEnquiries} sub="All-time leads" href="/admin/leads" /></FadeUp>
        <FadeUp i={1}><StatCard icon={<Sparkles className="size-4" aria-hidden="true" />} label="New / unread" value={stats.enquiries.newCount} sub="Awaiting first reply" highlight href="/admin/leads" /></FadeUp>
        <FadeUp i={2}><StatCard icon={<FolderKanban className="size-4" aria-hidden="true" />} label="Projects" value={stats.projects.published} sub={`${stats.projects.draft} draft${stats.projects.draft === 1 ? "" : "s"} · ${stats.projects.featured} featured`} href="/admin/projects" /></FadeUp>
        <FadeUp i={3}><StatCard icon={<Layers className="size-4" aria-hidden="true" />} label="Published services" value={stats.services.published} sub={`${stats.services.total} total`} href="/admin/services" /></FadeUp>
      </div>

      {/* status breakdown */}
      <FadeUp i={4}>
      <AdminCard className="p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-sm font-bold tracking-tight text-ink">Enquiry pipeline</h2>
          <Link href="/admin/leads" className="text-xs font-semibold text-ink underline-offset-4 hover:underline">
            Open inbox →
          </Link>
        </div>
        {totalEnquiries === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-ink/15 px-3 py-4 text-center text-sm text-graphite">
            No enquiries yet — the pipeline fills up as your contact form receives leads.
          </p>
        ) : (
          <>
            <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-ink/5" role="img" aria-label="Enquiry status breakdown">
              {statusRows.map(
                ({ status, count }) =>
                  count > 0 ? (
                    <div
                      key={status}
                      className={cn("h-full", BAR_COLOR[status] ?? "bg-ink/20")}
                      style={{ width: `${(count / totalEnquiries) * 100}%` }}
                      title={`${ENQUIRY_STATUS_LABELS[status]}: ${count}`}
                    />
                  ) : null,
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {statusRows.map(({ status, count }) => (
                <span key={status} className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-2.5 py-1 text-xs font-medium text-ink">
                  <span className={cn("size-2 rounded-full", BAR_COLOR[status] ?? "bg-ink/20")} aria-hidden="true" />
                  {ENQUIRY_STATUS_LABELS[status]}
                  <span className="font-display font-bold tabular-nums">{count}</span>
                </span>
              ))}
            </div>
          </>
        )}
      </AdminCard>
      </FadeUp>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* recent leads */}
        <FadeUp i={5}>
        <AdminCard>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 px-5 py-4">
            <h2 className="font-display text-sm font-bold tracking-tight text-ink">Recent leads</h2>
            <Link href="/admin/leads" className="text-xs font-semibold text-ink underline-offset-4 hover:underline">
              View all →
            </Link>
          </div>
          {stats.recentLeads.length === 0 ? (
            <EmptyState
              icon={<Inbox className="size-6" aria-hidden="true" />}
              title="No enquiries yet"
              body="They'll appear here the moment your contact form receives one."
              action={
                <Button variant="outline" onClick={() => navigate("/admin/settings")}>
                  <Settings className="size-4" /> Check contact settings
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-ink/5">
              {stats.recentLeads.map((lead, i) => (
                <li key={lead.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/leads/${lead.id}`)}
                    aria-label={`Open lead: ${lead.name}`}
                    className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-ink/[0.03]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{lead.name}</span>
                      <span className="block truncate text-xs text-graphite">
                        {lead.serviceType || "General enquiry"}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="hidden text-xs text-graphite sm:inline">{timeAgo(lead.createdAt)}</span>
                      <StatusBadge status={lead.status} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
        </FadeUp>

        {/* quick actions */}
        <FadeUp i={6}>
        <AdminCard className="h-fit p-5 sm:p-6">
          <h2 className="font-display text-sm font-bold tracking-tight text-ink">Quick actions</h2>
          <div className="mt-4 space-y-2">
            <Button className="h-10 w-full justify-start bg-ink text-ivory hover:bg-ink/85" onClick={() => navigate("/admin/projects/new")}>
              <FolderKanban className="size-4" /> New project
            </Button>
            <Button variant="outline" className="h-10 w-full justify-start" onClick={() => navigate("/admin/services/new")}>
              <Layers className="size-4" /> New service
            </Button>
            <Button variant="outline" className="h-10 w-full justify-start" onClick={() => navigate("/admin/settings")}>
              <Settings className="size-4" /> Edit site settings
            </Button>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-graphite">
            Leads arrive automatically from the public contact form — no manual entry needed.
          </p>
        </AdminCard>
        </FadeUp>
      </div>
    </div>
  );
}
