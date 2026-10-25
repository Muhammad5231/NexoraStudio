"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { navigate } from "@/lib/router";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { Service, ServiceFaq } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { AdminCard, CardHead, Chip, EmptyState, ErrorNote, ListSkeleton, PageHead, PubDot, Spin } from "./admin-ui";
import { useAdmin } from "./admin-context";
import { CATEGORY_CLASS, SLUG_RE, slugify } from "./admin-utils";
import { CountedTextarea, Field, ServiceFaqsField, StringListField } from "./fields";

// ---------------------------------------------------------------------------
// Services — what the studio sells. Category web | video | package.
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { value: "web", label: "Web" },
  { value: "video", label: "Video" },
  { value: "package", label: "Package" },
] as const;

type ServiceForm = {
  title: string;
  slug: string;
  category: string;
  summary: string;
  description: string;
  startingPrice: string;
  priceNote: string;
  deliverables: string[];
  useCases: string[];
  process: string[];
  exclusions: string[];
  faqs: ServiceFaq[];
  published: boolean;
  order: number;
};

function emptyForm(): ServiceForm {
  return {
    title: "",
    slug: "",
    category: "web",
    summary: "",
    description: "",
    startingPrice: "",
    priceNote: "",
    deliverables: [],
    useCases: [],
    process: [],
    exclusions: [],
    faqs: [],
    published: false,
    order: 99,
  };
}

function toForm(s: Service): ServiceForm {
  return {
    title: s.title,
    slug: s.slug,
    category: s.category,
    summary: s.summary ?? "",
    description: s.description ?? "",
    startingPrice: s.startingPrice ?? "",
    priceNote: s.priceNote ?? "",
    deliverables: s.deliverables ?? [],
    useCases: s.useCases ?? [],
    process: s.process ?? [],
    exclusions: s.exclusions ?? [],
    faqs: s.faqs ?? [],
    published: s.published,
    order: s.order,
  };
}

