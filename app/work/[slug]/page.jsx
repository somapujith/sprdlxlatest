import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { ProjectMark, ProjectStatus } from "@/components/ProjectBits";
import { getProject, hostnameOf, projects } from "@/data/projects";
import { absoluteUrl, site } from "@/data/site";
import { ids, jsonLd, pageMetadata, snippet, ventureSchema } from "@/lib/seo";

export const dynamicParams = false;

const pad = (value) => String(value).padStart(2, "0");

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.id }));
}

/** Summary plus the longest portfolio context that still fits a search snippet. */
function ventureDescription(project) {
  const summary = project.summary.trim();
  const context = [
    ` ${project.title} is part of the ${site.name} portfolio, an AI venture studio in India.`,
    ` ${project.title} is part of the ${site.name} venture portfolio.`,
    ` Part of the ${site.name} portfolio.`,
  ];
  const fit = context.find((tail) => (summary + tail).length <= 160);
  return fit ? summary + fit : snippet(summary);
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return pageMetadata({
    title: `${project.title} — ${project.category}`,
    description: ventureDescription(project),
    path: `/work/${project.id}/`,
    type: "article",
  });
}

function StudioLogo() {
  return (
    <a className="studio-logo " href="/" aria-label={`${site.name}, home`}>
      <img src={site.logo} alt="" width="873" height="774" loading="lazy" decoding="async" />
    </a>
  );
}

export default async function CaseStudyPage({ params }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const index = projects.findIndex((item) => item.id === project.id);
  const number = pad(index + 1);
  const next = projects[(index + 1) % projects.length];
  const pageUrl = absoluteUrl(`/work/${project.id}/`);

  const structuredData = {
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#page`,
        url: pageUrl,
        name: `${project.title} — ${project.category} | ${site.name}`,
        description: ventureDescription(project),
        inLanguage: site.language,
        isPartOf: { "@id": ids.website },
        publisher: { "@id": ids.organization },
        breadcrumb: { "@id": `${pageUrl}#breadcrumbs` },
        mainEntity: { "@id": `${pageUrl}#venture` },
        primaryImageOfPage: project.logo ? { "@type": "ImageObject", url: absoluteUrl(project.logo) } : undefined,
      },
      ventureSchema(project),
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumbs`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: site.name, item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: project.title, item: pageUrl },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(structuredData)}
      />
      <a className="skip-link" href="#case-study">
        Skip to the venture
      </a>
      <header className="detail-header">
        <div className="header-brand">
          <StudioLogo />
        </div>
        <a className="text-link" href="/#projects">
          <Icon name="arrow-left" /> All ventures
        </a>
      </header>

      <main id="case-study" className="standalone-case">
        <article className="project-content case-editorial" style={{ "--project-accent": project.accent }}>
          <div className="case-hero">
            <div className="case-introduction">
              <div className="eyebrow case-kicker">
                <span>{number} / VENTURE FILE</span>
                <ProjectStatus status={project.status} />
              </div>
              <h1 id="project-title">{project.title}</h1>
              <p className="case-category">{project.category}</p>
              <p className="case-description">{project.description}</p>
              {project.url ? (
                <a className="button case-visit" href={project.url} target="_blank" rel="noopener noreferrer">
                  Visit {hostnameOf(project.url)}
                  <Icon />
                </a>
              ) : null}
            </div>
            <div className="case-identity" aria-hidden="true">
              <span className="identity-coordinate">
                {site.name} · {number}
              </span>
              <ProjectMark project={project} />
              <div className="identity-caption">
                <span>{project.title}</span>
                <span>{project.category}</span>
              </div>
            </div>
          </div>

          <dl className="case-facts">
            <div>
              <dt>Sector</dt>
              <dd>{project.category}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <ProjectStatus status={project.status} />
              </dd>
            </div>
            <div>
              <dt>Built by</dt>
              <dd>{site.name}</dd>
            </div>
          </dl>

          <div className="case-chapters">
            <section className="case-chapter">
              <span className="case-chapter-number">01 / THE GAP</span>
              <h2>Why it exists</h2>
              <p>{project.challenge}</p>
            </section>
            <section className="case-chapter">
              <span className="case-chapter-number">02 / THE BUILD</span>
              <h2>What it does</h2>
              <p>{project.built}</p>
            </section>
          </div>
        </article>

        <a className="text-link standalone-back" href="/#projects">
          <Icon name="arrow-left" /> Back to the portfolio
        </a>
        <a className="case-next" href={`/work/${next.id}/`} style={{ "--project-accent": next.accent }}>
          <span className="case-next-copy">
            <span className="eyebrow">NEXT VENTURE</span>
            <span className="case-next-title">{next.title}</span>
          </span>
          <ProjectMark project={next} />
          <Icon name="arrow-right" />
        </a>
      </main>

      <footer className="case-footer">
        <StudioLogo />
        <span>Building something?</span>
        <a className="inline-icon-link" data-contact="true" href={`mailto:${site.contactEmail}`} aria-haspopup="dialog">
          Pitch us <Icon />
        </a>
        <div className="footer-legal">
          <a href="/privacy/">Privacy policy</a>
          <span className="footer-social">
            {site.socials.map((social) => (
              <a key={social.href} href={social.href} target="_blank" rel="noopener noreferrer">
                {social.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ))}
          </span>
        </div>
      </footer>
    </>
  );
}
