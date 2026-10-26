import { getPublicContent } from "@/lib/content";
import { SiteShell } from "@/components/site/site-shell";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Server-rendered JSON-LD (schema.org @graph):
// - ProfessionalService — business identity, contact, social profiles
// - WebSite — ties the site node to the business
// - FAQPage — published FAQs, eligible for rich results
// All values come from admin-managed settings/DB — nothing is fabricated.
// ---------------------------------------------------------------------------

export default async function Page() {
  const data = await getPublicContent();
  const s = data.settings;

  const rawBase = (s.seo.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  const base = rawBase ? (/^https?:\/\//i.test(rawBase) ? rawBase : `https://${rawBase}`).replace(/\/+$/, "") : "";
  const businessId = base ? `${base}/#business` : undefined;
  const ogImage = s.seo.ogImage || s.home.heroMediaMain || "";
  const ogImageAbs = ogImage ? (/^https?:\/\//i.test(ogImage) ? ogImage : base ? `${base}${ogImage}` : "") : "";

  const sameAs = [s.social.instagram, s.social.linkedin, s.social.youtube, s.social.x, s.social.behance].filter(
    (u): u is string => typeof u === "string" && u.startsWith("http")
  );

  const graph: Record<string, unknown>[] = [
    {
      "@type": "ProfessionalService",
      ...(businessId ? { "@id": businessId } : {}),
      name: s.brand.name,
      description: s.seo.description,
      email: s.contact.email,
      address: { "@type": "PostalAddress", addressCountry: "IN" },
      areaServed: "IN",
      ...(ogImageAbs ? { image: ogImageAbs } : {}),
      ...(base ? { url: `${base}/` } : {}),
      ...(sameAs.length > 0 ? { sameAs } : {}),
      ...(s.contact.hours ? { openingHoursSpecification: s.contact.hours } : {}),
      knowsAbout: s.seo.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
        .slice(0, 12),
    },
    {
      "@type": "WebSite",
      ...(base ? { "@id": `${base}/#website`, url: `${base}/` } : {}),
      name: s.brand.name,
      ...(businessId ? { publisher: { "@id": businessId } } : {}),
      inLanguage: "en",
    },
  ];

  if (data.faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: data.faqs.slice(0, 20).map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": graph,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteShell initial={data} />
    </>
  );
}
