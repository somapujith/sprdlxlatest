import { ConnectedEarthSection } from "@/components/ConnectedEarthSection";
import { ExperienceShell } from "@/components/ExperienceShell";
import { Icon } from "@/components/Icon";
import { ProjectMark, ProjectStatus } from "@/components/ProjectBits";
import { projects } from "@/data/projects";
import { site, team } from "@/data/site";

const pad = (value) => String(value).padStart(2, "0");

const disciplines = [
  { title: "Ventures", text: "The opportunity, the market, the founding team." },
  { title: "Design", text: "A clear identity. An intuitive experience." },
  { title: "Technology & AI", text: "Products and AI systems made for real use." },
];

const approach = [
  {
    label: "Discover",
    title: "Find the problem worth solving.",
    text: "Start with people, markets and data before deciding what to build.",
    diagram: (
      <svg className="approach-diagram" viewBox="0 0 280 120" fill="none" aria-hidden="true" focusable="false">
        <path d="M25 25 140 60 25 95M65 12 140 60 65 108M15 60h225" className="diagram-line"></path>
        <circle cx="25" cy="25" r="4" className="diagram-node"></circle>
        <circle cx="65" cy="12" r="4" className="diagram-node"></circle>
        <circle cx="15" cy="60" r="4" className="diagram-node"></circle>
        <circle cx="25" cy="95" r="4" className="diagram-node"></circle>
        <circle cx="65" cy="108" r="4" className="diagram-node"></circle>
        <circle cx="140" cy="60" r="24" className="diagram-ring"></circle>
        <circle cx="140" cy="60" r="5" className="diagram-signal"></circle>
        <path d="m229 53 11 7-11 7" className="diagram-line"></path>
        <circle cx="257" cy="60" r="8" className="diagram-signal"></circle>
      </svg>
    ),
  },
  {
    label: "Build",
    title: "Make the complex feel simple.",
    text: "Give every venture a clear purpose, a considered identity and AI that quietly does the heavy lifting.",
    diagram: (
      <svg className="approach-diagram" viewBox="0 0 280 120" fill="none" aria-hidden="true" focusable="false">
        <rect x="35" y="22" width="48" height="38" rx="4" className="diagram-ring"></rect>
        <rect x="60" y="65" width="33" height="28" rx="4" className="diagram-ring"></rect>
        <path d="M112 60h39m-9-7 9 7-9 7" className="diagram-line"></path>
        <rect x="178" y="20" width="68" height="80" rx="6" className="diagram-ring"></rect>
        <path d="M190 38h44M190 48h28M190 81h44" className="diagram-line"></path>
        <rect x="190" y="61" width="44" height="8" rx="2" className="diagram-signal"></rect>
      </svg>
    ),
  },
  {
    label: "Scale",
    title: "Keep compounding.",
    text: "Learn from real use, back what works and give good companies room to grow.",
    diagram: (
      <svg className="approach-diagram" viewBox="0 0 280 120" fill="none" aria-hidden="true" focusable="false">
        <path
          d="M97 36a49 49 0 0 1 86 4m-1-19 3 20-20-2M183 84a49 49 0 0 1-86-4m1 19-3-20 20 2"
          className="diagram-ring"
        ></path>
        <circle cx="140" cy="60" r="8" className="diagram-signal"></circle>
        <path d="M27 60h53m120 0h53" className="diagram-line"></path>
        <circle cx="27" cy="60" r="4" className="diagram-node"></circle>
        <circle cx="253" cy="60" r="4" className="diagram-node"></circle>
      </svg>
    ),
  },
];

