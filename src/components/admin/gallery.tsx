"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Clock3, Film, Images, Pencil, Plus, Search, Star, Trash2, Upload } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { GALLERY_LIMITS, type GalleryKind } from "@/lib/gallery-limits";
import type { GalleryItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
import { AdminCard, EmptyState, ErrorNote, FadeUp, ListSkeleton, PageHead, PubDot, Spin } from "./admin-ui";
import { useAdmin } from "./admin-context";
import { useDebouncedValue } from "./fields";

// ---------------------------------------------------------------------------
// Admin → Gallery. Two tabs (Videos / Photos) with hard server-enforced
// limits: GALLERY_LIMITS is the single source of truth for the UI copy too.
// Upload uses XHR so real progress can be shown; video posters are captured
// client-side from the timeline (replaceable with a custom upload).
// ---------------------------------------------------------------------------

type Usage = Record<GalleryKind, { total: number; published: number }>;
type LimitsShape = typeof GALLERY_LIMITS;

function formatDuration(sec: number): string | null {
  if (!sec || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ------------------------------------------------------------- upload helper */
// Large videos are sent as ≤8 MB chunks (reassembled server-side) — preview
// gateways and reverse proxies commonly reject single huge POST bodies.
// Chunks fly with limited parallelism (3 in flight) so a high-latency
// connection between the admin's browser and the server doesn't serialize
// every round-trip. The final chunk is always sent LAST and ALONE: the server
// assembles (and cleans up) the moment the last-index chunk lands.
// Mirrors CHUNK_SIZE in src/app/api/admin/gallery/upload/route.ts.
const CHUNK_SIZE = 8 * 1024 * 1024;
const CHUNK_CONCURRENCY = 3;

function xhrSend<T>(fd: FormData, onProgress: (percent: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/gallery/upload");
    xhr.setRequestHeader("x-nexora-admin", "1");
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new Error("Network error during upload — please retry."));
    xhr.onload = () => {
      const data = (xhr.response ?? {}) as { error?: string };
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response as T);
      else reject(new Error(data.error || `Upload failed (${xhr.status}).`));
    };
    xhr.send(fd);
  });
}

async function uploadWithProgress<T>(
  file: File | Blob,
  filename: string,
  mime: string,
  kind: "video" | "photo" | "poster",
  onProgress: (percent: number) => void
): Promise<T> {
  const asFile = file instanceof File ? file : new File([file], filename, { type: mime });

  // Small files (all photos/posters, short videos) go up in one request.
  if (kind !== "video" || asFile.size <= CHUNK_SIZE) {
    const fd = new FormData();
    fd.append("kind", kind);
    fd.append("file", asFile);
    return xhrSend<T>(fd, onProgress);
  }

  // Chunked video upload: parallel window over all but the final chunk, then
  // the final chunk alone (its arrival triggers server-side reassembly).
  const uploadId = crypto.randomUUID();
  const totalChunks = Math.ceil(asFile.size / CHUNK_SIZE);
  const lastIndex = totalChunks - 1; // ≥ 1 here because ≤CHUNK_SIZE returned above

  // Bytes confirmed per chunk → one smooth aggregate progress bar.
  const confirmed = new Array<number>(totalChunks).fill(0);
  let lastReported = -1;
  const report = () => {
    let bytes = 0;
    for (let i = 0; i < totalChunks; i++) bytes += confirmed[i];
    const percent = Math.min(99, Math.floor((bytes / asFile.size) * 100));
    if (percent > lastReported) {
      lastReported = percent;
      onProgress(percent);
    }
  };

  const sendChunk = (index: number): Promise<unknown> => {
    const blob = asFile.slice(index * CHUNK_SIZE, Math.min((index + 1) * CHUNK_SIZE, asFile.size));
    const fd = new FormData();
    fd.append("kind", "video");
    fd.append("uploadId", uploadId);
    fd.append("chunkIndex", String(index));
    fd.append("totalChunks", String(totalChunks));
    fd.append("file", blob, `${uploadId}.part${index}`);
    return xhrSend(fd, (percent) => {
      confirmed[index] = (percent / 100) * blob.size;
      report();
    }).then((res) => {
      confirmed[index] = blob.size;
      report();
      return res;
    });
  };

  // Parallel workers pull chunk indices from a shared cursor.
  let next = 0;
  const workers = Array.from({ length: Math.min(CHUNK_CONCURRENCY, lastIndex) }, async () => {
    while (next < lastIndex) {
      const index = next++;
      await sendChunk(index);
    }
  });
  await Promise.all(workers);

  // Final chunk — sent only after every other chunk is confirmed on the server.
  const finalBlob = asFile.slice(lastIndex * CHUNK_SIZE, asFile.size);
  const finalFd = new FormData();
  finalFd.append("kind", "video");
  finalFd.append("uploadId", uploadId);
  finalFd.append("chunkIndex", String(lastIndex));
  finalFd.append("totalChunks", String(totalChunks));
  finalFd.append("file", finalBlob, `${uploadId}.part${lastIndex}`);
  const result = await xhrSend<T>(finalFd, (percent) => {
    confirmed[lastIndex] = (percent / 100) * finalBlob.size;
    report();
  });

  onProgress(100);
  return result;
}

