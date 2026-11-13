// Shared SEO helpers: per-page metadata (canonical, Open Graph, Twitter) and
// schema.org entities, so every route describes itself the same way.
import { absoluteUrl, site } from "@/data/site";

const shareImage = { ...site.ogImage };

/** Trims to a search-snippet length on a word boundary. */
export function snippet(text, max = 160) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:—–-]+$/, "")}…`;
}

/**
 * Metadata for a route. `title` goes through the layout template
 * ("%s | SPRDLX") unless `absoluteTitle` is set.
 */
export function pageMetadata({ title, absoluteTitle, description, path, type = "website" }) {
  const shareTitle = absoluteTitle ?? `${title} | ${site.name}`;
  const text = snippet(description);
  return {
    title: absoluteTitle ? { absolute: absoluteTitle } : title,
    description: text,
    alternates: { canonical: path },
    openGraph: {
      type,
      url: path,
      siteName: site.name,
      locale: site.locale,
      title: shareTitle,
      description: text,
      images: [shareImage],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: text,
      images: [shareImage],
    },
  };
}

export const ids = {
  organization: absoluteUrl("/#organization"),
  website: absoluteUrl("/#website"),
  logo: absoluteUrl("/#logo"),
};

export function organizationSchema() {
  return {
    "@type": "Organization",
    "@id": ids.organization,
    name: site.name,
    alternateName: site.alternateNames,
    legalName: site.legalName,
    url: absoluteUrl("/"),
    description: site.description,
    email: site.contactEmail,
    logo: {
      "@type": "ImageObject",
      "@id": ids.logo,
      url: absoluteUrl(site.logoRaster.url),
      width: site.logoRaster.width,
      height: site.logoRaster.height,
      caption: site.name,
    },
    image: { "@id": ids.logo },
    address: { "@type": "PostalAddress", addressCountry: "IN" },
    areaServed: "IN",
    knowsAbout: ["Venture building", "Artificial intelligence", "Brand strategy", "Product development", "Startup investing"],
    sameAs: site.socials.map((social) => social.href),
  };
}

export function websiteSchema() {
  return {
    "@type": "WebSite",
    "@id": ids.website,
    name: site.name,
    alternateName: site.alternateNames,
    url: absoluteUrl("/"),
    description: site.metaDescription,
    inLanguage: site.language,
    publisher: { "@id": ids.organization },
  };
}

/** A venture as its real-world type (company, browser extension or game). */
export function ventureSchema(project) {
  const pageUrl = absoluteUrl(`/work/${project.id}/`);
  const base = {
    "@id": `${pageUrl}#venture`,
    name: project.title,
    description: project.description,
    url: project.url ?? pageUrl,
    ...(project.logo ? { logo: absoluteUrl(project.logo), image: absoluteUrl(project.logo) } : {}),
    ...(project.url ? { sameAs: [project.url] } : {}),
    mainEntityOfPage: pageUrl,
  };
  switch (project.schemaType) {
    case "SoftwareApplication":
      return {
        ...base,
        "@type": "SoftwareApplication",
        applicationCategory: "BrowserApplication",
        operatingSystem: "Google Chrome",
        creator: { "@id": ids.organization },
      };
    case "VideoGame":
      return {
        ...base,
        "@type": "VideoGame",
        applicationCategory: "Game",
        gamePlatform: "Web browser",
        creator: { "@id": ids.organization },
      };
    default:
      // Deliberately no ownership claim (parentOrganization): the page context
      // says it is part of the SPRDLX portfolio.
      return { ...base, "@type": "Organization" };
  }
}

/** Serialises JSON-LD safely for an inline <script>. */
export const jsonLd = (data) => ({ __html: JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c") });
