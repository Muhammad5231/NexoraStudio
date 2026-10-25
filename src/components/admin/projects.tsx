"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, FolderKanban, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { navigate } from "@/lib/router";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { Project, ProjectMedia } from "@/lib/types";
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
import { CountedTextarea, Field, MediaField, MediaGalleryField, StringListField } from "./fields";

// ---------------------------------------------------------------------------
// Projects — portfolio list + full case-study editor.
// ---------------------------------------------------------------------------

const CATEGORIES = ["Websites", "Landing Pages", "Video Editing"] as const;
const PROJECT_TYPES = ["Concept Project", "Client Project"] as const;

type ProjectForm = {
  title: string;
  slug: string;
  client: string;
  category: string;
  projectType: string;
  year: string;
  description: string;
  overview: string;
  problem: string;
  objectives: string[];
  designDirection: string;
  solution: string;
  features: string[];
  technologies: string[];
  coverImage: string;
  media: ProjectMedia[];
  liveUrl: string;
  featured: boolean;
  published: boolean;
  showInWork: boolean;
  order: number;
};

function emptyForm(): ProjectForm {
  return {
    title: "",
    slug: "",
    client: "",
    category: "Websites",
    projectType: "Concept Project",
    year: String(new Date().getFullYear()),
    description: "",
    overview: "",
    problem: "",
    objectives: [],
    designDirection: "",
    solution: "",
    features: [],
    technologies: [],
    coverImage: "",
    media: [],
    liveUrl: "",
    featured: false,
    published: false,
    showInWork: true,
    order: 99,
  };
}

function toForm(p: Project): ProjectForm {
  return {
    title: p.title,
    slug: p.slug,
    client: p.client ?? "",
    category: p.category,
    projectType: p.projectType,
    year: p.year ?? "",
    description: p.description ?? "",
    overview: p.overview ?? "",
    problem: p.problem ?? "",
    objectives: p.objectives ?? [],
    designDirection: p.designDirection ?? "",
    solution: p.solution ?? "",
    features: p.features ?? [],
    technologies: p.technologies ?? [],
    coverImage: p.coverImage ?? "",
    media: p.media ?? [],
    liveUrl: p.liveUrl ?? "",
    featured: p.featured,
    published: p.published,
    showInWork: p.showInWork,
    order: p.order,
  };
}

