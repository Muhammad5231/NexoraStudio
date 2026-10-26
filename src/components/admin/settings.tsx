"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api-client";
import type { Settings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { AdminCard, CardHead, ErrorNote, PageHead, Spin } from "./admin-ui";
import { useAdmin } from "./admin-context";
import { PASSWORD_RE } from "./admin-utils";
import {
  CountedTextarea,
  Field,
  MediaField,
  ProcessStepsField,
  StatsField,
  StringListField,
  type ProcessStep,
  type StatRow,
} from "./fields";

// ---------------------------------------------------------------------------
// Settings — every public copy deck section, one tab each, plus the account
// (password) tab. Each tab saves its own section via PUT /api/settings.
// ---------------------------------------------------------------------------

export function SettingsView() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // controlled tab: sections keep their unsaved edits while hidden
  const [tab, setTab] = useState("brand");

  const { onApiError } = useAdmin();
  const loadStable = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ settings: Settings }>("api/settings", { admin: true });
      setSettings(res.settings);
    } catch (err) {
      if (onApiError(err)) return;
      setError(err instanceof Error ? err.message : "Could not load settings.");
    } finally {
      setLoading(false);
    }
  }, [onApiError]);

  useEffect(() => {
    void loadStable();
  }, [loadStable]);

  if (loading) {
    return (
      <div>
        <PageHead title="Settings" desc="Everything editable on the public site." />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-xl" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="space-y-4">
        <ErrorNote message={error ?? "Settings unavailable."} />
        <Button variant="outline" onClick={() => void loadStable()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHead title="Settings" desc="Everything editable on the public site — saved per section." />
      {/* forceMount keeps every section mounted so switching tabs never
          throws away unsaved edits in another tab */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-5 h-auto w-full flex-wrap justify-start gap-1 bg-ink/5 p-1">
          <TabsTrigger value="brand">Brand</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="home">Home</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="brand" forceMount className={tab === "brand" ? undefined : "hidden"}>
          <BrandSection value={settings.brand} onSaved={setSettings} />
        </TabsContent>
        <TabsContent value="contact" forceMount className={tab === "contact" ? undefined : "hidden"}>
          <ContactSection value={settings.contact} onSaved={setSettings} />
        </TabsContent>
        <TabsContent value="social" forceMount className={tab === "social" ? undefined : "hidden"}>
          <SocialSection value={settings.social} onSaved={setSettings} />
        </TabsContent>
        <TabsContent value="seo" forceMount className={tab === "seo" ? undefined : "hidden"}>
          <SeoSection value={settings.seo} onSaved={setSettings} />
        </TabsContent>
        <TabsContent value="home" forceMount className={tab === "home" ? undefined : "hidden"}>
          <HomeSection value={settings.home} onSaved={setSettings} />
        </TabsContent>
        <TabsContent value="about" forceMount className={tab === "about" ? undefined : "hidden"}>
          <AboutSection value={settings.about} onSaved={setSettings} />
        </TabsContent>
        <TabsContent value="footer" forceMount className={tab === "footer" ? undefined : "hidden"}>
          <FooterSection value={settings.footer} onSaved={setSettings} />
        </TabsContent>
        <TabsContent value="pages" forceMount className={tab === "pages" ? undefined : "hidden"}>
          <PagesSection value={settings.pages} onSaved={setSettings} />
        </TabsContent>
        <TabsContent value="account" forceMount className={tab === "account" ? undefined : "hidden"}>
          <AccountSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ shared */
/** Form state that re-seeds whenever the server value identity changes.
 *  Uses the documented "adjust state during render" pattern (no effect). */
function useSyncedForm<T>(value: T) {
  const [form, setForm] = useState<T>(value);
  const [seed, setSeed] = useState<T>(value);
  if (seed !== value) {
    setSeed(value);
    setForm(value);
  }
  return [form, setForm] as const;
}

function useSectionSaver<K extends keyof Settings>(section: K, onSaved: (s: Settings) => void) {
  const { onApiError } = useAdmin();
  const [saving, setSaving] = useState(false);

  async function save(data: Settings[K]) {
    setSaving(true);
    try {
      const res = await api<{ settings: Settings }>("api/settings", {
        method: "PUT",
        body: { section, data },
        admin: true,
      });
      onSaved(res.settings);
      toast.success("Settings saved");
    } catch (err) {
      onApiError(err);
    } finally {
      setSaving(false);
    }
  }

  return { saving, save };
}

function SecCard({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <AdminCard>
      <CardHead title={title} desc={desc} />
      <div className="space-y-4 p-5">{children}</div>
    </AdminCard>
  );
}

function SaveBar({
  onSave,
  saving,
  dirty,
}: {
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-3">
      {!dirty ? <span className="text-xs text-graphite">No changes yet</span> : <span className="text-xs font-medium text-ink">Unsaved changes</span>}
      <Button className="h-10 bg-ink text-ivory hover:bg-ink/85" disabled={saving || !dirty} onClick={onSave}>
        {saving ? <Spin /> : null} Save changes
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------- brand */
function BrandSection({ value, onSaved }: { value: Settings["brand"]; onSaved: (s: Settings) => void }) {
  const [form, setForm] = useSyncedForm(value);
  const { saving, save } = useSectionSaver("brand", onSaved);
  const dirty = JSON.stringify(form) !== JSON.stringify(value);

  return (
    <div className="space-y-4">
      <SecCard title="Brand" desc="Studio name and tagline used across the site.">
        <Field label="Studio name" htmlFor="brand-name">
          <Input id="brand-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="Tagline" htmlFor="brand-tagline" hint="Shown beside the logo and in meta descriptions.">
          <Input id="brand-tagline" value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} />
        </Field>
      </SecCard>
      <SaveBar onSave={() => void save(form)} saving={saving} dirty={dirty} />
    </div>
  );
}

/* ----------------------------------------------------------------- contact */
function ContactSection({ value, onSaved }: { value: Settings["contact"]; onSaved: (s: Settings) => void }) {
  const [form, setForm] = useSyncedForm(value);
  const { saving, save } = useSectionSaver("contact", onSaved);
  const dirty = JSON.stringify(form) !== JSON.stringify(value);

  return (
    <div className="space-y-4">
      <SecCard title="Contact" desc="How clients reach you — used in the nav, footer and contact page.">
        <Field label="Email" htmlFor="c-email">
          <Input id="c-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp number" htmlFor="c-wa" hint="Digits only, international format — e.g. 919876543210.">
            <Input id="c-wa" inputMode="numeric" value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value.replace(/[^\d]/g, "") }))} />
          </Field>
          <Field label="Phone" htmlFor="c-phone">
            <Input id="c-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location" htmlFor="c-location">
            <Input id="c-location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </Field>
          <Field label="Service area" htmlFor="c-area">
            <Input id="c-area" value={form.serviceArea} onChange={(e) => setForm((f) => ({ ...f, serviceArea: e.target.value }))} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Working hours" htmlFor="c-hours">
            <Input id="c-hours" value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))} />
          </Field>
          <Field label="Response time" htmlFor="c-response">
            <Input id="c-response" value={form.responseTime} onChange={(e) => setForm((f) => ({ ...f, responseTime: e.target.value }))} />
          </Field>
        </div>
      </SecCard>
      <SaveBar onSave={() => void save(form)} saving={saving} dirty={dirty} />
    </div>
  );
}

