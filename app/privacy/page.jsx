import { Icon } from "@/components/Icon";
import { site } from "@/data/site";

const title = `Privacy policy — ${site.name}`;
const description = `How ${site.name} handles contact-form enquiries and hosting logs, and the rights you have.`;
const image = {
  url: "/media/og-image.png",
  width: 1200,
  height: 630,
  alt: `${site.title}. An AI venture studio.`,
};

export const metadata = {
  title,
  description,
  alternates: { canonical: "/privacy/" },
  openGraph: {
    type: "website",
    url: "/privacy/",
    siteName: site.name,
    locale: "en_US",
    title,
    description,
    images: [image],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [image],
  },
};

const domain = new URL(site.url).hostname;

function StudioLogo() {
  return (
    <a className="studio-logo " href="/" aria-label={`${site.name}, home`}>
      <img src={site.logo} alt="" width="873" height="774" loading="lazy" decoding="async" />
    </a>
  );
}

function Email() {
  return <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>;
}

export default function PrivacyPage() {
  return (
    <>
      <a className="skip-link" href="#privacy">
        Skip to privacy policy
      </a>
      <header className="detail-header">
        <div className="header-brand">
          <StudioLogo />
        </div>
        <a className="text-link" href="/">
          <Icon name="arrow-left" /> Back to the studio
        </a>
      </header>

      <main id="privacy" className="legal-page">
        <p className="eyebrow">LEGAL</p>
        <h1>Privacy policy</h1>
        <p className="legal-meta">
          Effective <time dateTime="2026-11-14">14 November 2026</time>
        </p>
        <p className="legal-lead">
          This page explains what personal data {domain} processes, why, who helps us with it and what rights you
          have. The short version: the only details you give us yourself are the ones you send through the contact
          form or by email. Every visit also leaves short-lived hosting logs. We use no analytics, advertising or
          tracking cookies.
        </p>

        <section aria-labelledby="who">
          <h2 id="who">Who we are</h2>
          <p>
            {site.name} is a brand of {site.legalName}. {site.legalName} operates this website and is the controller
            of the personal data described here (its “data fiduciary” under India’s Digital Personal Data Protection
            Act, 2023).
          </p>
          <dl className="legal-facts">
            <div>
              <dt>Operator and controller</dt>
              <dd>{site.legalName}</dd>
            </div>
            <div>
              <dt>Address</dt>
              {/* TODO: replace with the registered address of the legal entity once confirmed. */}
              <dd>Registered address available on request</dd>
            </div>
            <div>
              <dt>Contact, including privacy requests and grievances</dt>
              <dd>
                <Email />
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="collect">
          <h2 id="collect">What we process and why</h2>
          <h3>Enquiries through the contact form or by email</h3>
          <p>
            When you write to us we receive your name, email address and message, plus your company and website if
            you add them, and the page you sent the form from. We use this only to reply and to discuss a possible
            venture, partnership or project with you. Name, email and message are needed to answer you; the rest is
            optional.
          </p>
          <p>
            Legal basis: your consent, which you give by sending the message and can withdraw at any time, and steps
            taken at your request before a possible contract. Where the GDPR applies, we rely on Art. 6(1)(b) GDPR
            and our legitimate interest in answering business enquiries (Art. 6(1)(f) GDPR).
          </p>
          <h3>Protecting the form from abuse</h3>
          <p>
            The form contains a hidden field that people never see, which helps us recognise automated spam, and we
            limit how many messages one connection can send in a short period. To apply that limit we briefly hold
            the sending IP address in memory; it is not written to a database and is discarded within minutes.
            Legal basis: our legitimate interest in keeping the form usable and secure.
          </p>
          <h3>Hosting and delivery</h3>
          <p>
            To deliver pages, our hosting provider processes technical data such as your IP address, browser type,
            the requested address and the time of the request, including in short-lived server and security logs.
            Legal basis: our legitimate interest in running a reliable and secure website.
          </p>
        </section>

        <section aria-labelledby="recipients">
          <h2 id="recipients">Who receives the data</h2>
          <ul>
            <li>
              <strong>Our hosting provider</strong> hosts the website, delivers its pages and keeps the server and
              security logs described above.
            </li>
            <li>
              <strong>Our email delivery provider (Resend)</strong> delivers contact-form messages to our inbox by
              email.
            </li>
            <li>
              <strong>Our email provider</strong> hosts the {site.contactEmail} mailbox where messages are stored.
            </li>
          </ul>
          <p>
            These providers process the data on our behalf and under our instructions. We do not sell personal data
            or use it for advertising.
          </p>
        </section>

        <section aria-labelledby="transfers">
          <h2 id="transfers">Transfers to other countries</h2>
          <p>
            Some of our providers process data outside the country where you live, including in the United States.
            Where personal data from the European Economic Area, the United Kingdom or Switzerland is transferred, we
            rely on an adequacy decision such as the EU–U.S. Data Privacy Framework where the provider is certified,
            and otherwise on the European Commission’s Standard Contractual Clauses. Transfers of data collected in
            India are made in line with the Digital Personal Data Protection Act, 2023 and any restrictions notified
            under it.
          </p>
        </section>

        <section aria-labelledby="retention">
          <h2 id="retention">How long we keep it</h2>
          <ul>
            <li>
              Enquiries are deleted 24 months after the last message in the conversation, unless they lead to a
              contract; then we keep what the contract and legal record-keeping require.
            </li>
            <li>Hosting and security logs are kept only for the short period set by our hosting provider.</li>
            <li>The rate-limit counters used to protect the form live in memory and expire within minutes.</li>
          </ul>
        </section>

        <section aria-labelledby="cookies">
          <h2 id="cookies">Cookies and browser storage</h2>
          {/* TODO: revisit if analytics, embeds or browser storage are ever added to the site. */}
          <p>
            This website sets no cookies and uses no analytics or tracking technologies. The contact form works
            without cookies, so there is no cookie banner.
          </p>
        </section>

        <section aria-labelledby="rights">
          <h2 id="rights">Your rights</h2>
          <p>
            Depending on where you live, you can ask for access to your data, its correction, completion, updating
            or erasure, restriction of processing and a copy in a portable format, and you can object to processing
            based on our legitimate interests (Art. 15–21 GDPR). Under India’s Digital Personal Data Protection Act,
            2023 you can also withdraw your consent at any time, have your grievances addressed and nominate another
            person to exercise your rights if you are unable to. Write to <Email />; we reply within one month.
          </p>
          <p>
            If you are not satisfied with our answer, you can complain to the data protection authority where you
            live or work, or where you think the infringement happened. In India, once you have used our grievance
            process, you can approach the Data Protection Board of India.
          </p>
          <p>We do not make decisions about you by automated means alone.</p>
        </section>

        <section aria-labelledby="changes">
          <h2 id="changes">Changes</h2>
          <p>When this policy changes, we update it here and change the date at the top.</p>
        </section>
      </main>

      <footer className="case-footer">
        <StudioLogo />
        <span>Have something in mind?</span>
        <a className="inline-icon-link" data-contact="true" href={`mailto:${site.contactEmail}`} aria-haspopup="dialog">
          Let’s talk <Icon />
        </a>
        <div className="footer-legal">
          <a href="/privacy/" aria-current="page">
            Privacy policy
          </a>
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
