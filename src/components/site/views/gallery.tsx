"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock3, Film, Images, Play } from "lucide-react";
import { useSite, waLink } from "@/components/site/site-context";
import { Chip, EASE, PageHeader, Reveal, VoltButton } from "@/components/site/primitives";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { GalleryItem, GalleryType } from "@/lib/types";

// ---------------------------------------------------------------------------
// GALLERY — curated video & photo showcase. Filterable without a reload;
// videos open a native-player modal, photos an arrow-key lightbox. Drafts are
// never present here: the content layer only exposes published media.
// ---------------------------------------------------------------------------

type Filter = "all" | GalleryType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "video", label: "Videos" },
  { value: "photo", label: "Photos" },
];

function formatDuration(totalSeconds: number): string | null {
  if (!totalSeconds || totalSeconds <= 0) return null;
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Poster/thumbnail with a graceful gradient fallback while nothing is set. */
function MediaStill({ item, className, imgClassName }: { item: GalleryItem; className?: string; imgClassName?: string }) {
  const src = item.type === "video" ? item.posterPath || item.thumbPath : item.thumbPath || item.mediaPath;
  if (!src) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center bg-gradient-to-br from-coal via-ink to-coal", className)} aria-hidden="true">
        {item.type === "video" ? <Film className="h-10 w-10 text-ivory/15" /> : <Images className="h-10 w-10 text-ivory/15" />}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={item.type === "photo" ? item.altText || item.title : `${item.title} — video thumbnail`}
      loading="lazy"
      decoding="async"
      className={cn("h-full w-full object-cover", imgClassName)}
    />
  );
}

