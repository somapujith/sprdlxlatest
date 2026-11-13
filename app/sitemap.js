import { projects } from "@/data/projects";
import { site } from "@/data/site";

export default function sitemap() {
  return [
    { url: `${site.url}/`, changeFrequency: "monthly", priority: 1 },
    ...projects.map((project) => ({
      url: `${site.url}/work/${project.id}/`,
      changeFrequency: "monthly",
      priority: 0.8,
    })),
    { url: `${site.url}/privacy/`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
