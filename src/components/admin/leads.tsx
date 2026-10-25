"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, ChevronLeft, ChevronRight, Inbox, Mail, MessageCircle, Phone, Search, Trash2, X } from "lucide-react";
import { navigate } from "@/lib/router";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  ENQUIRY_STATUSES,
  ENQUIRY_STATUS_LABELS,
  type Enquiry,
  type EnquiryStatus,
  type Paginated,
  type Service,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { AdminCard, Chip, EmptyState, ErrorNote, ListSkeleton, PageHead, Spin, StatusBadge } from "./admin-ui";
import { useAdmin } from "./admin-context";
import { formatDateTime, patchInList, timeAgo, waLink } from "./admin-utils";
import { useDebouncedValue } from "./fields";

// ---------------------------------------------------------------------------
// Leads inbox — the CRM. Paginated list + side-sheet detail with status,
// private notes and follow-up management. Deep-linkable: #/admin/leads/:id.
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

function missingListApiNote(status: number): string | null {
  if (status === 404 || status === 405) {
    return "The enquiries list endpoint (GET /api/enquiries) isn't available yet — the backend only exposes the public POST + per-lead detail routes. Lead detail, status, notes and delete still work from a direct link.";
  }
  return null;
}

/* ============================================================== Lead detail */
function LeadSheet({
  id,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  id: string;
  onOpenChange: (open: boolean) => void;
  onUpdated: (lead: Enquiry) => void;
  onDeleted: (id: string) => void;
}) {
  const { onApiError, refreshBadge } = useAdmin();
  const [lead, setLead] = useState<Enquiry | null>(null);
  const [notes, setNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // mirrors the sheet's current id so late responses from a previous lead
  // (status PATCH in flight while the user opens another lead) are dropped
  const idRef = useRef(id);

  useEffect(() => {
    let alive = true;
    idRef.current = id;
    setLead(null);
    setLoadError(null);
    setNotesDirty(false);
    (async () => {
      try {
        const res = await api<{ enquiry: Enquiry }>(`api/enquiries/${id}`, { admin: true });
        if (!alive) return;
        setLead(res.enquiry);
        setNotes(res.enquiry.notes ?? "");
      } catch (err) {
        if (!alive) return;
        if (onApiError(err)) return;
        setLoadError(err instanceof Error ? err.message : "Could not load this lead.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, onApiError]);

  async function patch(
    body: Record<string, unknown>,
    opts?: {
      optimist?: (l: Enquiry) => Enquiry;
      onDone?: (l: Enquiry) => void;
    }
  ) {
    if (!lead) return;
    const prev = lead;
    const leadId = lead.id;
    if (opts?.optimist) {
      const next = opts.optimist(prev);
      setLead(next);
      onUpdated(next);
    }
    try {
      const res = await api<{ enquiry: Enquiry }>(`api/enquiries/${leadId}`, {
        method: "PATCH",
        body,
        admin: true,
      });
      if (idRef.current !== leadId) return; // sheet moved on — don't repopulate
      setLead(res.enquiry);
      onUpdated(res.enquiry);
      if (body.status !== undefined) refreshBadge();
      opts?.onDone?.(res.enquiry);
    } catch (err) {
      if (idRef.current !== leadId) return;
      setLead(prev); // revert optimistic update (detail + list)
      onUpdated(prev);
      onApiError(err);
    }
  }

  async function saveNotes() {
    if (!lead) return;
    setSavingNotes(true);
    try {
      const res = await api<{ enquiry: Enquiry }>(`api/enquiries/${lead.id}`, {
        method: "PATCH",
        body: { notes },
        admin: true,
      });
      setLead(res.enquiry);
      setNotes(res.enquiry.notes ?? "");
      setNotesDirty(false);
      onUpdated(res.enquiry);
      toast.success("Notes saved");
    } catch (err) {
      onApiError(err);
    } finally {
      setSavingNotes(false);
    }
  }

  async function deleteLead() {
    if (!lead) return;
    setDeleting(true);
    try {
      await api<{ success: boolean }>(`api/enquiries/${lead.id}`, { method: "DELETE", admin: true });
      toast.success("Lead deleted");
      refreshBadge();
      onDeleted(lead.id);
      onOpenChange(false);
    } catch (err) {
      onApiError(err);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const digits = lead?.phone.replace(/\D/g, "") ?? "";

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-xl overflow-y-auto p-0 sm:max-w-xl scroll-slim">
        <SheetHeader className="border-b border-ink/10 px-5 py-4">
          <SheetTitle className="font-display text-lg font-bold text-ink">
            {lead ? lead.name : "Lead"}
          </SheetTitle>
          <SheetDescription className="text-sm text-graphite">
            {lead ? [lead.business || null, lead.serviceType || "General enquiry"].filter(Boolean).join(" · ") : "Loading…"}
          </SheetDescription>
        </SheetHeader>

        {!lead ? (
          <div className="space-y-4 p-5">
            {loadError ? <ErrorNote message={loadError} /> : null}
            <Skeleton className="h-16" />
            <Skeleton className="h-32" />
            <Skeleton className="h-40" />
          </div>
        ) : (
          <div className="space-y-6 p-5">
            {/* contact block */}
            <section aria-label="Contact details" className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`mailto:${lead.email}`}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-ink/15 bg-white px-3 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.04]"
                >
                  <Mail className="size-4" aria-hidden="true" /> Email
                </a>
                {digits ? (
                  <a
                    href={waLink(lead.phone)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-ink/15 bg-white px-3 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.04]"
                  >
                    <MessageCircle className="size-4" aria-hidden="true" /> WhatsApp
                  </a>
                ) : null}
                {lead.phone ? (
                  <a
                    href={`tel:${lead.phone.replace(/\s/g, "")}`}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-ink/15 bg-white px-3 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.04]"
                  >
                    <Phone className="size-4" aria-hidden="true" /> Call
                  </a>
                ) : null}
                {lead.contactMethod ? <Chip className="bg-volt/25 text-ink">Prefers: {lead.contactMethod}</Chip> : null}
              </div>
              <div className="grid gap-1 text-sm text-graphite">
                <span>
                  <span className="font-medium text-ink">Email:</span> {lead.email || "—"}
                </span>
                <span>
                  <span className="font-medium text-ink">Phone:</span> {lead.phone || "—"}
                </span>
              </div>
            </section>

            <Separator />

            {/* enquiry details */}
            <section aria-label="Enquiry details" className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-graphite">Service</p>
                  <p className="mt-0.5 text-ink">{lead.serviceType || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-graphite">Budget</p>
                  <p className="mt-0.5 text-ink">{lead.budget || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-graphite">Timeline</p>
                  <p className="mt-0.5 text-ink">{lead.timeline || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-graphite">Source</p>
                  <p className="mt-0.5 text-ink">{lead.source || "—"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-graphite">Project description</p>
                <p className="mt-1 whitespace-pre-wrap rounded-lg bg-ink/[0.03] p-3 text-sm leading-relaxed text-ink">
                  {lead.description || "—"}
                </p>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-graphite">
                <span>Created {formatDateTime(lead.createdAt)}</span>
                <span>Updated {timeAgo(lead.updatedAt)}</span>
              </div>
            </section>

            <Separator />

            {/* status management */}
            <section aria-label="Status" className="space-y-2">
              <Label className="text-[13px] font-semibold text-ink">Status</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={ENQUIRY_STATUSES.includes(lead.status as EnquiryStatus) ? lead.status : undefined}
                  onValueChange={(v) => void patch({ status: v }, { optimist: (l) => ({ ...l, status: v }) })}
                >
                  <SelectTrigger className="h-10 w-52" aria-label="Change lead status">
                    <SelectValue placeholder="Set status" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENQUIRY_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {ENQUIRY_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <StatusBadge status={lead.status} />
              </div>
              {lead.followUpDate ? (
                <Badge variant="outline" className="gap-1.5 border-ink/20 text-ink">
                  <CalendarClock className="size-3.5" aria-hidden="true" />
                  Follow-up: {new Date(`${lead.followUpDate.slice(0, 10)}T00:00:00`).toLocaleDateString()}
                </Badge>
              ) : null}
            </section>

            {/* follow-up date */}
            <section aria-label="Follow-up" className="space-y-2">
              <Label htmlFor="lead-followup" className="text-[13px] font-semibold text-ink">
                Follow-up date
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="lead-followup"
                  type="date"
                  className="h-10 w-48"
                  value={lead.followUpDate ? lead.followUpDate.slice(0, 10) : ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (!raw) {
                      void patch({ followUpDate: null }, {
                        optimist: (l) => ({ ...l, followUpDate: null }),
                        onDone: () => toast.success("Follow-up cleared"),
                      });
                    } else {
                      // date-only value stored as UTC midnight so it round-trips
                      // exactly through slice(0, 10) in any timezone (IST safe)
                      const iso = new Date(`${raw}T00:00:00Z`).toISOString();
                      void patch({ followUpDate: iso }, {
                        optimist: (l) => ({ ...l, followUpDate: iso }),
                        onDone: () => toast.success("Follow-up date saved"),
                      });
                    }
                  }}
                />
                {lead.followUpDate ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-graphite"
                    onClick={() => {
                      void patch({ followUpDate: null }, {
                        optimist: (l) => ({ ...l, followUpDate: null }),
                        onDone: () => toast.success("Follow-up cleared"),
                      });
                    }}
                  >
                    <X className="size-4" /> Clear
                  </Button>
                ) : null}
              </div>
            </section>

            <Separator />

            {/* private notes */}
            <section aria-label="Internal notes" className="space-y-2">
              <Label htmlFor="lead-notes" className="text-[13px] font-semibold text-ink">
                Internal notes
              </Label>
              <Textarea
                id="lead-notes"
                rows={5}
                value={notes}
                placeholder="e.g. Called on Tuesday — wants a quote for the launch bundle…"
                onChange={(e) => {
                  setNotes(e.target.value);
                  setNotesDirty(true);
                }}
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-graphite">Notes are private — never shown on the public site.</p>
                <Button
                  size="sm"
                  className="h-9 bg-ink text-ivory hover:bg-ink/85"
                  disabled={!notesDirty || savingNotes}
                  onClick={() => void saveNotes()}
                >
                  {savingNotes ? <Spin /> : null} Save notes
                </Button>
              </div>
            </section>

            <Separator />

            {/* danger zone */}
            <section aria-label="Danger zone" className="flex items-center justify-between gap-3">
              <p className="text-xs text-graphite">Deleting a lead is permanent.</p>
              <Button
                variant="outline"
                size="sm"
                className="h-9 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4" /> Delete lead
              </Button>
            </section>
          </div>
        )}

        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
              <AlertDialogDescription>
                {lead?.name ? `${lead.name}'s enquiry` : "This enquiry"} will be permanently removed, including notes and status history. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting}
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={(e) => {
                  e.preventDefault();
                  void deleteLead();
                }}
              >
                {deleting ? <Spin /> : null} Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}

/* ==================================================================== Inbox */
export function LeadsView({ selectedId }: { selectedId?: string }) {
  const { onApiError } = useAdmin();

  const [items, setItems] = useState<Enquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [service, setService] = useState("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const debouncedSearch = useDebouncedValue(search, 300);
  // guards against out-of-order responses overwriting newer results
  const reqIdRef = useRef(0);

  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ services: Service[] }>("api/services?all=1", { admin: true });
        setServices(res.services);
      } catch {
        /* filter options are optional — ignore */
      }
    })();
  }, []);

  // reset to first page whenever filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, service, sort]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (status !== "all") params.set("status", status);
    if (service !== "all") params.set("service", service);
    params.set("sort", sort);
    return params.toString();
  }, [page, debouncedSearch, status, service, sort]);

  const load = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const res = await api<Paginated<Enquiry>>(`api/enquiries?${queryString}`, { admin: true });
      if (reqId !== reqIdRef.current) return; // a newer query already resolved
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      if (reqId !== reqIdRef.current) return;
      if (onApiError(err)) return;
      const status = err instanceof Error && "status" in err ? Number((err as { status: number }).status) : 0;
      setError(err instanceof Error ? err.message : "Could not load leads.");
      const miss = typeof status === "number" ? missingListApiNote(status) : null;
      if (miss) setHint(miss);
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, [queryString, onApiError]);

  useEffect(() => {
    void load();
  }, [load]);

  function onUpdated(updated: Enquiry) {
    setItems((prev) => patchInList(prev, updated));
  }

  function onDeleted(id: string) {
    setItems((prev) => prev.filter((e) => e.id !== id));
    const nextTotal = Math.max(0, total - 1);
    setTotal(nextTotal);
    // clamp the page so deleting the last row of the last page can't strand
    // the user on an empty page beyond maxPage
    const maxAllowed = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE));
    if (page > maxAllowed) {
      setPage(maxAllowed); // triggers a refetch via the query string
    } else {
      void load();
    }
  }

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filterControls = (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/35" aria-hidden="true" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, business…"
          aria-label="Search leads"
          className="h-10 w-full pl-9 sm:w-64"
        />
      </div>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="h-10 w-full sm:w-40" aria-label="Filter by status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {ENQUIRY_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {ENQUIRY_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={service} onValueChange={setService}>
        <SelectTrigger className="h-10 w-full sm:w-44" aria-label="Filter by service">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All services</SelectItem>
          {services.map((s) => (
            <SelectItem key={s.id} value={s.title}>
              {s.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sort} onValueChange={(v) => setSort(v === "oldest" ? "oldest" : "newest")}>
        <SelectTrigger className="h-10 w-full sm:w-36" aria-label="Sort order">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest first</SelectItem>
          <SelectItem value="oldest">Oldest first</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div>
      <PageHead title="Leads" desc="Every enquiry from your public contact form, in one inbox." />

      {hint ? (
        <div className="mb-4">
          <ErrorNote message={hint} />
        </div>
      ) : null}

      {/* refresh failed but rows are already on screen — say so, offer retry */}
      {error && items.length > 0 && !loading ? (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-2.5">
          <p className="text-xs text-destructive">Couldn&apos;t refresh the list — showing the last loaded results.</p>
          <Button variant="outline" size="sm" className="h-7 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      <AdminCard>
        <div className="border-b border-ink/10 p-4">{filterControls}</div>

        {loading && items.length === 0 ? (
          <div className="p-4">
            <ListSkeleton rows={5} />
          </div>
        ) : error && items.length === 0 ? (
          <div className="space-y-4 p-4">
            <ErrorNote message={error} />
            <Button variant="outline" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Inbox className="size-6" aria-hidden="true" />}
            title={search || status !== "all" || service !== "all" ? "No leads match your filters" : "No enquiries yet"}
            body={
              search || status !== "all" || service !== "all"
                ? "Try a different search or clear the filters."
                : "They'll appear here the moment your contact form receives one."
            }
            action={
              search || status !== "all" || service !== "all" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setStatus("all");
                    setService("all");
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* desktop table */}
            <div className={cn("hidden overflow-x-auto md:block", loading && "opacity-60")} aria-busy={loading}>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Lead</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="pr-5">
                      <span className="sr-only">Open</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((lead) => (
                    <TableRow
                      key={lead.id}
                      onClick={() => navigate(`/admin/leads/${lead.id}`)}
                      className={cn("cursor-pointer", selectedId === lead.id && "bg-volt/10")}
                    >
                      <TableCell className="py-3.5 pl-5">
                        <span className="block text-sm font-semibold text-ink">{lead.name}</span>
                        <span className="block text-xs text-graphite">{lead.business || lead.email}</span>
                      </TableCell>
                      <TableCell className="text-sm text-ink/80">{lead.serviceType || "—"}</TableCell>
                      <TableCell className="text-sm text-ink/80">{lead.budget || "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={lead.status} />
                      </TableCell>
                      <TableCell className="text-sm text-graphite">{timeAgo(lead.createdAt)}</TableCell>
                      <TableCell className="pr-5 text-right">
                        <ChevronRight className="ml-auto size-4 text-ink/30" aria-hidden="true" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* mobile cards */}
            <ul className={cn("divide-y divide-ink/5 md:hidden", loading && "opacity-60")} aria-busy={loading}>
              {items.map((lead) => (
                <li key={lead.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/leads/${lead.id}`)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-ink/[0.03]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{lead.name}</span>
                      <span className="block truncate text-xs text-graphite">
                        {lead.serviceType || "General enquiry"} · {lead.budget || "—"}
                      </span>
                      <span className="mt-1.5 block">
                        <StatusBadge status={lead.status} />
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-graphite">{timeAgo(lead.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>

            {/* pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 px-4 py-3">
              <p className="text-xs text-graphite" aria-live="polite">
                Showing {from}–{to} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" /> Prev
                </Button>
                <span className="text-xs tabular-nums text-graphite">
                  {page}/{maxPage}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  disabled={page >= maxPage || loading}
                  onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
                  aria-label="Next page"
                >
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </AdminCard>

      {loading && items.length > 0 ? (
        <div className="pointer-events-none fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-ink px-3.5 py-2 text-xs font-medium text-ivory shadow-lg">
          <Spin className="size-3.5" /> Updating…
        </div>
      ) : null}

      {selectedId ? (
        <LeadSheet
          id={selectedId}
          onOpenChange={(open) => {
            if (!open) navigate("/admin/leads");
          }}
          onUpdated={onUpdated}
          onDeleted={onDeleted}
        />
      ) : null}
    </div>
  );
}