/* -------------------------------------------------------------- video modal */
function VideoModal({ item, onClose }: { item: GalleryItem | null; onClose: () => void }) {
  // Radix closes on Escape, but when the native <video> shadow-DOM controls
  // hold focus Chromium consumes the key before it reaches Radix's document
  // listener. A capture-phase window listener sees it first.
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [item, onClose]);

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      {item ? (
        <DialogContent
          className="max-w-4xl gap-0 overflow-hidden rounded-2xl border-ivory/10 bg-[#0a0a0b] p-0 text-ivory sm:max-w-4xl [&>button]:text-ivory/70 [&>button]:hover:text-ivory [&>button]:rounded-full [&>button]:bg-ink/60 [&>button]:backdrop-blur"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">{item.title}</DialogTitle>
          {/* conditional mount => closing the modal unloads the media element */}
          <video
            key={item.id}
            controls
            playsInline
            preload="metadata"
            poster={item.posterPath || undefined}
            className="aspect-video w-full bg-black"
            aria-label={item.title}
          >
            <source src={item.mediaPath} type={item.mediaPath.toLowerCase().endsWith(".webm") ? "video/webm" : "video/mp4"} />
            Your browser does not support HTML video.
          </video>
          <div className="space-y-3 p-6 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              {item.category ? <Chip>{item.category}</Chip> : null}
              {item.clientName ? <Chip>{item.clientName}</Chip> : null}
              {formatDuration(item.durationSeconds) ? (
                <Chip className="border-volt/30 text-volt">
                  <Clock3 className="h-3 w-3" aria-hidden="true" /> {formatDuration(item.durationSeconds)}
                </Chip>
              ) : null}
            </div>
            <h3 className="font-display text-xl font-bold tracking-tight sm:text-2xl">{item.title}</h3>
            {item.description ? <p className="max-w-2xl text-sm leading-relaxed text-smoke">{item.description}</p> : null}
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

/* ------------------------------------------------------------- photo lightbox */
function PhotoLightbox({
  photos,
  index,
  onClose,
  onNavigate,
}: {
  photos: GalleryItem[];
  index: number | null;
  onClose: () => void;
  onNavigate: (next: number) => void;
}) {
  const open = index !== null && index >= 0 && index < photos.length;

  // arrow-key navigation + Escape (Radix handles focus trapping & scroll lock)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onNavigate((index as number) - 1 < 0 ? photos.length - 1 : (index as number) - 1);
      if (e.key === "ArrowRight") onNavigate(((index as number) + 1) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, photos.length, onNavigate]);

  const item = open ? photos[index as number] : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {item ? (
        <DialogContent
          showCloseButton={false}
          className="h-full max-w-full rounded-none border-0 bg-ink/95 p-0 sm:max-w-full"
          aria-describedby={undefined}
        >
          <div className="relative flex h-[100dvh] w-full flex-col items-center justify-center gap-5 px-4 py-16 sm:px-20">
            <img
              key={item.id}
              src={item.mediaPath}
              alt={item.altText || item.title}
              className="max-h-[74vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
              decoding="async"
            />
            <div className="text-center">
              <p className="font-display text-sm font-semibold text-ivory sm:text-base">{item.title}</p>
              {item.caption || item.category ? (
                <p className="mt-1 text-xs text-smoke">
                  {[item.caption, item.category].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              <p className="mt-2 font-display text-[11px] uppercase tracking-[0.2em] text-ivory/40 tabular-nums" aria-live="polite">
                {(index as number) + 1} / {photos.length}
              </p>
            </div>

            {/* prev / next */}
            {photos.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate((index as number) - 1 < 0 ? photos.length - 1 : (index as number) - 1)}
                  aria-label="Previous photo"
                  className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-ivory/15 bg-ink/70 text-ivory backdrop-blur transition-colors hover:border-volt hover:text-volt sm:left-8"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate(((index as number) + 1) % photos.length)}
                  aria-label="Next photo"
                  className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-ivory/15 bg-ink/70 text-ivory backdrop-blur transition-colors hover:border-volt hover:text-volt sm:right-8"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close lightbox"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-ivory/15 bg-ink/70 text-ivory backdrop-blur transition-colors hover:border-volt hover:text-volt"
            >
              <span aria-hidden="true" className="text-lg leading-none">✕</span>
            </button>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

/* ------------------------------------------------------------------- view */
export default function GalleryView() {
  const { settings, gallery } = useSite();
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState<Filter>("all");
  const [activeVideo, setActiveVideo] = useState<GalleryItem | null>(null);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);

  // featured first, then curator order
  const byPriority = useCallback(
    (items: GalleryItem[]) => [...items].sort((a, b) => Number(b.featured) - Number(a.featured) || a.displayOrder - b.displayOrder),
    []
  );

  const videos = useMemo(() => byPriority(gallery.filter((g) => g.type === "video")), [gallery, byPriority]);
  const photos = useMemo(() => byPriority(gallery.filter((g) => g.type === "photo")), [gallery, byPriority]);

  const showVideos = filter === "all" || filter === "video";
  const showPhotos = filter === "all" || filter === "photo";
  const isEmpty = videos.length === 0 && photos.length === 0;

  const whatsappHref = waLink(settings.contact.whatsapp);

  const navToLightbox = useCallback(
    (next: number) => {
      if (next < 0) setPhotoIndex(photos.length - 1);
      else if (next >= photos.length) setPhotoIndex(0);
      else setPhotoIndex(next);
    },
    [photos.length]
  );

  return (
    <>
      <PageHeader
        kicker="The Gallery"
        title={
          <>
            Motion and stills,
            <br />
            cut with intent.
          </>
        }
        sub="Selected edits and photographs from the studio — promo videos, reels and visual work, curated like a portfolio rather than a file browser."
        meta="Videos / Photos / Featured Selections"
      />

      {/* -------------------------------------------------- sticky filter bar */}
      <div
        className="sticky top-[72px] z-30 border-b border-ivory/10 bg-ink/85 backdrop-blur-xl"
        role="group"
        aria-label="Filter gallery media"
      >
        <div className="container-x flex items-center gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => {
            const active = filter === f.value;
            const count = f.value === "all" ? gallery.length : f.value === "video" ? videos.length : photos.length;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={active}
                className={cn(
                  "inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-5 font-display text-[13px] font-medium uppercase tracking-[0.12em] transition-colors duration-300",
                  active
                    ? "bg-volt text-ink"
                    : "border border-ivory/15 text-ivory/60 hover:border-ivory/40 hover:text-ivory"
                )}
              >
                {f.label}
                <span className={cn("text-[11px] tabular-nums", active ? "text-ink/60" : "text-ivory/35")}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- grids */}
      <section className="bg-ink py-16 text-ivory sm:py-24" aria-label="Gallery media">
        <div className="container-x">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={filter}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              {isEmpty ? (
                /* -------------------------------------------- global empty */
                <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-ivory/15 px-6 py-20 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-ivory/10 bg-coal">
                    <Images className="h-6 w-6 text-ivory/40" aria-hidden="true" />
                  </div>
                  <h2 className="mt-6 font-display text-2xl font-bold tracking-tight text-ivory">The gallery is being curated.</h2>
                  <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-smoke">
                    Selected videos and photographs will appear here soon. In the meantime, the case studies in Work show how the craft comes together.
                  </p>
                  <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                    <VoltButton href="/work" variant="outline-light">Explore Our Work</VoltButton>
                    <VoltButton href="/services" variant="outline-light">View Services</VoltButton>
                  </div>
                </div>
              ) : (
                <>
                  {/* ================================================ videos */}
                  {showVideos ? (
                    <div aria-label="Video gallery">
                      <div className="flex items-baseline justify-between gap-4">
                        <h2 className="kicker flex items-center gap-2.5 text-volt">
                          <span className="inline-block h-px w-8 bg-volt" aria-hidden="true" />
                          Motion
                        </h2>
                        <p className="font-display text-xs uppercase tracking-[0.2em] text-ivory/35 tabular-nums" aria-live="polite">
                          {videos.length} item{videos.length === 1 ? "" : "s"}
                        </p>
                      </div>

                      {videos.length === 0 ? (
                        <p className="mt-6 rounded-2xl border border-dashed border-ivory/12 px-6 py-10 text-sm text-smoke">
                          No published videos yet — new edits land here as they leave the timeline.
                        </p>
                      ) : (
                        <div className="mt-8 grid gap-6 lg:grid-cols-12 lg:gap-8">
                          {videos.map((item, i) => {
                            const vertical = item.width > 0 && item.height > 0 ? item.height / item.width > 1.05 : false;
                            const span = vertical ? "lg:col-span-4" : i % 2 === 0 ? "lg:col-span-7" : "lg:col-span-5";
                            const ratio = vertical
                              ? item.width > 0 && item.height > 0
                                ? `${item.width}/${item.height}`
                                : "9/16"
                              : "16/10";
                            return (
                              <Reveal key={item.id} delay={0.05 * (i % 4)} className={cn(span, vertical && "lg:mx-auto lg:max-w-sm")}>
                                <button
                                  type="button"
                                  onClick={() => setActiveVideo(item)}
                                  className="group block w-full text-left"
                                  aria-label={`Play video: ${item.title}`}
                                >
                                  <div
                                    className="relative overflow-hidden rounded-2xl border border-ivory/10 bg-coal"
                                    style={{ aspectRatio: ratio }}
                                  >
                                    <MediaStill
                                      item={item}
                                      imgClassName="transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" aria-hidden="true" />

                                    {/* play affordance */}
                                    <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-ivory/25 bg-ink/55 backdrop-blur-md transition-all duration-500 group-hover:scale-110 group-hover:border-volt group-hover:bg-volt">
                                      <Play className="h-6 w-6 translate-x-[1px] text-ivory transition-colors group-hover:text-ink" aria-hidden="true" fill="currentColor" />
                                    </span>

                                    {item.featured ? (
                                      <span className="absolute left-4 top-4 rounded-full bg-volt px-3 py-1 font-display text-[10px] font-bold uppercase tracking-[0.16em] text-ink">
                                        Featured
                                      </span>
                                    ) : null}
                                    {formatDuration(item.durationSeconds) ? (
                                      <span className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-ink/75 px-3 py-1 font-display text-[11px] font-medium tabular-nums text-ivory/90 backdrop-blur-sm">
                                        <Clock3 className="h-3 w-3" aria-hidden="true" />
                                        {formatDuration(item.durationSeconds)}
                                      </span>
                                    ) : null}
                                  </div>

                                  <div className="mt-4 flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                      <h3 className="font-display text-lg font-bold tracking-tight text-ivory transition-colors group-hover:text-volt sm:text-xl">
                                        {item.title}
                                      </h3>
                                      {item.description ? (
                                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-smoke">{item.description}</p>
                                      ) : null}
                                    </div>
                                    <div className="shrink-0 text-right">
                                      {item.category ? (
                                        <p className="font-display text-[11px] uppercase tracking-[0.16em] text-volt">{item.category}</p>
                                      ) : null}
                                      {item.clientName ? (
                                        <p className="mt-1 font-display text-[11px] uppercase tracking-[0.16em] text-ivory/35">{item.clientName}</p>
                                      ) : null}
                                    </div>
                                  </div>
                                </button>
                              </Reveal>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* ================================================ photos */}
                  {showPhotos ? (
                    <div className={showVideos && videos.length > 0 ? "mt-20 sm:mt-28" : ""} aria-label="Photo gallery">
                      <div className="flex items-baseline justify-between gap-4">
                        <h2 className="kicker flex items-center gap-2.5 text-volt">
                          <span className="inline-block h-px w-8 bg-volt" aria-hidden="true" />
                          Stills
                        </h2>
                        <p className="font-display text-xs uppercase tracking-[0.2em] text-ivory/35 tabular-nums" aria-live="polite">
                          {photos.length} item{photos.length === 1 ? "" : "s"}
                        </p>
                      </div>

                      {photos.length === 0 ? (
                        <p className="mt-6 rounded-2xl border border-dashed border-ivory/12 px-6 py-10 text-sm text-smoke">
                          No published photographs yet — selected frames will appear here.
                        </p>
                      ) : (
                        <div className="mt-8 columns-1 gap-6 sm:columns-2 lg:columns-3 [&>*]:mb-6">
                          {photos.map((item, i) => (
                            <Reveal key={item.id} delay={0.04 * (i % 6)} className="break-inside-avoid">
                              <button
                                type="button"
                                onClick={() => setPhotoIndex(i)}
                                className="group relative block w-full overflow-hidden rounded-2xl border border-ivory/10 bg-coal text-left"
                                aria-label={`View photo: ${item.title}`}
                              >
                                <img
                                  src={item.thumbPath || item.mediaPath}
                                  alt={item.altText || item.title}
                                  width={item.width || undefined}
                                  height={item.height || undefined}
                                  loading="lazy"
                                  decoding="async"
                                  className="h-auto w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                                />
                                <div
                                  className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/15 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                                  aria-hidden="true"
                                />
                                <div className="absolute inset-x-0 bottom-0 translate-y-3 p-5 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                                  {item.category ? (
                                    <p className="font-display text-[10px] uppercase tracking-[0.18em] text-volt">{item.category}</p>
                                  ) : null}
                                  <p className="mt-1 font-display text-base font-bold tracking-tight text-ivory">{item.title}</p>
                                  {item.caption ? <p className="mt-0.5 line-clamp-2 text-xs text-ivory/70">{item.caption}</p> : null}
                                </div>
                                {item.featured ? (
                                  <span className="absolute left-4 top-4 rounded-full bg-volt px-3 py-1 font-display text-[10px] font-bold uppercase tracking-[0.16em] text-ink">
                                    Featured
                                  </span>
                                ) : null}
                              </button>
                            </Reveal>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ------------------------------------------------- back-path section */}
      <section className="border-t border-ivory/10 bg-ink py-16 text-ivory sm:py-20" aria-label="Explore more">
        <div className="container-x flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-xl">
            <Reveal>
              <p className="kicker text-volt">Keep Exploring</p>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="display-2 mt-4 text-ivory">The full picture lives across the studio.</h2>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="mt-4 text-sm leading-relaxed text-smoke sm:text-base">
                Website case studies live in Work, and every service — from sites to monthly content — is broken down under Services.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.18} className="flex flex-wrap items-center gap-4">
            <VoltButton href="/work" variant="outline-light" size="lg">
              Explore Our Work
            </VoltButton>
            <VoltButton href="/services" variant="volt" size="lg">
              View Services
            </VoltButton>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ modals */}
      <VideoModal item={activeVideo} onClose={() => setActiveVideo(null)} />
      <PhotoLightbox photos={photos} index={photoIndex} onClose={() => setPhotoIndex(null)} onNavigate={navToLightbox} />
    </>
  );
}
