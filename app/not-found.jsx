import { Icon } from "@/components/Icon";
import { site } from "@/data/site";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="not-found">
      <a className="wordmark" href="/">
        super
        <br />
        deluxe.
      </a>
      <p className="eyebrow">404 / SIGNAL LOST</p>
      <h1>This page drifted off.</h1>
      <a className="button" href="/#projects">
        Back to the ventures <Icon />
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