/** Grab a poster frame + duration from a video file, fully client-side. */
function capturePoster(file: File): Promise<{ blob: Blob; duration: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    let settled = false;
    const done = (result: { blob: Blob; duration: number } | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
      resolve(result);
    };
    const timer = window.setTimeout(() => done(null), 10000);
    const finish = (blob: Blob | null, duration: number) => {
      window.clearTimeout(timer);
      done(blob ? { blob, duration } : null);
    };

    video.onerror = () => finish(null, 0);
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? Math.round(video.duration) : 0;
      const target = Math.min(Math.max(duration * 0.1, 0.1), Math.max(duration - 0.1, 0.1));
      video.onseeked = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          if (!canvas.width || !canvas.height) return finish(null, duration);
          const ctx = canvas.getContext("2d");
          if (!ctx) return finish(null, duration);
          ctx.drawImage(video, 0, 0);
          canvas.toBlob((blob) => finish(blob, duration), "image/jpeg", 0.82);
        } catch {
          finish(null, duration);
        }
      };
      video.currentTime = target;
    };
    video.src = url;
  });
}

/* ----------------------------------------------------------------- usage card */
function UsageBar({ label, total, published, limits }: { label: string; total: number; published: number; limits: LimitsShape[GalleryKind] }) {
  const totalPct = Math.min(100, Math.round((total / limits.maxTotal) * 100));
  const pubPct = Math.min(100, Math.round((published / limits.maxPublished) * 100));
  const full = total >= limits.maxTotal;
  return (
    <div className="min-w-[220px] flex-1 rounded-lg border border-ink/10 bg-ink/[0.02] p-4">
      <p className="font-display text-xs font-bold uppercase tracking-[0.14em] text-ink">{label}</p>
      <p className="mt-2 text-sm text-graphite tabular-nums">
        <span className="font-semibold text-ink">{total}</span> / {limits.maxTotal} total items
        <span className="mx-2 text-ink/20">·</span>
        <span className="font-semibold text-ink">{published}</span> / {limits.maxPublished} published
      </p>
      <div className="mt-2.5 space-y-1.5">
        <Progress value={totalPct} className={cn("h-1.5", full && "[&>div]:bg-destructive")} aria-label={`${label} total usage`} />
        <Progress value={pubPct} className="h-1.5 [&>div]:bg-volt-2" aria-label={`${label} published usage`} />
      </div>
      <p className="mt-2 text-[11px] text-graphite">
        Uploads: {limits.extensions.join(", ").toUpperCase()} · max {limits.maxLabel}
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------------- view */
export function GalleryAdminView() {
  const { onApiError } = useAdmin();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [usage, setUsage] = useState<Usage>({ video: { total: 0, published: 0 }, photo: { total: 0, published: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<GalleryKind>("video");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "drafts">("all");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [toDelete, setToDelete] = useState<GalleryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ items: GalleryItem[]; usage: Usage }>("api/admin/gallery", { admin: true });
      setItems(res.items);
      setUsage(res.usage);
    } catch (err) {
      if (onApiError(err)) return;
      setError(err instanceof Error ? err.message : "Could not load the gallery.");
    } finally {
      setLoading(false);
    }
  }, [onApiError]);

  useEffect(() => {
    void load();
  }, [load]);

  const kindItems = useMemo(
    () =>
      items
        .filter((x) => x.type === tab)
        .sort((a, b) => a.displayOrder - b.displayOrder || a.createdAt.localeCompare(b.createdAt)),
    [items, tab]
  );

  const visible = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return kindItems.filter((x) => {
      if (statusFilter === "published" && !x.published) return false;
      if (statusFilter === "drafts" && x.published) return false;
      if (!q) return true;
      return [x.title, x.description, x.category, x.clientName].some((v) => v.toLowerCase().includes(q));
    });
  }, [kindItems, debouncedSearch, statusFilter]);

  const limits = GALLERY_LIMITS[tab];
  const atTotal = usage[tab].total >= limits.maxTotal;
  const slotsToFree = Math.max(0, usage[tab].total - limits.maxTotal + 1);

  async function togglePublished(item: GalleryItem, published: boolean) {
    setItems((list) => list.map((x) => (x.id === item.id ? { ...x, published } : x)));
    try {
      const res = await api<{ item: GalleryItem }>(`api/admin/gallery/${item.id}`, { method: "PATCH", body: { published }, admin: true });
      setItems((list) => list.map((x) => (x.id === item.id ? res.item : x)));
      setUsage((u) => ({ ...u, [item.type]: { ...u[item.type], published: u[item.type].published + (published ? 1 : -1) } }));
      toast.success(published ? "Published" : "Moved to drafts");
    } catch (err) {
      setItems((list) => list.map((x) => (x.id === item.id ? { ...x, published: item.published } : x)));
      onApiError(err);
    }
  }

  async function toggleFeatured(item: GalleryItem) {
    const featured = !item.featured;
    setItems((list) => list.map((x) => (x.id === item.id ? { ...x, featured } : x)));
    try {
      await api<{ item: GalleryItem }>(`api/admin/gallery/${item.id}`, { method: "PATCH", body: { featured }, admin: true });
      toast.success(featured ? "Marked as featured" : "Removed from featured");
    } catch (err) {
      setItems((list) => list.map((x) => (x.id === item.id ? { ...x, featured: item.featured } : x)));
      onApiError(err);
    }
  }

  async function move(item: GalleryItem, dir: -1 | 1) {
    const ids = kindItems.map((x) => x.id);
    const idx = ids.indexOf(item.id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= ids.length) return;
    [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
    setMoving(item.id);
    try {
      await api("api/admin/gallery/reorder", { body: { type: tab, ids }, admin: true });
      await load();
    } catch (err) {
      onApiError(err);
    } finally {
      setMoving(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api(`api/admin/gallery/${toDelete.id}`, { method: "DELETE", admin: true });
      toast.success("Item deleted — unused files were cleaned up.");
      setItems((prev) => prev.filter((x) => x.id !== toDelete.id));
      setUsage((u) => {
        const k = toDelete.type as GalleryKind;
        return { ...u, [k]: { total: Math.max(0, u[k].total - 1), published: Math.max(0, u[k].published - (toDelete.published ? 1 : 0)) } };
      });
      setToDelete(null);
    } catch (err) {
      onApiError(err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHead title="Gallery" desc="Videos and photography for the public gallery page. Limits are enforced server-side.">
        <Button
          className="h-10 bg-ink text-ivory hover:bg-ink/85"
          disabled={atTotal}
          title={atTotal ? `${tab === "video" ? "Video" : "Photo"} gallery is full — delete ${slotsToFree} item${slotsToFree > 1 ? "s" : ""} first.` : undefined}
          onClick={() => setUploadOpen(true)}
        >
          <Plus className="size-4" /> Add {tab === "video" ? "video" : "photo"}
        </Button>
      </PageHead>

      {atTotal ? (
        <div className="mb-4 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-ink">
          <strong>{tab === "video" ? "Video" : "Photo"} gallery is full ({usage[tab].total}/{limits.maxTotal}).</strong>{" "}
          Delete {slotsToFree} item{slotsToFree > 1 ? "s" : ""} before adding another — existing items can still be edited, reordered, published or unpublished.
        </div>
      ) : null}

      {/* tabs */}
      <div className="mb-4 flex items-center gap-2" role="tablist" aria-label="Gallery media type">
        {(["video", "photo"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full px-5 font-display text-[13px] font-semibold uppercase tracking-[0.1em] transition-colors",
              tab === k ? "bg-ink text-ivory" : "border border-ink/15 text-graphite hover:border-ink/40 hover:text-ink"
            )}
          >
            {k === "video" ? <Film className="size-4" aria-hidden="true" /> : <Images className="size-4" aria-hidden="true" />}
            {k === "video" ? "Videos" : "Photos"}
            <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[11px] tabular-nums">{usage[k].total}</span>
          </button>
        ))}
      </div>

      {/* usage vs limits */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <UsageBar label="Videos" total={usage.video.total} published={usage.video.published} limits={GALLERY_LIMITS.video} />
        <UsageBar label="Photos" total={usage.photo.total} published={usage.photo.published} limits={GALLERY_LIMITS.photo} />
      </div>

      {/* search + status filter */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/30" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${tab === "video" ? "videos" : "photos"}…`}
            className="pl-9"
            aria-label={`Search ${tab === "video" ? "videos" : "photos"}`}
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-ink/10 bg-white p-1">
          {(["all", "published", "drafts"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={statusFilter === s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "min-h-8 rounded-md px-3 text-xs font-semibold capitalize transition-colors",
                statusFilter === s ? "bg-ink text-ivory" : "text-graphite hover:text-ink"
              )}
            >
              {s}
            </button>
          ))}
        </div>
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
      ) : visible.length === 0 ? (
        <AdminCard>
          <EmptyState
            icon={tab === "video" ? <Film className="size-6" aria-hidden="true" /> : <Images className="size-6" aria-hidden="true" />}
            title={kindItems.length === 0 ? `No ${tab === "video" ? "videos" : "photos"} yet` : "Nothing matches"}
            body={
              kindItems.length === 0
                ? `Upload your first ${tab} — MP4/WebM up to ${GALLERY_LIMITS.video.maxLabel} for videos, JPEG/PNG/WebP up to ${GALLERY_LIMITS.photo.maxLabel} for photos.`
                : "Try a different search or status filter."
            }
            action={
              kindItems.length === 0 && !atTotal ? (
                <Button className="bg-ink text-ivory hover:bg-ink/85" onClick={() => setUploadOpen(true)}>
                  <Plus className="size-4" /> Add {tab === "video" ? "video" : "photo"}
                </Button>
              ) : undefined
            }
          />
        </AdminCard>
      ) : (
        <ul className="space-y-3">
          {visible.map((item, i) => {
            const orderIdx = kindItems.findIndex((x) => x.id === item.id);
            return (
              <li key={item.id}>
                <FadeUp i={i}>
                  <AdminCard className="flex flex-wrap items-start gap-4 p-4 sm:p-5">
                    {/* preview */}
                    <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg border border-ink/10 bg-ink/[0.03]">
                      {item.type === "video" ? (
                        item.posterPath ? (
                          <img src={item.posterPath} alt="" className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center text-ink/30">
                            <Film className="size-6" aria-hidden="true" />
                          </div>
                        )
                      ) : (
                        <img src={item.thumbPath || item.mediaPath} alt="" className="size-full object-cover" />
                      )}
                      {item.type === "video" && formatDuration(item.durationSeconds) ? (
                        <span className="absolute bottom-1 right-1 rounded bg-ink/80 px-1.5 py-0.5 text-[10px] font-semibold text-ivory tabular-nums">
                          {formatDuration(item.durationSeconds)}
                        </span>
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-sm font-bold text-ink">{item.title}</p>
                        <PubDot published={item.published} />
                        {item.featured ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-volt/20 px-1.5 py-0.5 text-[11px] font-semibold text-ink">
                            <Star className="size-3 fill-ink" aria-hidden="true" /> Featured
                          </span>
                        ) : null}
                      </div>
                      {item.description ? <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-graphite">{item.description}</p> : null}
                      <p className="mt-1.5 text-[11px] text-graphite">
                        {[item.category, item.clientName, `Order ${orderIdx + 1}`].filter(Boolean).join(" · ")}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      <label className="mr-1 flex cursor-pointer items-center gap-2 text-xs font-medium text-graphite">
                        <Switch
                          checked={item.published}
                          onCheckedChange={(v) => void togglePublished(item, v)}
                          aria-label={`${item.published ? "Unpublish" : "Publish"} ${item.title}`}
                        />
                        {item.published ? "Published" : "Draft"}
                      </label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("size-9 text-graphite hover:text-volt-2", item.featured && "text-volt-2")}
                        aria-label={item.featured ? `Remove ${item.title} from featured` : `Feature ${item.title}`}
                        onClick={() => void toggleFeatured(item)}
                      >
                        <Star className={cn("size-4", item.featured && "fill-volt-2")} />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-9 text-graphite" disabled={orderIdx === 0 || moving === item.id} aria-label={`Move ${item.title} up`} onClick={() => void move(item, -1)}>
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-9 text-graphite" disabled={orderIdx === kindItems.length - 1 || moving === item.id} aria-label={`Move ${item.title} down`} onClick={() => void move(item, 1)}>
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-9" onClick={() => setEditing(item)}>
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 text-graphite hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Delete ${item.title}`}
                        onClick={() => setToDelete(item)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </AdminCard>
                </FadeUp>
              </li>
            );
          })}
        </ul>
      )}

      <UploadDialog
        open={uploadOpen}
        kind={tab}
        onOpenChange={setUploadOpen}
        onCreated={(item) => {
          setItems((prev) => [...prev, item]);
          setUsage((u) => {
            const k = item.type as GalleryKind;
            return { ...u, [k]: { total: u[k].total + 1, published: u[k].published + (item.published ? 1 : 0) } };
          });
          setUploadOpen(false);
        }}
      />

      <EditDialog
        item={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={(saved) => setItems((prev) => prev.map((x) => (x.id === saved.id ? saved : x)))}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{toDelete?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the {toDelete?.type === "video" ? "video" : "photo"} from the public gallery. Its files are deleted from storage only if nothing else references them.
            </AlertDialogDescription>
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

/* ------------------------------------------------------- shared form state */
type MetaForm = {
  title: string;
  description: string;
  category: string;
  clientName: string;
  altText: string;
  caption: string;
  published: boolean;
  featured: boolean;
  displayOrder: number;
};

/* ------------------------------------------------------------ upload dialog */
function UploadDialog({
  open,
  kind,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  kind: GalleryKind;
  onOpenChange: (open: boolean) => void;
  onCreated: (item: GalleryItem) => void;
}) {
  const { onApiError } = useAdmin();
  const fileRef = useRef<HTMLInputElement>(null);
  const posterRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [mediaPath, setMediaPath] = useState("");
  const [posterPath, setPosterPath] = useState("");
  const [thumbPath, setThumbPath] = useState("");
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<MetaForm>({ title: "", description: "", category: "", clientName: "", altText: "", caption: "", published: false, featured: false, displayOrder: 99 });

  const limits = GALLERY_LIMITS[kind];
  const accept = kind === "video" ? "video/mp4,video/webm,.mp4,.webm" : "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

  const reset = useCallback(() => {
    setFile(null);
    setMediaPath("");
    setPosterPath("");
    setThumbPath("");
    setDims({ width: 0, height: 0 });
    setDuration(0);
    setUploading(false);
    setProgress(0);
    setUploadError(null);
    setSaving(false);
    setForm({ title: "", description: "", category: "", clientName: "", altText: "", caption: "", published: false, featured: false, displayOrder: 99 });
    if (fileRef.current) fileRef.current.value = "";
    if (posterRef.current) posterRef.current.value = "";
  }, []);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  async function handleFile(selected: File | undefined) {
    if (!selected) return;
    setUploadError(null);
    const ext = selected.name.split(".").pop()?.toLowerCase() ?? "";
    if (!limits.extensions.includes(ext)) {
      setUploadError(`“.${ext || "?"}” files are not accepted here. Allowed: ${limits.extensions.join(", ").toUpperCase()}.`);
      return;
    }
    if (selected.size > limits.maxBytes) {
      setUploadError(`That file is too large — the maximum for ${kind === "video" ? "videos" : "photos"} is ${limits.maxLabel}.`);
      return;
    }

    setFile(selected);
    if (!form.title) setForm((f) => ({ ...f, title: selected.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").slice(0, 120) }));

    setUploading(true);
    setProgress(0);
    try {
      if (kind === "video") {
        // capture a poster frame + duration before the upload
        const poster = await capturePoster(selected);
        if (poster) {
          setDuration(poster.duration);
          const res = await uploadWithProgress<{ url: string }>(poster.blob, "poster.jpg", "image/jpeg", "poster", setProgress);
          setPosterPath(res.url);
        }
        setProgress(0);
        const up = await uploadWithProgress<{ url: string }>(selected, selected.name, selected.type || "video/mp4", "video", setProgress);
        setMediaPath(up.url);
      } else {
        const up = await uploadWithProgress<{ url: string; thumbPath?: string; width?: number; height?: number }>(selected, selected.name, selected.type || "image/jpeg", "photo", setProgress);
        setMediaPath(up.url);
        setThumbPath(up.thumbPath ?? "");
        setDims({ width: up.width ?? 0, height: up.height ?? 0 });
      }
      toast.success("Upload complete — finish the details below.");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
      setFile(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleCustomPoster(selected: File | undefined) {
    if (!selected) return;
    if (selected.size > GALLERY_LIMITS.photo.maxBytes) {
      toast.error(`Poster must be under ${GALLERY_LIMITS.photo.maxLabel}.`);
      return;
    }
    try {
      const res = await uploadWithProgress<{ url: string }>(selected, selected.name, selected.type || "image/jpeg", "poster", () => undefined);
      setPosterPath(res.url);
      toast.success("Poster updated");
    } catch (err) {
      onApiError(err);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!mediaPath) return toast.error("Upload the media file first.");
    if (form.title.trim().length < 2) return toast.error("Enter a title (min 2 characters).");
    setSaving(true);
    try {
      const res = await api<{ item: GalleryItem }>("api/admin/gallery", {
        body: {
          type: kind,
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category.trim(),
          clientName: form.clientName.trim(),
          altText: form.altText.trim(),
          caption: form.caption.trim(),
          mediaPath,
          posterPath,
          thumbPath,
          width: dims.width,
          height: dims.height,
          durationSeconds: duration,
          featured: form.featured,
          published: form.published,
        },
        admin: true,
      });
      toast.success(form.published ? "Added and published" : "Added as a draft");
      onCreated(res.item);
    } catch (err) {
      onApiError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl scroll-slim">
        <DialogHeader>
          <DialogTitle className="font-display text-ink">Add {kind === "video" ? "video" : "photo"}</DialogTitle>
          <DialogDescription>
            {kind === "video"
              ? `MP4 or WebM up to ${limits.maxLabel}. A poster frame is captured automatically — replace it below if you like.`
              : `JPEG, PNG or WebP up to ${limits.maxLabel}. A fast thumbnail is generated automatically.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate>
          {/* file picker */}
          <div className="space-y-1.5">
            <Label htmlFor="g-file" className="text-[13px] font-semibold text-ink">
              Media file *
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="g-file"
                type="file"
                ref={fileRef}
                accept={accept}
                disabled={uploading || !!mediaPath}
                onChange={(e) => void handleFile(e.target.files?.[0])}
                className="file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ivory"
              />
              {mediaPath ? (
                <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={uploading}>
                  Replace
                </Button>
              ) : null}
            </div>
            {uploading ? (
              <div className="space-y-1 pt-1">
                <Progress value={progress} className="h-2" aria-label="Upload progress" />
                <p className="text-right text-[11px] tabular-nums text-graphite">{progress}%</p>
              </div>
            ) : null}
            {uploadError ? (
              <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {uploadError}
              </p>
            ) : null}
          </div>

          {/* preview */}
          {mediaPath ? (
            <div className="overflow-hidden rounded-lg border border-ink/10">
              {kind === "video" ? (
                <video src={mediaPath} poster={posterPath || undefined} controls preload="metadata" className="aspect-video w-full bg-black" aria-label="Video preview" />
              ) : (
                <img src={mediaPath} alt="Selected photo preview" className="max-h-64 w-full object-contain" />
              )}
            </div>
          ) : null}

          {/* poster replacement (videos) */}
          {kind === "video" && mediaPath ? (
            <div className="space-y-1.5">
              <Label htmlFor="g-poster" className="text-[13px] font-semibold text-ink">
                Poster image
              </Label>
              <div className="flex items-center gap-2">
                <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md border border-ink/10 bg-ink/[0.03]">
                  {posterPath ? <img src={posterPath} alt="Poster preview" className="size-full object-cover" /> : <span className="flex size-full items-center justify-center text-ink/25"><Film className="size-4" /></span>}
                </div>
                <Input id="g-poster" type="file" ref={posterRef} accept="image/jpeg,image/png,image/webp" className="file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ivory" onChange={(e) => void handleCustomPoster(e.target.files?.[0])} />
              </div>
              {duration > 0 ? (
                <p className="text-xs text-graphite">
                  <Clock3 className="mr-1 inline size-3" aria-hidden="true" /> Duration detected: {formatDuration(duration)}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* metadata */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="g-title" className="text-[13px] font-semibold text-ink">
                Title *
              </Label>
              <Input id="g-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder={kind === "video" ? "e.g. Café launch promo — 45s cut" : "e.g. Golden hour, rooftop"} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="g-desc" className="text-[13px] font-semibold text-ink">
                Short description
              </Label>
              <Textarea id="g-desc" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="One or two lines about this piece" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-cat" className="text-[13px] font-semibold text-ink">
                Category
              </Label>
              <Input id="g-cat" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder={kind === "video" ? "e.g. Promo / Reel / Ad" : "e.g. Portrait / Street"} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-client" className="text-[13px] font-semibold text-ink">
                {kind === "video" ? "Project / client (optional)" : "Attribution (optional)"}
              </Label>
              <Input id="g-client" value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} placeholder="Leave empty for studio work" />
            </div>
            {kind === "photo" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="g-alt" className="text-[13px] font-semibold text-ink">
                    Alt text
                  </Label>
                  <Input id="g-alt" value={form.altText} onChange={(e) => setForm((f) => ({ ...f, altText: e.target.value }))} placeholder="Describe the image for screen readers" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="g-caption" className="text-[13px] font-semibold text-ink">
                    Caption
                  </Label>
                  <Input id="g-caption" value={form.caption} onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))} placeholder="Shown in the lightbox" />
                </div>
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <label className="flex items-center gap-2 text-[13px] font-medium text-ink">
              <Switch checked={form.published} onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))} aria-label="Publish immediately" />
              Published
            </label>
            <label className="flex items-center gap-2 text-[13px] font-medium text-ink">
              <Switch checked={form.featured} onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))} aria-label="Feature this item" />
              <Star className="size-3.5" aria-hidden="true" /> Featured
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="bg-ink text-ivory hover:bg-ink/85" disabled={saving || uploading || !mediaPath}>
              {saving ? <Spin /> : <Upload className="size-4" />} Save {kind === "video" ? "video" : "photo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------- edit dialog */
function EditDialog({
  item,
  onOpenChange,
  onSaved,
}: {
  item: GalleryItem | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (item: GalleryItem) => void;
}) {
  const { onApiError } = useAdmin();
  const posterRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<MetaForm>({ title: "", description: "", category: "", clientName: "", altText: "", caption: "", published: false, featured: false, displayOrder: 0 });
  const [posterPath, setPosterPath] = useState("");
  const [saving, setSaving] = useState(false);
  const isNew = !item;

  useEffect(() => {
    if (item) {
      setForm({
        title: item.title,
        description: item.description,
        category: item.category,
        clientName: item.clientName,
        altText: item.altText,
        caption: item.caption,
        published: item.published,
        featured: item.featured,
        displayOrder: item.displayOrder,
      });
      setPosterPath(item.posterPath);
    }
  }, [item]);

  const set = <K extends keyof MetaForm>(key: K, value: MetaForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function handlePoster(selected: File | undefined) {
    if (!selected) return;
    if (selected.size > GALLERY_LIMITS.photo.maxBytes) {
      toast.error(`Poster must be under ${GALLERY_LIMITS.photo.maxLabel}.`);
      return;
    }
    try {
      const res = await uploadWithProgress<{ url: string }>(selected, selected.name, selected.type || "image/jpeg", "poster", () => undefined);
      setPosterPath(res.url);
      toast.success("Poster updated — save to apply");
    } catch (err) {
      onApiError(err);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!item) return;
    if (form.title.trim().length < 2) return toast.error("Enter a title (min 2 characters).");
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        clientName: form.clientName.trim(),
        altText: form.altText.trim(),
        caption: form.caption.trim(),
        published: form.published,
        featured: form.featured,
        displayOrder: Math.max(0, Math.round(form.displayOrder || 0)),
      };
      if (item.type === "video" && posterPath) body.posterPath = posterPath;
      const res = await api<{ item: GalleryItem }>(`api/admin/gallery/${item.id}`, { method: "PATCH", body, admin: true });
      toast.success("Saved");
      onSaved(res.item);
      onOpenChange(false);
    } catch (err) {
      onApiError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!isNew} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl scroll-slim">
        <DialogHeader>
          <DialogTitle className="font-display text-ink">Edit {item?.type === "video" ? "video" : "photo"}</DialogTitle>
          <DialogDescription>Update metadata, visibility and ordering. Files stay untouched unless you replace the poster.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate>
          {item ? (
            <div className="overflow-hidden rounded-lg border border-ink/10">
              {item.type === "video" ? (
                <video src={item.mediaPath} poster={posterPath || undefined} controls preload="metadata" className="aspect-video w-full bg-black" aria-label="Video preview" />
              ) : (
                <img src={item.mediaPath} alt={item.altText || item.title} className="max-h-64 w-full object-contain" />
              )}
            </div>
          ) : null}

          {item?.type === "video" ? (
            <div className="space-y-1.5">
              <Label htmlFor="ge-poster" className="text-[13px] font-semibold text-ink">
                Poster image
              </Label>
              <div className="flex items-center gap-2">
                <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md border border-ink/10 bg-ink/[0.03]">
                  {posterPath ? <img src={posterPath} alt="Poster preview" className="size-full object-cover" /> : <span className="flex size-full items-center justify-center text-ink/25"><Film className="size-4" /></span>}
                </div>
                <Input id="ge-poster" type="file" ref={posterRef} accept="image/jpeg,image/png,image/webp" className="file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ivory" onChange={(e) => void handlePoster(e.target.files?.[0])} />
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ge-title" className="text-[13px] font-semibold text-ink">
                Title *
              </Label>
              <Input id="ge-title" value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ge-desc" className="text-[13px] font-semibold text-ink">
                Short description
              </Label>
              <Textarea id="ge-desc" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ge-cat" className="text-[13px] font-semibold text-ink">
                Category
              </Label>
              <Input id="ge-cat" value={form.category} onChange={(e) => set("category", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ge-client" className="text-[13px] font-semibold text-ink">
                Project / client
              </Label>
              <Input id="ge-client" value={form.clientName} onChange={(e) => set("clientName", e.target.value)} />
            </div>
            {item?.type === "photo" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="ge-alt" className="text-[13px] font-semibold text-ink">
                    Alt text
                  </Label>
                  <Input id="ge-alt" value={form.altText} onChange={(e) => set("altText", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ge-caption" className="text-[13px] font-semibold text-ink">
                    Caption
                  </Label>
                  <Input id="ge-caption" value={form.caption} onChange={(e) => set("caption", e.target.value)} />
                </div>
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <label className="flex items-center gap-2 text-[13px] font-medium text-ink">
              <Switch checked={form.published} onCheckedChange={(v) => set("published", v)} aria-label="Published" />
              Published
            </label>
            <label className="flex items-center gap-2 text-[13px] font-medium text-ink">
              <Switch checked={form.featured} onCheckedChange={(v) => set("featured", v)} aria-label="Featured" />
              <Star className="size-3.5" aria-hidden="true" /> Featured
            </label>
            <label className="flex items-center gap-2 text-[13px] font-medium text-ink">
              Order
              <Input
                type="number"
                min={0}
                max={999}
                value={form.displayOrder}
                onChange={(e) => set("displayOrder", Number(e.target.value))}
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
              {saving ? <Spin /> : null} Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
