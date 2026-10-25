"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { HelpCircle, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import type { Faq } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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

// ---------------------------------------------------------------------------
// FAQs — site-wide questions, edited via inline dialogs.
// ---------------------------------------------------------------------------

type FormState = { question: string; answer: string; published: boolean; order: number };

function emptyForm(): FormState {
  return { question: "", answer: "", published: false, order: 99 };
}

export function FaqsView() {
  const { onApiError } = useAdmin();
  const [items, setItems] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Faq | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Faq | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ faqs: Faq[] }>("api/faqs?all=1", { admin: true });
      setItems(res.faqs);
    } catch (err) {
      if (onApiError(err)) return;
      setError(err instanceof Error ? err.message : "Could not load FAQs.");
    } finally {
      setLoading(false);
    }
  }, [onApiError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function togglePublished(f: Faq, published: boolean) {
    setToggling(f.id);
    setItems((list) => list.map((x) => (x.id === f.id ? { ...x, published } : x)));
    try {
      await api<{ faq: Faq }>(`api/faqs/${f.id}`, { method: "PATCH", body: { published }, admin: true });
      toast.success(published ? "FAQ published" : "FAQ hidden");
    } catch (err) {
      // per-row revert — never roll back unrelated concurrent toggles
      setItems((list) => list.map((x) => (x.id === f.id ? { ...x, published: f.published } : x)));
      onApiError(err);
    } finally {
      setToggling(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api<{ success: boolean }>(`api/faqs/${toDelete.id}`, { method: "DELETE", admin: true });
      toast.success("FAQ deleted");
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
      <PageHead title="FAQs" desc="Answers shown in the public FAQ section.">
        <Button className="h-10 bg-ink text-ivory hover:bg-ink/85" onClick={() => setCreating(true)}>
          <Plus className="size-4" /> Add FAQ
        </Button>
      </PageHead>

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
            icon={<HelpCircle className="size-6" aria-hidden="true" />}
            title="No FAQs yet"
            body="Answer the questions every client asks — pricing, timelines, revisions, process."
            action={
              <Button className="bg-ink text-ivory hover:bg-ink/85" onClick={() => setCreating(true)}>
                <Plus className="size-4" /> Add FAQ
              </Button>
            }
          />
        </AdminCard>
      ) : (
        <ul className="space-y-3">
          {items.map((f, i) => (
            <li key={f.id}>
              <FadeUp i={i}>
              <AdminCard className="flex flex-wrap items-start justify-between gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{f.question}</p>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-graphite">{f.answer}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-graphite">
                    <Switch
                      checked={f.published}
                      disabled={toggling === f.id}
                      onCheckedChange={(v) => void togglePublished(f, v)}
                      aria-label={`${f.published ? "Hide" : "Publish"} FAQ: ${f.question}`}
                    />
                    {f.published ? "Published" : "Hidden"}
                  </label>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-9" onClick={() => setEditing(f)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 text-graphite hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete FAQ: ${f.question}`}
                      onClick={() => setToDelete(f)}
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

      <FaqDialog
        open={creating || !!editing}
        faq={editing}
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
            <AlertDialogTitle>Delete this FAQ?</AlertDialogTitle>
            <AlertDialogDescription>“{toDelete?.question}” will be permanently removed.</AlertDialogDescription>
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
function FaqDialog({
  open,
  faq,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  faq: Faq | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (f: Faq, isNew: boolean) => void;
}) {
  const { onApiError } = useAdmin();
  const isNew = !faq;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(faq ? { question: faq.question, answer: faq.answer, published: faq.published, order: faq.order } : emptyForm());
    }
  }, [open, faq]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (form.question.trim().length < 5) return toast.error("The question needs at least 5 characters.");
    if (form.answer.trim().length < 5) return toast.error("The answer needs at least 5 characters.");
    const body = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      published: form.published,
      order: Number.isFinite(form.order) ? Math.max(0, Math.round(form.order)) : 99,
    };
    setSaving(true);
    try {
      const res = isNew
        ? await api<{ faq: Faq }>("api/faqs", { body, admin: true })
        : await api<{ faq: Faq }>(`api/faqs/${faq.id}`, { method: "PATCH", body, admin: true });
      toast.success(isNew ? "FAQ added" : "FAQ saved");
      onSaved(res.faq, isNew);
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
          <DialogTitle className="font-display text-ink">{isNew ? "Add FAQ" : "Edit FAQ"}</DialogTitle>
          <DialogDescription>Keep answers short and specific — they appear on the public site.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="f-question" className="text-[13px] font-semibold text-ink">
              Question *
            </Label>
            <Input id="f-question" value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} placeholder="e.g. How long does a website take?" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-answer" className="text-[13px] font-semibold text-ink">
              Answer *
            </Label>
            <Textarea id="f-answer" rows={5} value={form.answer} onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))} placeholder="Write the answer here…" />
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <label className="flex items-center gap-2 text-[13px] font-medium text-ink">
              <Switch checked={form.published} onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))} aria-label="Publish FAQ" />
              Published
            </label>
            <label className="flex items-center gap-2 text-[13px] font-medium text-ink">
              Order
              <Input
                type="number"
                min={0}
                max={999}
                value={form.order}
                onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
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
              {saving ? <Spin /> : null} {isNew ? "Add FAQ" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
