import { Icon } from "@/components/Icon";
import { site } from "@/data/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description: `How ${site.name} handles contact-form messages, hosting logs and your data rights — no tracking cookies, no ads, and nothing sold.`,
  path: "/privacy/",
});

const domain = new URL(site.url).hostname.replace(/^www\./, "");

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
        Skip to the policy
      </a>
      <header className="detail-header">
        <div className="header-brand">
          <StudioLogo />
        </div>
        <a className="text-link" href="/">
          <Icon name="arrow-left" /> Back to home
        </a>
      </header>

      <main id="privacy" className="legal-page">
        <p className="eyebrow">THE FINE PRINT</p>
        <h1>Privacy policy</h1>
        <p className="legal-meta">
          In force from <time dateTime="2026-11-14">14 November 2026</time>
        </p>
        <p className="legal-lead">
          Here is what personal data {domain} handles, for what purpose, which providers are involved and what you
          can ask of us. In brief: the only personal details we get from you directly are those you choose to send,
          by email or through our contact form. Like any website, each visit also produces hosting logs that are kept
          briefly. There are no analytics, no advertising and no tracking cookies.
        </p>

        <section aria-labelledby="who">
          <h2 id="who">Who we are</h2>
          <p>
            {site.name} is a brand operated by {site.legalName}. {site.legalName} runs this website and decides how
            the personal data covered on this page is used, which makes it the controller (the “data fiduciary” in
            the terms of India’s Digital Personal Data Protection Act, 2023).
          </p>
          <dl className="legal-facts">
            <div>
              <dt>Controller and site operator</dt>
              <dd>{site.legalName}</dd>
            </div>
            <div>
              <dt>Address</dt>
              {/* TODO: replace with the registered address of the legal entity once confirmed. */}
              <dd>Registered address shared on request</dd>
            </div>
            <div>
              <dt>Privacy requests, grievances and everything else</dt>
              <dd>
                <Email />
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="collect">
          <h2 id="collect">The data, and why we use it</h2>
          <h3>Messages you send us</h3>
          <p>
            If you get in touch, we receive what you type: your name, your email address and your message, the
            company and website fields if you fill them in, and the page the form was sent from. We use these details for one thing:
            replying to you and talking through a potential venture, partnership or project. Without a name, an
            email and a message we can’t respond; everything else is up to you.
          </p>
          <p>
            Legal basis: the consent you give by sending the message, which you can withdraw whenever you like, and
            steps you ask us to take before a potential contract. If the GDPR applies to you, we rely on GDPR Art. 6(1)(b)
            and on legitimate interest, namely responding to business enquiries (GDPR Art. 6(1)(f)).
          </p>
          <h3>Keeping spam out</h3>
          <p>
            A hidden field that visitors never see helps us spot bots, and we cap how many messages a single
            connection can send within a short window. Enforcing that cap means keeping the sender’s IP address in
            memory for a short time only: it never goes into a database and is gone within minutes. Legal basis:
            legitimate interest, namely a contact form that stays secure and keeps working.
          </p>
          <h3>Serving the website</h3>
          <p>
            Serving pages requires our hosting provider to process technical details like the browser you use, your
            IP address, the address you asked for and when you asked for it, some of which is written to short-lived
            logs on its servers and security systems. Legal basis: legitimate interest, namely a website that is
            secure and stays up.
          </p>
        </section>

        <section aria-labelledby="recipients">
          <h2 id="recipients">Who else handles it</h2>
          <ul>
            <li>
              <strong>Our hosting provider</strong> runs the website, serves its pages and holds the logs from its
              servers and security systems mentioned above.
            </li>
            <li>
              <strong>Our email delivery provider (Resend)</strong> sends messages from the contact form on to our
              inbox.
            </li>
            <li>
              <strong>Our email provider</strong> runs the {site.contactEmail} mailbox in which messages are kept.
            </li>
          </ul>
          <p>
            Each of them handles the data for us and only as we instruct. Your personal data is never sold, and never
            used for advertising.
          </p>
        </section>

        <section aria-labelledby="transfers">
          <h2 id="transfers">Data crossing borders</h2>
          <p>
            Some providers may process data in a country other than yours, the United States among them. For
            personal data leaving the European Economic Area, the United Kingdom or Switzerland, we rely on an
            adequacy decision (for instance the EU–U.S. Data Privacy Framework, where the provider is certified) and
            otherwise on the Standard Contractual Clauses issued by the European Commission. Data collected in India
            is transferred in accordance with the Digital Personal Data Protection Act, 2023 and any restrictions
            notified under it.
          </p>
        </section>

        <section aria-labelledby="retention">
          <h2 id="retention">How long it stays</h2>
          <ul>
            <li>
              We delete an enquiry 24 months on from the most recent message in that conversation. If it turns into a
              contract, we keep what that contract and record-keeping law require.
            </li>
            <li>Logs from those servers and security systems stay on record only for the brief period our hosting provider sets.</li>
            <li>Rate-limit counters for the form exist only in memory and are cleared within minutes.</li>
          </ul>
        </section>

        <section aria-labelledby="cookies">
          <h2 id="cookies">Cookies, storage and tracking</h2>
          {/* TODO: revisit if analytics, embeds or browser storage are ever added to the site. */}
          <p>
            No cookies are set by this website, and it runs no analytics or tracking tools. The contact form needs no
            cookies either, which is why you won’t see a cookie banner.
          </p>
        </section>

        <section aria-labelledby="rights">
          <h2 id="rights">Your rights</h2>
          <p>
            Depending on where you are, you may ask to see your data; to have it corrected, completed, updated or
            erased; to restrict how it is processed; or to receive a portable copy of it. You may also object to
            processing that relies on legitimate interests we pursue (GDPR Art. 15–21). India’s Digital Personal Data
            Protection Act, 2023 additionally lets you withdraw consent whenever you choose, have grievances resolved
            and nominate someone to exercise your rights should you be unable to. Email <Email />; you’ll hear back
            within one month.
          </p>
          <p>
            Unhappy with our response? You may lodge a complaint with the local data protection authority where you live,
            where you work, or in the place you believe the infringement took place. In India, after going through our
            grievance process, you may take the matter to the Data Protection Board of India.
          </p>
          <p>No decision about you is ever made solely by automated means.</p>
        </section>

        <section aria-labelledby="changes">
          <h2 id="changes">Updates to this policy</h2>
          <p>If we change this policy, the new version goes up on this page with an updated date under the heading.</p>
        </section>
      </main>

      <footer className="case-footer">
        <StudioLogo />
        <span>Building something?</span>
        <a className="inline-icon-link" data-contact="true" href={`mailto:${site.contactEmail}`} aria-haspopup="dialog">
          Pitch us <Icon />
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
