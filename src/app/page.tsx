import { getPublicContent } from "@/lib/content";
import { SiteShell } from "@/components/site/site-shell";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await getPublicContent();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: data.settings.brand.name,
    description: data.settings.seo.description,
    email: data.settings.contact.email,
    areaServed: "IN",
    address: { "@type": "PostalAddress", addressCountry: "IN" },
    ...(data.settings.seo.siteUrl ? { url: data.settings.seo.siteUrl } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteShell initial={data} />
    </>
  );
}
