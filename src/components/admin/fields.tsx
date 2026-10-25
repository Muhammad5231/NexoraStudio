"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ImageIcon, Plus, Upload, Video, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { ProjectMedia, ServiceFaq } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdmin } from "./admin-context";
import { isVideoUrl } from "./admin-utils";

// ---------------------------------------------------------------------------
// Reusable admin form fields: labeled inputs, string lists, media upload,
// and structured pair-list editors (process steps, stats, FAQs).
// ---------------------------------------------------------------------------

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024; // keep in sync with /api/media-upload

/** Debounce any changing value (search inputs etc). */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* -------------------------------------------------------------------- Field */
export function Field({
  label,
  hint,
  children,
  className,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-[13px] font-semibold text-ink">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-xs leading-relaxed text-graphite">{hint}</p> : null}
    </div>
  );
}

/* -------------------------------------------------------- Textarea + counter */
export function CountedTextarea({
  value,
  onChange,
  max,
  rows = 4,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  max: number;
  rows?: number;
  placeholder?: string;
  id?: string;
}) {
  return (
    <div className="space-y-1">
      <Textarea
        id={id}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
        className="resize-y"
      />
      <p className="text-right text-[11px] tabular-nums text-graphite">
        {value.length}/{max}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------- String list */
function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function StringListField({
  label,
  hint,
  items,
  onChange,
  placeholder,
  max = 12,
  addLabel,
}: {
  label: string;
  hint?: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  max?: number;
  addLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-[13px] font-semibold text-ink">{label}</Label>
      {hint ? <p className="text-xs text-graphite">{hint}</p> : null}
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-ink/15 px-3 py-2.5 text-xs text-graphite">
          Nothing here yet — add the first entry below.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <Input
                value={item}
                placeholder={placeholder}
                aria-label={`${label} entry ${i + 1}`}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = e.target.value;
                  onChange(next);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 text-graphite"
                aria-label={`Move ${label} entry ${i + 1} up`}
                disabled={i === 0}
                onClick={() => onChange(move(items, i, i - 1))}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 text-graphite"
                aria-label={`Move ${label} entry ${i + 1} down`}
                disabled={i === items.length - 1}
                onClick={() => onChange(move(items, i, i + 1))}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 text-graphite hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Remove ${label} entry ${i + 1}`}
                onClick={() => onChange(items.filter((_, j) => j !== i))}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9"
        disabled={items.length >= max}
        onClick={() => onChange([...items, ""])}
      >
        <Plus className="size-4" /> {addLabel ?? "Add entry"}
      </Button>
    </div>
  );
}

/* --------------------------------------------------------------- MediaField */
export function MediaField({
  label,
  value,
  onChange,
  hint,
  id,
}: {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
  id?: string;
}) {
  const { onApiError } = useAdmin();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const video = isVideoUrl(value);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("File too large — maximum size is 12 MB.");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    try {
      const res = await api<{ url: string }>("api/media-upload", { method: "POST", formData: fd, admin: true });
      onChange(res.url);
      toast.success("Media uploaded");
    } catch (err) {
      onApiError(err);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const input = (
    <div className="flex items-center gap-2">
      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-ink/10 bg-ink/[0.03]">
        {value ? (
          video ? (
            <div className="flex size-full items-center justify-center text-ink/50">
              <Video className="size-5" aria-hidden="true" />
            </div>
          ) : (
            <img src={value} alt="Media preview" className="size-full object-cover" />
          )
        ) : (
          <div className="flex size-full items-center justify-center text-ink/25">
            <ImageIcon className="size-5" aria-hidden="true" />
          </div>
        )}
      </div>
      <Input
        id={id}
        value={value}
        placeholder="Paste a URL or upload a file…"
        onChange={(e) => onChange(e.target.value)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 shrink-0"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
      >
        {uploading ? <span className="size-4 animate-spin rounded-full border-2 border-ink/20 border-t-ink" aria-hidden="true" /> : <Upload className="size-4" />}
        <span className="hidden sm:inline">{uploading ? "Uploading…" : "Upload"}</span>
      </Button>
      <input
        ref={fileRef}
        type="file"
        className="sr-only"
        aria-label="Upload media file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  );

  if (!label) return input;
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      {input}
    </Field>
  );
}

/* -------------------------------------------------------- Media gallery list */
export function MediaGalleryField({
  label,
  hint,
  items,
  onChange,
}: {
  label: string;
  hint?: string;
  items: ProjectMedia[];
  onChange: (items: ProjectMedia[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-[13px] font-semibold text-ink">{label}</Label>
      {hint ? <p className="text-xs text-graphite">{hint}</p> : null}
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-ink/15 px-3 py-2.5 text-xs text-graphite">
          No gallery media yet — images and videos appear on the public case study.
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((item, i) => (
            <li key={i} className="rounded-lg border border-ink/10 bg-ink/[0.015] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-graphite">Item {i + 1}</span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-graphite"
                    aria-label={`Move media item ${i + 1} up`}
                    disabled={i === 0}
                    onClick={() => onChange(move(items, i, i - 1))}
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-graphite"
                    aria-label={`Move media item ${i + 1} down`}
                    disabled={i === items.length - 1}
                    onClick={() => onChange(move(items, i, i + 1))}
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-graphite hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove media item ${i + 1}`}
                    onClick={() => onChange(items.filter((_, j) => j !== i))}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
              <MediaField
                value={item.url}
                onChange={(url) => {
                  const next = [...items];
                  next[i] = { ...next[i], url };
                  onChange(next);
                }}
              />
              <div className="mt-2 grid gap-2 sm:grid-cols-[130px_1fr]">
                <Select
                  value={item.type}
                  onValueChange={(v) => {
                    const next = [...items];
                    next[i] = { ...next[i], type: v === "video" ? "video" : "image" };
                    onChange(next);
                  }}
                >
                  <SelectTrigger aria-label={`Media item ${i + 1} type`} className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={item.caption ?? ""}
                  placeholder="Caption (optional)"
                  aria-label={`Media item ${i + 1} caption`}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = { ...next[i], caption: e.target.value };
                    onChange(next);
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9"
        onClick={() => onChange([...items, { url: "", type: "image", caption: "" }])}
      >
        <Plus className="size-4" /> Add media
      </Button>
    </div>
  );
}

/* ------------------------------------------------------- Structured pairs UI */
function PairRowShell({
  children,
  index,
  count,
  label,
  onUp,
  onDown,
  onRemove,
}: {
  children: ReactNode;
  index: number;
  count: number;
  label: string;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  return (
    <li className="rounded-lg border border-ink/10 bg-ink/[0.015] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-graphite">
          {label} {index + 1}
        </span>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="size-8 text-graphite" aria-label={`Move ${label} ${index + 1} up`} disabled={index === 0} onClick={onUp}>
            <ArrowUp className="size-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-8 text-graphite" aria-label={`Move ${label} ${index + 1} down`} disabled={index === count - 1} onClick={onDown}>
            <ArrowDown className="size-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-8 text-graphite hover:bg-destructive/10 hover:text-destructive" aria-label={`Remove ${label} ${index + 1}`} onClick={onRemove}>
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
      {children}
    </li>
  );
}

function PairAddButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Button type="button" variant="outline" size="sm" className="h-9" onClick={onClick} disabled={disabled}>
      <Plus className="size-4" /> {label}
    </Button>
  );
}

