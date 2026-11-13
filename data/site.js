// Studio-wide settings. Everything brand-specific lives here or in projects.js.

// Canonical origin. sprdlx.co redirects to www.sprdlx.co, so every canonical,
// sitemap and social URL must use the www host. Override per environment with
// NEXT_PUBLIC_SITE_URL (no trailing slash).
const url = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.sprdlx.co").replace(/\/+$/, "");

export const site = {
  name: "SPRDLX",
  alternateNames: ["Super Deluxe Studios", "SPRDLX Studio"],
  legalName: "Super Deluxe Studios", // TODO: confirm the registered legal entity for the privacy policy
  url,
  locale: "en_IN",
  language: "en-IN",
  // <title> of the home page; inner pages use "<page> | SPRDLX".
  title: "SPRDLX | AI Venture Studio in India — From Spark to Company",
  // Long form, used by llms.txt and structured data.
  description:
    "SPRDLX is an AI venture studio in India that turns early sparks into companies and backs them. The portfolio: Volery, Anthill Ventures, Esthetic Insights, Lipi, Meter Mama, Pulp and Sunday Everyday.",
  // Search-snippet length (≤ 160 characters), used for <meta name="description">.
  metaDescription:
    "SPRDLX is an AI venture studio in India. We build and back companies like Volery, Anthill Ventures, Esthetic Insights, Lipi, Pulp and Sunday Everyday.",
  keywords: ["AI venture studio", "venture studio India", "startup studio", "venture building", "SPRDLX", "Super Deluxe Studios"],
  contactEmail: "hello@sprdlx.co", // TODO: replace with the studio inbox
  logo: "/media/sprdlx-logo.svg",
  // Raster logo for structured data and the web manifest (Google prefers raster logos).
  logoRaster: { url: "/media/sprdlx-logo-512.png", width: 512, height: 512 },
  // Social share card: the white SPRDLX mark on black.
  ogImage: { url: "/media/og-image.png", width: 1200, height: 630, alt: "SPRDLX logo", type: "image/png" },
  socials: [
    { label: "Instagram", href: "https://www.instagram.com/sprdlx.co/" },
    { label: "LinkedIn", href: "https://www.linkedin.com/company/super-deluxe-studios/" },
  ],
};

export const absoluteUrl = (path = "/") => `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