/* ------------------------------------------------------------------ social */
function SocialSection({ value, onSaved }: { value: Settings["social"]; onSaved: (s: Settings) => void }) {
  const [form, setForm] = useSyncedForm(value);
  const { saving, save } = useSectionSaver("social", onSaved);
  const dirty = JSON.stringify(form) !== JSON.stringify(value);

  const rows: { key: keyof Settings["social"]; label: string; placeholder: string }[] = [
    { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/…" },
    { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/…" },
    { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@…" },
    { key: "x", label: "X (Twitter)", placeholder: "https://x.com/…" },
    { key: "behance", label: "Behance", placeholder: "https://behance.net/…" },
  ];

  return (
    <div className="space-y-4">
      <SecCard title="Social profiles" desc="Leave empty to hide the icon on the public site.">
        {rows.map((r) => (
          <Field key={r.key} label={r.label} htmlFor={`soc-${r.key}`}>
            <Input
              id={`soc-${r.key}`}
              value={form[r.key]}
              placeholder={r.placeholder}
              onChange={(e) => setForm((f) => ({ ...f, [r.key]: e.target.value }))}
            />
          </Field>
        ))}
      </SecCard>
      <SaveBar onSave={() => void save(form)} saving={saving} dirty={dirty} />
    </div>
  );
}

/* --------------------------------------------------------------------- seo */
function SeoSection({ value, onSaved }: { value: Settings["seo"]; onSaved: (s: Settings) => void }) {
  const [form, setForm] = useSyncedForm(value);
  const { saving, save } = useSectionSaver("seo", onSaved);
  const dirty = JSON.stringify(form) !== JSON.stringify(value);

  const keywords = form.keywords.split(",").map((k) => k.trim()).filter(Boolean);
  const checks: { label: string; ok: boolean; hint: string }[] = [
    {
      label: "Meta title length (30–60 chars)",
      ok: form.title.trim().length >= 30 && form.title.trim().length <= 60,
      hint: `${form.title.trim().length} characters now`,
    },
    {
      label: "Meta description length (70–160 chars)",
      ok: form.description.trim().length >= 70 && form.description.trim().length <= 160,
      hint: `${form.description.trim().length} characters now`,
    },
    {
      label: "Site URL set (canonical, sitemap & robots)",
      ok: /^https?:\/\/[^\s]+\.[^\s]+/i.test(form.siteUrl.trim()) || /^[^\s]+\.[^\s]+/i.test(form.siteUrl.trim()),
      hint: form.siteUrl.trim() ? form.siteUrl.trim() : "Add your live address, e.g. https://nexorastudio.in",
    },
    {
      label: "Social share image (OG image)",
      ok: form.ogImage.trim().length > 0,
      hint: form.ogImage.trim() ? "Image ready for WhatsApp / X / Facebook previews" : "Pick an image — used when your link is shared",
    },
    {
      label: "Google Search Console verification",
      ok: form.googleSiteVerification.trim().length > 0,
      hint: form.googleSiteVerification.trim() ? "Site ownership can be verified" : "Paste the verification code from Search Console",
    },
    {
      label: "At least 5 keywords",
      ok: keywords.length >= 5,
      hint: `${keywords.length} keyword${keywords.length === 1 ? "" : "s"} now`,
    },
  ];

  return (
    <div className="space-y-4">
      <SecCard title="Search appearance" desc="Title, description and keywords shown on Google.">
        <Field label="Meta title" htmlFor="seo-title" hint="Shown as the blue headline on Google — keep the brand near the end.">
          <Input id="seo-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </Field>
        <Field label="Meta description" htmlFor="seo-desc" hint="Aim for 150–160 characters.">
          <CountedTextarea id="seo-desc" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} max={320} rows={3} />
        </Field>
        <Field label="Keywords" htmlFor="seo-kw" hint="Comma-separated search terms.">
          <Textarea id="seo-kw" rows={2} value={form.keywords} onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))} />
        </Field>
      </SecCard>

      <SecCard title="Technical SEO" desc="Canonical address, social sharing and Google Search Console.">
        <Field
          label="Site URL"
          htmlFor="seo-url"
          hint="Canonical address once the site is live — drives canonical link, sitemap.xml and robots.txt. e.g. https://nexorastudio.in"
        >
          <Input id="seo-url" value={form.siteUrl} onChange={(e) => setForm((f) => ({ ...f, siteUrl: e.target.value }))} placeholder="https://nexorastudio.in" />
        </Field>
        <MediaField
          label="Social share image (OG image)"
          value={form.ogImage}
          onChange={(v) => setForm((f) => ({ ...f, ogImage: v }))}
          id="seo-og"
          hint="Shown when your link is shared on WhatsApp, X, LinkedIn or Facebook. 1200×630 works best."
        />
        <Field
          label="Google site verification"
          htmlFor="seo-gsc"
          hint="In Google Search Console choose 'HTML tag' and paste only the content value, e.g. google-site-verification=abc123 → paste abc123."
        >
          <Input id="seo-gsc" value={form.googleSiteVerification} onChange={(e) => setForm((f) => ({ ...f, googleSiteVerification: e.target.value }))} placeholder="e.g. 4Xk2…" />
        </Field>
      </SecCard>

      <SecCard title="SEO health" desc="Live checks based on the values above — aim for all green before launch.">
        <ul className="space-y-2">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-2.5 text-sm">
              {c.ok ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
              ) : (
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />
              )}
              <span>
                <span className={c.ok ? "font-medium text-ink" : "font-medium text-graphite"}>{c.label}</span>
                <span className="block text-xs text-graphite">{c.hint}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="rounded-lg bg-ink/5 px-3 py-2 text-xs leading-relaxed text-graphite">
          After launch: submit <span className="font-mono">/sitemap.xml</span> in Google Search Console (paste the
          verification code above first), then request indexing of your home page. Sitemap and robots.txt update
          automatically from the Site URL.
        </p>
      </SecCard>

      <SaveBar onSave={() => void save(form)} saving={saving} dirty={dirty} />
    </div>
  );
}