/* -------------------------------------------------- Home → process steps */
export type ProcessStep = { step: string; title: string; body: string };

export function ProcessStepsField({
  items,
  onChange,
}: {
  items: ProcessStep[];
  onChange: (items: ProcessStep[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-[13px] font-semibold text-ink">Process steps</Label>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-ink/15 px-3 py-2.5 text-xs text-graphite">
          No steps yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((s, i) => (
            <PairRowShell
              key={i}
              index={i}
              count={items.length}
              label="Step"
              onUp={() => onChange(move(items, i, i - 1))}
              onDown={() => onChange(move(items, i, i + 1))}
              onRemove={() => onChange(items.filter((_, j) => j !== i))}
            >
              <div className="grid gap-2 sm:grid-cols-[80px_1fr]">
                <Input
                  value={s.step}
                  placeholder="01"
                  aria-label={`Step ${i + 1} number`}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = { ...next[i], step: e.target.value };
                    onChange(next);
                  }}
                />
                <Input
                  value={s.title}
                  placeholder="Step title"
                  aria-label={`Step ${i + 1} title`}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = { ...next[i], title: e.target.value };
                    onChange(next);
                  }}
                />
              </div>
              <Textarea
                value={s.body}
                rows={2}
                placeholder="What happens in this step…"
                aria-label={`Step ${i + 1} description`}
                className="mt-2"
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], body: e.target.value };
                  onChange(next);
                }}
              />
            </PairRowShell>
          ))}
        </ul>
      )}
      <PairAddButton
        label="Add step"
        onClick={() => onChange([...items, { step: String(items.length + 1).padStart(2, "0"), title: "", body: "" }])}
      />
    </div>
  );
}

