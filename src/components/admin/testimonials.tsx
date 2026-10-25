"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, Quote, Star, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { Testimonial } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { AdminCard, EmptyState, ErrorNote, FadeUp, ListSkeleton, PageHead, Spin } from "./admin-ui";
import { useAdmin } from "./admin-context";
import { excerpt } from "./admin-utils";

// ---------------------------------------------------------------------------
// Testimonials — hide-until-published client quotes, edited via dialogs.
// ---------------------------------------------------------------------------

type FormState = {
  name: string;
  role: string;
  company: string;
  quote: string;
  rating: number;
  published: boolean;
  order: number;
};

function emptyForm(): FormState {
  return { name: "", role: "", company: "", quote: "", rating: 5, published: false, order: 99 };
}

function toForm(t: Testimonial): FormState {
  return { name: t.name, role: t.role ?? "", company: t.company ?? "", quote: t.quote, rating: t.rating, published: t.published, order: t.order };
}

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={cn("size-3.5", i < n ? "fill-volt-2 text-volt-2" : "text-ink/20")} aria-hidden="true" />
      ))}
    </span>
  );
}

export function TestimonialsView() {
  const { onApiError } = useAdmin();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Testimonial | null>(null); // existing
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Testimonial | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ testimonials: Testimonial[] }>("api/testimonials?all=1", { admin: true });
      setItems(res.testimonials);
    } catch (err) {
      if (onApiError(err)) return;
      setError(err instanceof Error ? err.message : "Could not load testimonials.");
    } finally {
      setLoading(false);
    }
  }, [onApiError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function togglePublished(t: Testimonial, published: boolean) {
    setToggling(t.id);
    setItems((list) => list.map((x) => (x.id === t.id ? { ...x, published } : x)));
    try {
      await api<{ testimonial: Testimonial }>(`api/testimonials/${t.id}`, { method: "PATCH", body: { published }, admin: true });
      toast.success(published ? "Testimonial published" : "Testimonial hidden");
    } catch (err) {
      // per-row revert — never roll back unrelated concurrent toggles
      setItems((list) => list.map((x) => (x.id === t.id ? { ...x, published: t.published } : x)));
      onApiError(err);
    } finally {
      setToggling(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api<{ success: boolean }>(`api/testimonials/${toDelete.id}`, { method: "DELETE", admin: true });
      toast.success("Testimonial deleted");
      setItems((prev) => prev.filter((x) => x.id !== toDelete.id));
      setToDelete(null);
    } catch (err) {
      onApiError(err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHead title="Testimonials" desc="Social proof for the public site.">
        <Button className="h-10 bg-ink text-ivory hover:bg-ink/85" onClick={() => setCreating(true)}>
          <Plus className="size-4" /> Add testimonial
        </Button>
      </PageHead>

      <div className="mb-4 rounded-lg border border-volt/50 bg-volt/15 px-4 py-3 text-sm text-ink">
        Testimonials stay hidden until you publish them. Only add genuine client feedback.
      </div>

      {loading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <div className="space-y-4">
          <ErrorNote message={error} />
          <Button variant="outline" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : items.length === 0 ? (
        <AdminCard>
          <EmptyState
            icon={<Quote className="size-6" aria-hidden="true" />}
            title="No testimonials yet"
            body="After a project wraps, ask your client for two honest sentences — then add them here."
            action={
              <Button className="bg-ink text-ivory hover:bg-ink/85" onClick={() => setCreating(true)}>
                <Plus className="size-4" /> Add testimonial
              </Button>
            }
          />
        </AdminCard>
      ) : (
        <ul className="space-y-3">
          {items.map((t, i) => (
            <li key={t.id}>
              <FadeUp i={i}>
              <AdminCard className="flex flex-wrap items-start gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <Stars n={t.rating} />
                  <p className="mt-2 text-sm leading-relaxed text-ink">“{excerpt(t.quote, 180)}”</p>
                  <p className="mt-2 text-xs text-graphite">
                    <span className="font-semibold text-ink">{t.name}</span>
                    {t.role || t.company ? ` — ${[t.role, t.company].filter(Boolean).join(", ")}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-graphite">
                    <Switch
                      checked={t.published}
                      disabled={toggling === t.id}
                      onCheckedChange={(v) => void togglePublished(t, v)}
                      aria-label={`${t.published ? "Hide" : "Publish"} testimonial from ${t.name}`}
                    />
                    {t.published ? "Published" : "Hidden"}
                  </label>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-9" onClick={() => setEditing(t)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 text-graphite hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete testimonial from ${t.name}`}
                      onClick={() => setToDelete(t)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </AdminCard>
              </FadeUp>
            </li>
          ))}
        </ul>
      )}

      <TestimonialDialog
        open={creating || !!editing}
        testimonial={editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
        onSaved={(saved, isNew) => {
          setItems((prev) => (isNew ? [...prev, saved] : prev.map((x) => (x.id === saved.id ? saved : x))));
          setCreating(false);
          setEditing(null);
        }}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete testimonial from {toDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the quote from the site.</AlertDialogDescription>
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

/* ------------------------------------------------------------------- dialog */
function TestimonialDialog({
  open,
  testimonial,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  testimonial: Testimonial | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (t: Testimonial, isNew: boolean) => void;
}) {
  const { onApiError } = useAdmin();
  const isNew = !testimonial;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  // re-seed the form each time the dialog opens
  useEffect(() => {
    if (open) setForm(testimonial ? toForm(testimonial) : emptyForm());
  }, [open, testimonial]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (form.name.trim().length < 2) return toast.error("Enter the client's name.");
    if (form.quote.trim().length < 10) return toast.error("The quote needs at least 10 characters.");
    const body = {
      name: form.name.trim(),
      role: form.role.trim(),
      company: form.company.trim(),
      quote: form.quote.trim(),
      rating: Math.min(5, Math.max(1, Math.round(form.rating))),
      published: form.published,
      order: Number.isFinite(form.order) ? Math.max(0, Math.round(form.order)) : 99,
    };
    setSaving(true);
    try {
      const res = isNew
        ? await api<{ testimonial: Testimonial }>("api/testimonials", { body, admin: true })
        : await api<{ testimonial: Testimonial }>(`api/testimonials/${testimonial.id}`, { method: "PATCH", body, admin: true });
      toast.success(isNew ? "Testimonial added" : "Testimonial saved");
      onSaved(res.testimonial, isNew);
    } catch (err) {
      onApiError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg scroll-slim">
        <DialogHeader>
          <DialogTitle className="font-display text-ink">{isNew ? "Add testimonial" : "Edit testimonial"}</DialogTitle>
          <DialogDescription>Quotes from real clients — published state is controlled per testimonial.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="t-name" className="text-[13px] font-semibold text-ink">
                Name *
              </Label>
              <Input id="t-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Priya Menon" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-rating" className="text-[13px] font-semibold text-ink">
                Rating
              </Label>
              <Select value={String(form.rating)} onValueChange={(v) => set("rating", Number(v))}>
                <SelectTrigger id="t-rating" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} star{n === 1 ? "" : "s"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-role" className="text-[13px] font-semibold text-ink">
                Role (optional)
              </Label>
              <Input id="t-role" value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="e.g. Director" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-company" className="text-[13px] font-semibold text-ink">
                Company (optional)
              </Label>
              <Input id="t-company" value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="e.g. Apex Academy" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-quote" className="text-[13px] font-semibold text-ink">
              Quote *
            </Label>
            <Textarea id="t-quote" rows={4} value={form.quote} onChange={(e) => set("quote", e.target.value)} placeholder="What did they say about working with you?" />
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <label className="flex items-center gap-2 text-[13px] font-medium text-ink">
              <Switch checked={form.published} onCheckedChange={(v) => set("published", v)} aria-label="Publish testimonial" />
              Published
            </label>
            <label className="flex items-center gap-2 text-[13px] font-medium text-ink">
              Order
              <Input
                type="number"
                min={0}
                max={999}
                value={form.order}
                onChange={(e) => set("order", Number(e.target.value))}
                className="h-9 w-20"
                aria-label="Display order"
              />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="bg-ink text-ivory hover:bg-ink/85" disabled={saving}>
              {saving ? <Spin /> : null} {isNew ? "Add testimonial" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