/* -------------------------------------------------------------------- home */
function HomeSection({ value, onSaved }: { value: Settings["home"]; onSaved: (s: Settings) => void }) {
  const [form, setForm] = useSyncedForm(value);
  const { saving, save } = useSectionSaver("home", onSaved);
  const dirty = JSON.stringify(form) !== JSON.stringify(value);

  const set = <K extends keyof Settings["home"]>(key: K, v: Settings["home"][K]) => setForm((f) => ({ ...f, [key]: v }));

  return (
    <div className="space-y-4">
      <SecCard title="Hero" desc="The first screen visitors see.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kicker" htmlFor="h-kicker">
            <Input id="h-kicker" value={form.heroKicker} onChange={(e) => set("heroKicker", e.target.value)} />
          </Field>
          <Field label="Meta line" htmlFor="h-meta" hint="Small line under the hero, e.g. services list.">
            <Input id="h-meta" value={form.heroMeta} onChange={(e) => set("heroMeta", e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title — line 1" htmlFor="h-t1">
            <Input id="h-t1" value={form.heroTitleLine1} onChange={(e) => set("heroTitleLine1", e.target.value)} />
          </Field>
          <Field label="Title — line 2" htmlFor="h-t2">
            <Input id="h-t2" value={form.heroTitleLine2} onChange={(e) => set("heroTitleLine2", e.target.value)} />
          </Field>
        </div>
        <Field label="Title — accent words" htmlFor="h-accent" hint="Highlighted words rendered inside line 2.">
          <Input id="h-accent" value={form.heroTitleAccent} onChange={(e) => set("heroTitleAccent", e.target.value)} />
        </Field>
        <Field label="Subtitle" htmlFor="h-sub">
          <Textarea id="h-sub" rows={3} value={form.heroSubtitle} onChange={(e) => set("heroSubtitle", e.target.value)} />
        </Field>
        <MediaField label="Hero media — main" value={form.heroMediaMain} onChange={(v) => set("heroMediaMain", v)} id="h-media-main" />
        <MediaField label="Hero media — secondary" value={form.heroMediaSecondary} onChange={(v) => set("heroMediaSecondary", v)} id="h-media-2" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Primary CTA label" htmlFor="h-cta1">
            <Input id="h-cta1" value={form.ctaPrimary} onChange={(e) => set("ctaPrimary", e.target.value)} />
          </Field>
          <Field label="Secondary CTA label" htmlFor="h-cta2">
            <Input id="h-cta2" value={form.ctaSecondary} onChange={(e) => set("ctaSecondary", e.target.value)} />
          </Field>
        </div>
      </SecCard>

      <SecCard title="Marquee" desc="Scrolling strip of skills/keywords.">
        <StringListField label="Marquee items" items={form.marquee} onChange={(v) => set("marquee", v)} placeholder="e.g. Web Design" addLabel="Add item" />
      </SecCard>

      <SecCard title="Intro section">
        <Field label="Kicker" htmlFor="h-ik">
          <Input id="h-ik" value={form.introKicker} onChange={(e) => set("introKicker", e.target.value)} />
        </Field>
        <Field label="Title" htmlFor="h-it">
          <Input id="h-it" value={form.introTitle} onChange={(e) => set("introTitle", e.target.value)} />
        </Field>
        <Field label="Body" htmlFor="h-ib">
          <Textarea id="h-ib" rows={4} value={form.introBody} onChange={(e) => set("introBody", e.target.value)} />
        </Field>
        <StringListField label="Intro points" items={form.introPoints} onChange={(v) => set("introPoints", v)} placeholder="e.g. Direct collaboration with the maker" addLabel="Add point" />
      </SecCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SecCard title="Web section">
          <Field label="Kicker" htmlFor="h-wk">
            <Input id="h-wk" value={form.webKicker} onChange={(e) => set("webKicker", e.target.value)} />
          </Field>
          <Field label="Title" htmlFor="h-wt">
            <Input id="h-wt" value={form.webTitle} onChange={(e) => set("webTitle", e.target.value)} />
          </Field>
          <Field label="Body" htmlFor="h-wb">
            <Textarea id="h-wb" rows={4} value={form.webBody} onChange={(e) => set("webBody", e.target.value)} />
          </Field>
        </SecCard>
        <SecCard title="Video section">
          <Field label="Kicker" htmlFor="h-vk">
            <Input id="h-vk" value={form.videoKicker} onChange={(e) => set("videoKicker", e.target.value)} />
          </Field>
          <Field label="Title" htmlFor="h-vt">
            <Input id="h-vt" value={form.videoTitle} onChange={(e) => set("videoTitle", e.target.value)} />
          </Field>
          <Field label="Body" htmlFor="h-vb">
            <Textarea id="h-vb" rows={4} value={form.videoBody} onChange={(e) => set("videoBody", e.target.value)} />
          </Field>
        </SecCard>
      </div>

      <SecCard title="Launch bundle">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kicker" htmlFor="h-pk">
            <Input id="h-pk" value={form.packageKicker} onChange={(e) => set("packageKicker", e.target.value)} />
          </Field>
          <Field label="Price label" htmlFor="h-pp">
            <Input id="h-pp" value={form.packagePrice} onChange={(e) => set("packagePrice", e.target.value)} placeholder="from ₹19,999" />
          </Field>
        </div>
        <Field label="Title" htmlFor="h-pt">
          <Input id="h-pt" value={form.packageTitle} onChange={(e) => set("packageTitle", e.target.value)} />
        </Field>
        <Field label="Body" htmlFor="h-pb">
          <Textarea id="h-pb" rows={3} value={form.packageBody} onChange={(e) => set("packageBody", e.target.value)} />
        </Field>
        <StringListField label="Bundle features" items={form.packageFeatures} onChange={(v) => set("packageFeatures", v)} placeholder="e.g. Multi-page website" addLabel="Add feature" />
        <Field label="Bundle CTA label" htmlFor="h-pc">
          <Input id="h-pc" value={form.packageCta} onChange={(e) => set("packageCta", e.target.value)} />
        </Field>
      </SecCard>

      <SecCard title="Process">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kicker" htmlFor="h-prk">
            <Input id="h-prk" value={form.processKicker} onChange={(e) => set("processKicker", e.target.value)} />
          </Field>
          <Field label="Title" htmlFor="h-prt">
            <Input id="h-prt" value={form.processTitle} onChange={(e) => set("processTitle", e.target.value)} />
          </Field>
        </div>
        <ProcessStepsField items={form.processSteps as ProcessStep[]} onChange={(v) => set("processSteps", v)} />
      </SecCard>

      <SecCard title="Stats strip">
        <StatsField items={form.stats as StatRow[]} onChange={(v) => set("stats", v)} />
      </SecCard>

      <SecCard title="Closing CTA">
        <Field label="Title" htmlFor="h-ct">
          <Input id="h-ct" value={form.ctaTitle} onChange={(e) => set("ctaTitle", e.target.value)} />
        </Field>
        <Field label="Body" htmlFor="h-cb">
          <Textarea id="h-cb" rows={3} value={form.ctaBody} onChange={(e) => set("ctaBody", e.target.value)} />
        </Field>
        <Field label="Button label" htmlFor="h-cbtn">
          <Input id="h-cbtn" value={form.ctaButton} onChange={(e) => set("ctaButton", e.target.value)} />
        </Field>
      </SecCard>

      <SaveBar onSave={() => void save(form)} saving={saving} dirty={dirty} />
    </div>
  );
}

/* ------------------------------------------------------------------- about */
function AboutSection({ value, onSaved }: { value: Settings["about"]; onSaved: (s: Settings) => void }) {
  const [form, setForm] = useSyncedForm(value);
  const { saving, save } = useSectionSaver("about", onSaved);
  const dirty = JSON.stringify(form) !== JSON.stringify(value);

  const set = <K extends keyof Settings["about"]>(key: K, v: Settings["about"][K]) => setForm((f) => ({ ...f, [key]: v }));

  return (
    <div className="space-y-4">
      <SecCard title="Owner" desc="The human behind the studio.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="a-name">
            <Input id="a-name" value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} />
          </Field>
          <Field label="Role" htmlFor="a-role">
            <Input id="a-role" value={form.role} onChange={(e) => set("role", e.target.value)} />
          </Field>
        </div>
        <MediaField label="Portrait" value={form.portraitUrl} onChange={(v) => set("portraitUrl", v)} hint="Square or 4:5 works best." />
        <Field label="Bio" htmlFor="a-bio" hint="Blank line = new paragraph on the public page.">
          <Textarea id="a-bio" rows={9} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
        </Field>
      </SecCard>

      <SecCard title="Approach & philosophy">
        <Field label="Approach" htmlFor="a-approach">
          <Textarea id="a-approach" rows={4} value={form.approach} onChange={(e) => set("approach", e.target.value)} />
        </Field>
        <Field label="Philosophy" htmlFor="a-phil">
          <Textarea id="a-phil" rows={4} value={form.philosophy} onChange={(e) => set("philosophy", e.target.value)} />
        </Field>
      </SecCard>

      <SecCard title="Skills & tools">
        <StringListField label="Skills" items={form.skills} onChange={(v) => set("skills", v)} placeholder="e.g. React & Next.js" addLabel="Add skill" />
        <StringListField label="Tools" items={form.tools} onChange={(v) => set("tools", v)} placeholder="e.g. Figma" addLabel="Add tool" />
      </SecCard>

      <SaveBar onSave={() => void save(form)} saving={saving} dirty={dirty} />
    </div>
  );
}

/* ------------------------------------------------------------------ footer */
function FooterSection({ value, onSaved }: { value: Settings["footer"]; onSaved: (s: Settings) => void }) {
  const [form, setForm] = useSyncedForm(value);
  const { saving, save } = useSectionSaver("footer", onSaved);
  const dirty = JSON.stringify(form) !== JSON.stringify(value);

  return (
    <div className="space-y-4">
      <SecCard title="Footer" desc="Text shown in the site footer.">
        <Field label="Blurb" htmlFor="ft-blurb">
          <Textarea id="ft-blurb" rows={3} value={form.blurb} onChange={(e) => setForm((f) => ({ ...f, blurb: e.target.value }))} />
        </Field>
        <Field label="Copyright line" htmlFor="ft-copy">
          <Input id="ft-copy" value={form.copyright} onChange={(e) => setForm((f) => ({ ...f, copyright: e.target.value }))} />
        </Field>
        <Field label="Small note" htmlFor="ft-note" hint="e.g. disclosure about concept/sample work.">
          <Input id="ft-note" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
        </Field>
      </SecCard>
      <SaveBar onSave={() => void save(form)} saving={saving} dirty={dirty} />
    </div>
  );
}

/* ------------------------------------------------------------------- pages */
function PagesSection({ value, onSaved }: { value: Settings["pages"]; onSaved: (s: Settings) => void }) {
  const [form, setForm] = useSyncedForm(value);
  const { saving, save } = useSectionSaver("pages", onSaved);
  const dirty = JSON.stringify(form) !== JSON.stringify(value);

  return (
    <div className="space-y-4">
      <SecCard title="Privacy policy" desc="Full text of the /privacy page.">
        <Textarea aria-label="Privacy policy text" rows={14} className="min-h-[280px]" value={form.privacy} onChange={(e) => setForm((f) => ({ ...f, privacy: e.target.value }))} />
      </SecCard>
      <SecCard title="Terms of service" desc="Full text of the /terms page.">
        <Textarea aria-label="Terms of service text" rows={14} className="min-h-[280px]" value={form.terms} onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))} />
      </SecCard>
      <SecCard title="404 message" desc="Shown when a page doesn't exist.">
        <Input aria-label="404 message" value={form.notFound} onChange={(e) => setForm((f) => ({ ...f, notFound: e.target.value }))} />
      </SecCard>
      <SaveBar onSave={() => void save(form)} saving={saving} dirty={dirty} />
    </div>
  );
}

/* ----------------------------------------------------------------- account */
function AccountSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!current) return setError("Enter your current password.");
    if (!PASSWORD_RE.test(next))
      return setError("New password needs at least 8 characters, including a letter and a number.");
    if (next !== confirm) return setError("New password and confirmation don't match.");
    setSaving(true);
    try {
      await api("api/auth", { body: { action: "password", currentPassword: current, newPassword: next }, admin: true });
      toast.success("Password updated");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <AdminCard>
        <CardHead title="Change password" desc="Use at least 8 characters with a letter and a number." />
        <form onSubmit={(e) => void submit(e)} className="space-y-4 p-5" noValidate>
          <Field label="Current password" htmlFor="acc-current">
            <Input id="acc-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
          <Field label="New password" htmlFor="acc-next">
            <Input id="acc-next" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <Field label="Confirm new password" htmlFor="acc-confirm">
            <Input id="acc-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          {error ? (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="h-10 bg-ink text-ivory hover:bg-ink/85" disabled={saving}>
            {saving ? <Spin /> : null} Update password
          </Button>
        </form>
      </AdminCard>
    </div>
  );
}
