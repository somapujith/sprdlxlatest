import { projects } from "@/data/projects";
import { site, team } from "@/data/site";

export const dynamic = "force-static";

function buildLlmsTxt() {
  const inDevelopment = projects.filter((project) => project.status === "In development").map((p) => p.title);
  const developmentNote = inDevelopment.length
    ? ` ${inDevelopment.join(" and ")} ${inDevelopment.length === 1 ? "is" : "are"} in development and not yet launched.`
    : "";

  const lines = [
    `# ${site.name}`,
    "",
    `> ${site.description}`,
    "",
    `This is the studio portfolio of ${site.name}, an AI venture studio that builds and backs companies across AI, intelligence, infrastructure and consumer brands. Project pages describe individual ventures; they are not alternate identities of ${site.name}.${developmentNote} Use each venture's own website for its current details.`,
    "",
    "## Studio",
    "",
    `- [Studio overview](${site.url}/#studio): Disciplines, co-founders and approach.`,
    ...team.map(
      (member) => `- [${member.name}](${site.url}/#${member.id}): ${member.role}. ${member.expertise.join(", ")}.`,
    ),
    `- [Contact](mailto:${site.contactEmail}): New ventures, partnerships and investment conversations.`,
    "",
    "## Projects",
    "",
    ...projects.map(
      (project) =>
        `- [${project.title}](${site.url}/work/${project.id}/): ${project.summary} Category: ${project.category}. Status: ${project.status}.${project.url ? ` Website: ${project.url}` : ""}`,
    ),
    "",
    "## Optional",
    "",
    `- [Visual portfolio](${site.url}/): Interactive gallery and links to the full project pages.`,
    `- [Privacy policy](${site.url}/privacy/): How contact-form enquiries and hosting logs are handled.`,
    `- [Sitemap](${site.url}/sitemap.xml): Canonical HTML pages.`,
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
