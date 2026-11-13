import { projects } from "@/data/projects";
import { absoluteUrl, site } from "@/data/site";

// Generated at build time, so lastModified reflects the latest deploy.
const lastModified = new Date();

export default function sitemap() {
  return [
    {
      url: absoluteUrl("/"),
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
      images: [absoluteUrl(site.ogImage.url), ...projects.filter((p) => p.logo).map((p) => absoluteUrl(p.logo))],
    },
    ...projects.map((project) => ({
      url: absoluteUrl(`/work/${project.id}/`),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
      ...(project.logo ? { images: [absoluteUrl(project.logo)] } : {}),
    })),
    { url: absoluteUrl("/privacy/"), lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
