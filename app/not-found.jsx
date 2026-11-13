import { Icon } from "@/components/Icon";
import { site } from "@/data/site";

export const metadata = {
  title: `Page not found — ${site.name}`,
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="not-found">
      <a className="wordmark" href="/">
        sprdlx
        <br />
        studio.
      </a>
      <p className="eyebrow">404 / OUT OF ORBIT</p>
      <h1>Let’s find your way back.</h1>
      <a className="button" href="/#projects">
        Explore our work <Icon />
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
    </main>
  );
}