/* ===================================================================== List */
export function ProjectList() {
  const { onApiError } = useAdmin();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ projects: Project[] }>("api/projects?all=1", { admin: true });
      setProjects(res.projects);
    } catch (err) {
      if (onApiError(err)) return;
      setError(err instanceof Error ? err.message : "Could not load projects.");
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
      await api<{ success: boolean }>(`api/projects/${toDelete.id}`, { method: "DELETE", admin: true });
      toast.success("Project deleted");
      setProjects((prev) => prev.filter((p) => p.id !== toDelete.id));
      setToDelete(null);
    } catch (err) {
      onApiError(err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHead title="Projects" desc="Your portfolio — case studies shown on the public work page.">
        <Button className="h-10 bg-ink text-ivory hover:bg-ink/85" onClick={() => navigate("/admin/projects/new")}>
          <Plus className="size-4" /> New Project
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
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="size-6" aria-hidden="true" />}
            title="No projects yet"
            body="Add your first case study — concept samples count too, just label them honestly."
            action={
              <Button className="bg-ink text-ivory hover:bg-ink/85" onClick={() => navigate("/admin/projects/new")}>
                <Plus className="size-4" /> New Project
              </Button>
            }
          />
        ) : (
          <>
            {/* desktop */}
            <div className="hidden overflow-x-auto lg:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Project</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead className="pr-5 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="py-3 pl-5">
                        <div className="flex items-center gap-3">
                          <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-ink/10 bg-ink/[0.03]">
                            {p.coverImage ? (
                              <img src={p.coverImage} alt="" className="size-full object-cover" />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                              <span className="truncate">{p.title}</span>
                              {p.featured ? (
                                <Star className="size-3.5 shrink-0 fill-volt-2 text-volt-2" aria-label="Featured" />
                              ) : null}
                            </span>
                            <span className="block truncate text-xs text-graphite">
                              {p.client || p.slug} {p.year ? `· ${p.year}` : ""}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip className={cn(CATEGORY_CLASS[p.category] ?? "", "px-2 py-0.5 text-[11px] font-semibold")}>
                          {p.category}
                        </Chip>
                      </TableCell>
                      <TableCell className="text-xs text-graphite">{p.projectType}</TableCell>
                      <TableCell>
                        <PubDot published={p.published} />
                      </TableCell>
                      <TableCell className="tabular-nums text-graphite">{p.order}</TableCell>
                      <TableCell className="pr-5">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-9 text-graphite" aria-label={`Edit ${p.title}`} onClick={() => navigate(`/admin/projects/${p.id}`)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9 text-graphite"
                            aria-label={`Preview ${p.title} on the public site`}
                            onClick={() => window.open(`#/work/${p.slug}`, "_blank")}
                          >
                            <ExternalLink className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9 text-graphite hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Delete ${p.title}`}
                            onClick={() => setToDelete(p)}
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

            {/* mobile cards */}
            <ul className="divide-y divide-ink/5 lg:hidden">
              {projects.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-4">
                  <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-ink/10 bg-ink/[0.03]">
                    {p.coverImage ? (
                      <img src={p.coverImage} alt="" className="size-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                      <span className="truncate">{p.title}</span>
                      {p.featured ? <Star className="size-3.5 shrink-0 fill-volt-2 text-volt-2" aria-label="Featured" /> : null}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <Chip className={cn(CATEGORY_CLASS[p.category] ?? "", "text-[11px] font-semibold")}>{p.category}</Chip>
                      <PubDot published={p.published} />
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <Button variant="ghost" size="icon" className="size-10 text-graphite" aria-label={`Edit ${p.title}`} onClick={() => navigate(`/admin/projects/${p.id}`)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-10 text-graphite hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete ${p.title}`}
                      onClick={() => setToDelete(p)}
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
            <AlertDialogDescription>
              This removes the project from the site permanently. The public case study URL will stop working.
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

/* =================================================================== Editor */
export function ProjectEditor({ id }: { id?: string }) {
  const { onApiError } = useAdmin();
  const isNew = !id;

  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof ProjectForm>(key: K, value: ProjectForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const res = await api<{ project: Project }>(`api/projects/${id}`, { admin: true });
        if (!alive) return;
        setForm(toForm(res.project));
        setSlugTouched(true); // keep existing slug as-is
      } catch (err) {
        if (onApiError(err)) return;
        setLoadError(err instanceof Error ? err.message : "Could not load this project.");
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

  async function save(opts?: { publish?: boolean }) {
    if (form.title.trim().length < 2) {
      toast.error("Give the project a title (at least 2 characters).");
      return;
    }
    if (slugError) {
      toast.error(slugError);
      return;
    }
    const effective: ProjectForm = { ...form, published: opts?.publish ? true : form.published };
    const body = {
      ...effective,
      title: effective.title.trim(),
      slug: effective.slug.trim(),
      client: effective.client.trim(),
      year: effective.year.trim(),
      liveUrl: effective.liveUrl.trim(),
      coverImage: effective.coverImage.trim(),
      objectives: effective.objectives.map((s) => s.trim()).filter(Boolean),
      features: effective.features.map((s) => s.trim()).filter(Boolean),
      technologies: effective.technologies.map((s) => s.trim()).filter(Boolean),
      media: effective.media.filter((m) => m.url.trim()),
      order: Number.isFinite(effective.order) ? Math.max(0, Math.round(effective.order)) : 99,
    };
    setSaving(true);
    try {
      if (isNew) {
        const res = await api<{ project: Project }>("api/projects", { body, admin: true });
        toast.success("Project saved");
        // replace: Back must never return to the dead /new editor
        navigate(`/admin/projects/${res.project.id}`, { replace: true });
      } else {
        await api<{ project: Project }>(`api/projects/${id}`, { method: "PATCH", body, admin: true });
        setForm((f) => ({ ...f, published: body.published }));
        toast.success("Project saved");
        navigate("/admin/projects");
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
      await api<{ success: boolean }>(`api/projects/${id}`, { method: "DELETE", admin: true });
      toast.success("Project deleted");
      navigate("/admin/projects");
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
        <div className="h-64 animate-pulse rounded-xl bg-ink/10" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <ErrorNote message={loadError} />
        <Button variant="outline" onClick={() => navigate("/admin/projects")}>
          Back to projects
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-28">
      <PageHead
        title={isNew ? "New project" : "Edit project"}
        desc={isNew ? "Fill in the story — you can save as a draft and publish later." : `/${form.slug}`}
      >
        <Button variant="outline" className="h-10" onClick={() => navigate("/admin/projects")}>
          Back to list
        </Button>
      </PageHead>

      <div className="space-y-6">
        {/* basics */}
        <AdminCard>
          <CardHead title="Basics" desc="Title, slug and classification." />
          <div className="space-y-4 p-5">
            <Field label="Title" htmlFor="p-title">
              <Input
                id="p-title"
                value={form.title}
                placeholder="e.g. Brew & Co. Website"
                onChange={(e) => {
                  const title = e.target.value;
                  setForm((f) => ({
                    ...f,
                    title,
                    slug: slugTouched ? f.slug : slugify(title),
                  }));
                }}
              />
            </Field>
            <Field
              label="Slug"
              htmlFor="p-slug"
              hint={slugError ?? "Public URL: #/work/<slug> — lowercase letters, numbers, dashes."}
            >
              <Input
                id="p-slug"
                value={form.slug}
                className={cn(slugError && "border-destructive")}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.target.value);
                }}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Client (optional)" htmlFor="p-client">
                <Input id="p-client" value={form.client} placeholder="e.g. Brew & Co." onChange={(e) => set("client", e.target.value)} />
              </Field>
              <Field label="Year" htmlFor="p-year">
                <Input id="p-year" value={form.year} placeholder="2025" onChange={(e) => set("year", e.target.value)} />
              </Field>
              <Field label="Category" htmlFor="p-category">
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger id="p-category" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label="Project type"
                htmlFor="p-type"
                hint="Label sample work as Concept Project until it's genuine client work."
              >
                <Select value={form.projectType} onValueChange={(v) => set("projectType", v)}>
                  <SelectTrigger id="p-type" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Live URL (optional)" htmlFor="p-liveurl" hint="Link to the deployed site, if it's public.">
              <Input id="p-liveurl" value={form.liveUrl} placeholder="https://…" onChange={(e) => set("liveUrl", e.target.value)} />
            </Field>
          </div>
        </AdminCard>

        {/* story */}
        <AdminCard>
          <CardHead title="Story" desc="The narrative shown on the public case study." />
          <div className="space-y-4 p-5">
            <Field label="Short description" htmlFor="p-desc" hint="One or two lines used in cards and previews.">
              <CountedTextarea id="p-desc" value={form.description} onChange={(v) => set("description", v)} max={400} rows={3} />
            </Field>
            <Field label="Overview" htmlFor="p-overview">
              <CountedTextarea id="p-overview" value={form.overview} onChange={(v) => set("overview", v)} max={4000} rows={5} />
            </Field>
            <Field label="The problem" htmlFor="p-problem">
              <CountedTextarea id="p-problem" value={form.problem} onChange={(v) => set("problem", v)} max={2000} rows={4} />
            </Field>
            <Field label="Design direction" htmlFor="p-direction">
              <CountedTextarea id="p-direction" value={form.designDirection} onChange={(v) => set("designDirection", v)} max={2000} rows={4} />
            </Field>
            <Field label="The solution" htmlFor="p-solution">
              <CountedTextarea id="p-solution" value={form.solution} onChange={(v) => set("solution", v)} max={2000} rows={4} />
            </Field>
          </div>
        </AdminCard>

        {/* lists */}
        <AdminCard>
          <CardHead title="Lists" desc="Bullets shown in the case study layout." />
          <div className="space-y-5 p-5">
            <StringListField
              label="Objectives"
              items={form.objectives}
              onChange={(v) => set("objectives", v)}
              placeholder="e.g. Double enquiries from the site"
              max={10}
              addLabel="Add objective"
            />
            <StringListField
              label="Features"
              items={form.features}
              onChange={(v) => set("features", v)}
              placeholder="e.g. Online booking form"
              max={12}
              addLabel="Add feature"
            />
            <StringListField
              label="Technologies"
              items={form.technologies}
              onChange={(v) => set("technologies", v)}
              placeholder="e.g. Next.js"
              max={15}
              addLabel="Add technology"
            />
          </div>
        </AdminCard>

        {/* media */}
        <AdminCard>
          <CardHead title="Media" desc="Cover image and gallery for the case study." />
          <div className="space-y-5 p-5">
            <MediaField label="Cover image" value={form.coverImage} onChange={(v) => set("coverImage", v)} hint="Shown on cards and as the case study header." />
            <MediaGalleryField
              label="Gallery"
              items={form.media}
              onChange={(v) => set("media", v)}
              hint="Images and videos appear after the story sections."
            />
          </div>
        </AdminCard>
      </div>

      {/* sticky publishing bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-white/95 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Switch id="p-published" checked={form.published} onCheckedChange={(v) => set("published", v)} />
            <Label htmlFor="p-published" className="text-[13px] font-medium text-ink">
              Published — visible on the public site
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="p-featured" checked={form.featured} onCheckedChange={(v) => set("featured", v)} />
            <Label htmlFor="p-featured" className="text-[13px] font-medium text-ink">
              Featured — appears first
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="p-showinwork" checked={form.showInWork} onCheckedChange={(v) => set("showInWork", v)} />
            <Label htmlFor="p-showinwork" className="text-[13px] font-medium text-ink">
              Show in Work grid — off for video-only work
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="p-order" className="text-[13px] font-medium text-ink">
              Order
            </Label>
            <Input
              id="p-order"
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
            <Button variant="outline" className="h-9" disabled={saving} onClick={() => void save()}>
              {saving ? <Spin /> : null} Save
            </Button>
            <Button className="h-9 bg-volt font-semibold text-ink hover:bg-volt-2" disabled={saving} onClick={() => void save({ publish: true })}>
              Save &amp; publish
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{form.title}”?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the project and its media references.</AlertDialogDescription>
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