/* ===================================================================== List */
export function ServiceList() {
  const { onApiError } = useAdmin();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ services: Service[] }>("api/services?all=1", { admin: true });
      setServices(res.services);
    } catch (err) {
      if (onApiError(err)) return;
      setError(err instanceof Error ? err.message : "Could not load services.");
    } finally {
      setLoading(false);
    }
  }, [onApiError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api<{ success: boolean }>(`api/services/${toDelete.id}`, { method: "DELETE", admin: true });
      toast.success("Service deleted");
      setServices((prev) => prev.filter((s) => s.id !== toDelete.id));
      setToDelete(null);
    } catch (err) {
      onApiError(err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHead title="Services" desc="Packages and offerings shown on the public services page.">
        <Button className="h-10 bg-ink text-ivory hover:bg-ink/85" onClick={() => navigate("/admin/services/new")}>
          <Plus className="size-4" /> New Service
        </Button>
      </PageHead>

      <AdminCard>
        {loading ? (
          <div className="p-4">
            <ListSkeleton rows={4} />
          </div>
        ) : error ? (
          <div className="space-y-4 p-4">
            <ErrorNote message={error} />
            <Button variant="outline" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        ) : services.length === 0 ? (
          <EmptyState
            icon={<Layers className="size-6" aria-hidden="true" />}
            title="No services yet"
            body="Add your first service — it becomes a public page with deliverables, pricing and FAQs."
            action={
              <Button className="bg-ink text-ivory hover:bg-ink/85" onClick={() => navigate("/admin/services/new")}>
                <Plus className="size-4" /> New Service
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Service</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead className="pr-5 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="py-3.5 pl-5">
                        <span className="block text-sm font-semibold text-ink">{s.title}</span>
                        <span className="block max-w-xs truncate text-xs text-graphite">{s.summary || s.slug}</span>
                      </TableCell>
                      <TableCell>
                        <Chip className={cn(CATEGORY_CLASS[s.category] ?? "", "px-2 py-0.5 text-[11px] font-semibold uppercase")}>
                          {s.category}
                        </Chip>
                      </TableCell>
                      <TableCell className="text-sm text-ink/80">{s.startingPrice || "—"}</TableCell>
                      <TableCell>
                        <PubDot published={s.published} />
                      </TableCell>
                      <TableCell className="tabular-nums text-graphite">{s.order}</TableCell>
                      <TableCell className="pr-5">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-9 text-graphite" aria-label={`Edit ${s.title}`} onClick={() => navigate(`/admin/services/${s.id}`)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9 text-graphite"
                            aria-label={`Preview ${s.title} on the public site`}
                            onClick={() => window.open(`#/services/${s.slug}`, "_blank")}
                          >
                            <ExternalLink className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9 text-graphite hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Delete ${s.title}`}
                            onClick={() => setToDelete(s)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="divide-y divide-ink/5 md:hidden">
              {services.map((s) => (
                <li key={s.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{s.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <Chip className={cn(CATEGORY_CLASS[s.category] ?? "", "text-[11px] font-semibold uppercase")}>{s.category}</Chip>
                      <PubDot published={s.published} />
                      {s.startingPrice ? <span className="text-xs text-graphite">{s.startingPrice}</span> : null}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <Button variant="ghost" size="icon" className="size-10 text-graphite" aria-label={`Edit ${s.title}`} onClick={() => navigate(`/admin/services/${s.id}`)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-10 text-graphite hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete ${s.title}`}
                      onClick={() => setToDelete(s)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </AdminCard>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{toDelete?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>This removes the service and its public page permanently.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? <Spin /> : null} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* =================================================================== Editor */
export function ServiceEditor({ id }: { id?: string }) {
  const { onApiError } = useAdmin();
  const isNew = !id;

  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof ServiceForm>(key: K, value: ServiceForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const res = await api<{ service: Service }>(`api/services/${id}`, { admin: true });
        if (!alive) return;
        setForm(toForm(res.service));
        setSlugTouched(true);
      } catch (err) {
        if (onApiError(err)) return;
        setLoadError(err instanceof Error ? err.message : "Could not load this service.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, onApiError]);

  const slugError = useMemo(() => {
    if (!form.slug) return "Slug is required — it becomes the public URL.";
    if (!SLUG_RE.test(form.slug)) return "Use lowercase letters, numbers and dashes only.";
    return null;
  }, [form.slug]);

  async function save() {
    if (form.title.trim().length < 2) {
      toast.error("Give the service a title (at least 2 characters).");
      return;
    }
    if (slugError) {
      toast.error(slugError);
      return;
    }
    const body = {
      ...form,
      title: form.title.trim(),
      slug: form.slug.trim(),
      summary: form.summary.trim(),
      startingPrice: form.startingPrice.trim(),
      priceNote: form.priceNote.trim(),
      deliverables: form.deliverables.map((s) => s.trim()).filter(Boolean),
      useCases: form.useCases.map((s) => s.trim()).filter(Boolean),
      process: form.process.map((s) => s.trim()).filter(Boolean),
      exclusions: form.exclusions.map((s) => s.trim()).filter(Boolean),
      faqs: form.faqs.filter((f) => f.q.trim() && f.a.trim()),
      order: Number.isFinite(form.order) ? Math.max(0, Math.round(form.order)) : 99,
    };
    setSaving(true);
    try {
      if (isNew) {
        const res = await api<{ service: Service }>("api/services", { body, admin: true });
        toast.success("Service saved");
        // replace: Back must never return to the dead /new editor
        navigate(`/admin/services/${res.service.id}`, { replace: true });
      } else {
        await api<{ service: Service }>(`api/services/${id}`, { method: "PATCH", body, admin: true });
        toast.success("Service saved");
        navigate("/admin/services");
      }
    } catch (err) {
      onApiError(err);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!id) return;
    setDeleting(true);
    try {
      await api<{ success: boolean }>(`api/services/${id}`, { method: "DELETE", admin: true });
      toast.success("Service deleted");
      navigate("/admin/services");
    } catch (err) {
      onApiError(err);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-ink/10" />
        <div className="h-64 animate-pulse rounded-xl bg-ink/10" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <ErrorNote message={loadError} />
        <Button variant="outline" onClick={() => navigate("/admin/services")}>
          Back to services
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-28">
      <PageHead title={isNew ? "New service" : "Edit service"} desc={isNew ? "Describe what's included — clarity sells." : `/${form.slug}`}>
        <Button variant="outline" className="h-10" onClick={() => navigate("/admin/services")}>
          Back to list
        </Button>
      </PageHead>

      <div className="space-y-6">
        <AdminCard>
          <CardHead title="Basics" />
          <div className="space-y-4 p-5">
            <Field label="Title" htmlFor="s-title">
              <Input
                id="s-title"
                value={form.title}
                placeholder="e.g. Business Website"
                onChange={(e) => {
                  const title = e.target.value;
                  setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
                }}
              />
            </Field>
            <Field label="Slug" htmlFor="s-slug" hint={slugError ?? "Public URL: #/services/<slug> — lowercase letters, numbers, dashes."}>
              <Input
                id="s-slug"
                value={form.slug}
                className={cn(slugError && "border-destructive")}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.target.value);
                }}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" htmlFor="s-category">
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger id="s-category" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Starting price" htmlFor="s-price" hint="Shown as a label, e.g. “from ₹9,999”.">
                <Input id="s-price" value={form.startingPrice} placeholder="from ₹9,999" onChange={(e) => set("startingPrice", e.target.value)} />
              </Field>
            </div>
            <Field label="Price note (optional)" htmlFor="s-price-note" hint="e.g. “Final quote after a short call.”">
              <Input id="s-price-note" value={form.priceNote} onChange={(e) => set("priceNote", e.target.value)} />
            </Field>
            <Field label="Summary" htmlFor="s-summary" hint="One or two lines shown in service cards.">
              <CountedTextarea id="s-summary" value={form.summary} onChange={(v) => set("summary", v)} max={300} rows={2} />
            </Field>
            <Field label="Full description" htmlFor="s-desc">
              <CountedTextarea id="s-desc" value={form.description} onChange={(v) => set("description", v)} max={3000} rows={6} />
            </Field>
          </div>
        </AdminCard>

        <AdminCard>
          <CardHead title="What's included" desc="Lists rendered on the public service page." />
          <div className="space-y-5 p-5">
            <StringListField label="Deliverables" items={form.deliverables} onChange={(v) => set("deliverables", v)} placeholder="e.g. Up to 5 responsive pages" max={15} addLabel="Add deliverable" />
            <StringListField label="Use cases" items={form.useCases} onChange={(v) => set("useCases", v)} placeholder="e.g. Coaching institutes" max={10} addLabel="Add use case" />
            <StringListField label="Process" items={form.process} onChange={(v) => set("process", v)} placeholder="e.g. Discovery call → wireframe → build" max={10} addLabel="Add process step" />
            <StringListField label="Not included" items={form.exclusions} onChange={(v) => set("exclusions", v)} placeholder="e.g. Paid stock footage" max={10} addLabel="Add exclusion" />
          </div>
        </AdminCard>

        <AdminCard>
          <CardHead title="Mini FAQ" />
          <div className="p-5">
            <ServiceFaqsField items={form.faqs} onChange={(v) => set("faqs", v)} />
          </div>
        </AdminCard>
      </div>

      {/* sticky publishing bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-white/95 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Switch id="s-published" checked={form.published} onCheckedChange={(v) => set("published", v)} />
            <Label htmlFor="s-published" className="text-[13px] font-medium text-ink">
              Published — visible on the public site
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="s-order" className="text-[13px] font-medium text-ink">
              Order
            </Label>
            <Input
              id="s-order"
              type="number"
              min={0}
              max={999}
              value={form.order}
              onChange={(e) => set("order", Number(e.target.value))}
              className="h-9 w-20"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            {!isNew ? (
              <Button
                variant="outline"
                className="h-9 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={saving || deleting}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4" /> Delete
              </Button>
            ) : null}
            <Button className="h-9 bg-volt font-semibold text-ink hover:bg-volt-2" disabled={saving} onClick={() => void save()}>
              {saving ? <Spin /> : null} Save service
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{form.title}”?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the service from the site.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void remove();
              }}
            >
              {deleting ? <Spin /> : null} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
