import { site } from "@/data/site";

export default function manifest() {
  return {
    name: `${site.name} — AI Venture Studio`,
    short_name: site.name,
    description: site.metaDescription,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b0d10",
    theme_color: "#0b0d10",
    lang: site.language,
    categories: ["business"],
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/media/sprdlx-logo-192.png", sizes: "192x192", type: "image/png" },
      { src: "/media/sprdlx-logo-512.png", sizes: "512x512", type: "image/png" },
      { src: "/media/sprdlx-logo-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