function initialsOf(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Founder({ member }) {
  const nameId = `${member.id}-name`;
  return (
    <article className="founder" id={member.id} aria-labelledby={nameId}>
      {member.portrait ? (
        <div className="founder-portrait">
          <img
            src={member.portrait}
            width="768"
            height="576"
            alt={`Portrait of ${member.name}`}
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : (
        <div className="founder-portrait is-placeholder">
          <span className="founder-initials" aria-hidden="true">
            {initialsOf(member.name)}
          </span>
        </div>
      )}
      <div className="founder-heading">
        <h4 id={nameId}>{member.name}</h4>
        <p>{member.role}</p>
      </div>
      <ul className="founder-expertise" aria-label={`${member.name}’s expertise`}>
        {member.expertise.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="founder-biography">
        {member.biography.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      {member.links?.length ? (
        <div className="founder-links">
          {member.links.map((link) => (
            <a
              key={link.href + link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${member.name} on ${link.label} (opens in a new tab)`}
            >
              {link.label} <Icon />
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}

const portfolio = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": `${site.url}/#portfolio`,
  url: `${site.url}/`,
  name: site.title,
  description: site.description,
  isPartOf: { "@id": `${site.url}/#website` },
  mainEntity: {
    "@type": "ItemList",
    itemListElement: projects.map((project, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: project.title,
      url: `${site.url}/work/${project.id}/`,
    })),
  },
};

export default function HomePage() {
  const total = pad(projects.length);
  const year = new Date().getFullYear();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(portfolio).replace(/</g, "\\u003c") }}
      />
      <ExperienceShell contactEmail={site.contactEmail}>
        <div className="editorial-content">
          <ConnectedEarthSection />

          <section id="projects" className="work-index section-space" aria-labelledby="work-heading">
            <div className="section-topline">
              <span className="eyebrow">A CONSTELLATION OF IDEAS</span>
              <span className="eyebrow">01 — {total}</span>
            </div>
            <div className="section-heading">
              <h2 id="work-heading" tabIndex={-1}>
                Built with intention.
              </h2>
              <p>
                AI products, intelligence platforms,
                <br />
                and brands with a point of view.
              </p>
            </div>
            <div className="project-list">
              {projects.map((project, index) => (
                <a
                  key={project.id}
                  className="project-row"
                  href={`/work/${project.id}/`}
                  data-project={project.id}
                  style={{ "--project-accent": project.accent }}
                >
                  <span className="project-number">{pad(index + 1)}</span>
                  <div className="row-identity">
                    <ProjectMark project={project} />
                    <h3>{project.title}</h3>
                  </div>
                  <span className="row-category">{project.category}</span>
                  <span className="row-status">
                    <ProjectStatus status={project.status} />
                  </span>
                  <span className="row-arrow" aria-hidden="true">
                    <Icon />
                  </span>
                </a>
              ))}
            </div>
          </section>

          <section id="studio" className="studio-section section-space" aria-labelledby="studio-heading">
            <div className="section-topline">
              <span className="eyebrow">SPRDLX / THE STUDIO</span>
              <span className="eyebrow">02</span>
            </div>
            <div className="studio-introduction">
              <h2 id="studio-heading">
                From possibility
                <br />
                to a working company.
              </h2>
              <div className="studio-summary">
                <p>
                  We build ideas into AI products, brands and independent companies, then back the ones worth
                  scaling. Strategy, design, technology and capital come together in one studio.
                </p>
                <a className="text-link" href="#team-heading">
                  Meet the co-founders <Icon />
                </a>
              </div>
            </div>
            <div className="studio-disciplines">
              {disciplines.map((discipline, index) => (
                <div key={discipline.title}>
                  <span className="discipline-number">{pad(index + 1)}</span>
                  <h3>{discipline.title}</h3>
                  <p>{discipline.text}</p>
                </div>
              ))}
            </div>
            <div className="studio-signature">
              <span>Independent companies. Shared foundations.</span>
              <span>{total} ventures. One studio.</span>
            </div>

            <section className="team-section" aria-labelledby="team-heading">
              <div className="team-introduction">
                <div>
                  <p className="eyebrow">THE PEOPLE BEHIND SPRDLX</p>
                  <h3 id="team-heading">
                    Different expertise.
                    <br />
                    Shared ambition.
                  </h3>
                </div>
                <p>
                  Venture building and brand strategy meet product engineering and applied AI. We bring both
                  perspectives to every company we build.
                </p>
              </div>
              <div className="team-grid">
                {team.map((member) => (
                  <Founder key={member.id} member={member} />
                ))}
              </div>
            </section>
          </section>

          <section id="about" className="about-section section-space" aria-labelledby="about-heading">
            <div className="section-topline">
              <span className="eyebrow">OUR APPROACH</span>
              <span className="eyebrow">03</span>
            </div>
            <div className="about-layout">
              <h2 id="about-heading">
                Different ideas.
                <br />
                <span>The same care.</span>
              </h2>
              <p className="about-lead">
                From intelligence platforms and AI tools to skincare brands, we work across categories. Each
                venture starts with a specific need and its own point of view.
              </p>
            </div>
            <div className="approach-steps">
              {approach.map((step, index) => (
                <article className="approach-step" key={step.label}>
                  <div className="approach-step-top">
                    <span className="approach-number">{pad(index + 1)}</span>
                    <span>{step.label}</span>
                  </div>
                  {step.diagram}
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </section>

          <footer id="contact" className="contact-section section-space" aria-labelledby="contact-heading">
            <div className="section-topline">
              <span className="eyebrow">START A CONVERSATION</span>
              <span className="eyebrow">04</span>
            </div>
            <div className="contact-invitation">
              <h2 id="contact-heading">
                Let’s build
                <br />
                <span>what comes next.</span>
              </h2>
              <div className="contact-note">
                <p>
                  A new venture, an AI product or an idea
                  <br />
                  you can’t stop thinking about.
                </p>
                <p>We’d like to hear it.</p>
              </div>
            </div>
            <a className="contact-email" data-contact="true" href={`mailto:${site.contactEmail}`} aria-haspopup="dialog">
              <span>{site.contactEmail}</span>
              <span className="contact-arrow" aria-hidden="true">
                <Icon />
              </span>
            </a>
            <div className="footer-line">
              <a className="studio-logo footer-logo" href="/" aria-label={`${site.name}, home`}>
                <img src={site.logo} alt="" width="873" height="774" loading="lazy" decoding="async" />
              </a>
              <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
              <span>
                © {year} {site.name}
              </span>
              <a className="inline-icon-link" href="#top">
                Back to top <Icon name="arrow-up" />
              </a>
            </div>
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
        </div>
      </ExperienceShell>
    </>
  );
}