/* -------------------------------------------------- Home → stat rows */
export type StatRow = { value: string; suffix: string; label: string };

export function StatsField({ items, onChange }: { items: StatRow[]; onChange: (items: StatRow[]) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-[13px] font-semibold text-ink">Stats strip</Label>
      <p className="text-xs text-graphite">Numbers shown on the home page (e.g. 24 + “h” + “Usual response time”).</p>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-ink/15 px-3 py-2.5 text-xs text-graphite">No stats yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((s, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <Input
                value={s.value}
                className="w-20 shrink-0"
                placeholder="24"
                aria-label={`Stat ${i + 1} value`}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], value: e.target.value };
                  onChange(next);
                }}
              />
              <Input
                value={s.suffix}
                className="w-16 shrink-0"
                placeholder="h"
                aria-label={`Stat ${i + 1} suffix`}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], suffix: e.target.value };
                  onChange(next);
                }}
              />
              <Input
                value={s.label}
                placeholder="Usual response time"
                aria-label={`Stat ${i + 1} label`}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], label: e.target.value };
                  onChange(next);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 text-graphite hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Remove stat ${i + 1}`}
                onClick={() => onChange(items.filter((_, j) => j !== i))}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <PairAddButton label="Add stat" onClick={() => onChange([...items, { value: "", suffix: "", label: "" }])} />
    </div>
  );
}

/* -------------------------------------------------- Service → mini FAQs */
export function ServiceFaqsField({ items, onChange }: { items: ServiceFaq[]; onChange: (items: ServiceFaq[]) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-[13px] font-semibold text-ink">Service FAQs</Label>
      <p className="text-xs text-graphite">Shown under this service on the public site.</p>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-ink/15 px-3 py-2.5 text-xs text-graphite">No FAQs yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((f, i) => (
            <PairRowShell
              key={i}
              index={i}
              count={items.length}
              label="FAQ"
              onUp={() => onChange(move(items, i, i - 1))}
              onDown={() => onChange(move(items, i, i + 1))}
              onRemove={() => onChange(items.filter((_, j) => j !== i))}
            >
              <Input
                value={f.q}
                placeholder="Question"
                aria-label={`FAQ ${i + 1} question`}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], q: e.target.value };
                  onChange(next);
                }}
              />
              <Textarea
                value={f.a}
                rows={2}
                placeholder="Answer"
                aria-label={`FAQ ${i + 1} answer`}
                className="mt-2"
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], a: e.target.value };
                  onChange(next);
                }}
              />
            </PairRowShell>
          ))}
        </ul>
      )}
      <PairAddButton label="Add FAQ" onClick={() => onChange([...items, { q: "", a: "" }])} />
    </div>
  );
}
