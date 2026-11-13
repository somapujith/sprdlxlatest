import { absoluteUrl, site } from "@/data/site";

export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: new URL(site.url).host,
  };
}
