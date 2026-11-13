import { projects } from "@/data/projects";
import { site } from "@/data/site";

export const dynamic = "force-static";

function buildLlmsTxt() {
  const inDevelopment = projects.filter((project) => project.status === "In development").map((p) => p.title);
  const developmentNote = inDevelopment.length
    ? ` ${inDevelopment.join(" and ")} ${inDevelopment.length === 1 ? "is" : "are"} still pre-launch.`
    : "";

  const lines = [
    `# ${site.name}`,
    "",
    `> ${site.description}`,
    "",
    `${site.name} is an AI venture studio in India that builds and backs companies in venture software, AI tools, games and consumer skincare. Each page under /work/ covers one venture: a separate company or brand, not another name for ${site.name}.${developmentNote} For up-to-date facts, go to each venture's own website.`,
    "",
    "## Studio",
    "",
    `- [About the studio](${site.url}/#studio): What SPRDLX does and how it builds.`,
    `- [Contact](mailto:${site.contactEmail}): Pitches, partnerships and investment.`,
    "",
    "## Ventures",
    "",
    ...projects.map(
      (project) =>
        `- [${project.title}](${site.url}/work/${project.id}/): ${project.summary} Category: ${project.category}. Status: ${project.status}.${project.url ? ` Website: ${project.url}` : ""}`,
    ),
    "",
    "## Optional",
    "",
    `- [Home page](${site.url}/): 3D venture map, plus links to every venture page.`,
    `- [Privacy policy](${site.url}/privacy/): What happens to contact-form messages and hosting logs.`,
    `- [Sitemap](${site.url}/sitemap.xml): Every canonical page.`,
    "",
  ];

  return lines.join("\n");
}

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
