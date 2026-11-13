import { preload } from "react-dom";
import { ContactProvider } from "@/components/ContactProvider";
import { site } from "@/data/site";
import { jsonLd, organizationSchema, pageMetadata, websiteSchema } from "@/lib/seo";
import "./globals.css";

const verification = {
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}),
  ...(process.env.BING_SITE_VERIFICATION ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } } : {}),
};

// Site-wide defaults. Canonical and og:url are left to each page, so routes
// without their own (e.g. the 404) don't claim to be the home page.
const defaults = pageMetadata({ absoluteTitle: site.title, description: site.metaDescription, path: "/" });
delete defaults.alternates;
delete defaults.openGraph.url;

export const metadata = {
  metadataBase: new URL(site.url),
  ...defaults,
  // Inner pages pass a short title; the template adds the brand.
  title: { default: site.title, template: `%s | ${site.name}` },
  applicationName: site.name,
  keywords: site.keywords,
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  publisher: site.name,
  category: "business",
  formatDetection: { telephone: false, address: false, email: false },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  ...(Object.keys(verification).length ? { verification } : {}),
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0d10",
  colorScheme: "dark",
};

export default function RootLayout({ children }) {
  // Body copy is set in Manrope; fetch the Latin subset with the HTML so text
  // (the LCP element on most pages) renders in the right face immediately.
  preload("/fonts/manrope-latin-variable.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });

  return (
    <html lang={site.language} data-scroll-behavior="smooth">
      <head>
        <link rel="describedby" href="/llms.txt" type="text/plain" />
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd({ "@graph": [organizationSchema(), websiteSchema()] })} />
        <ContactProvider email={site.contactEmail}>{children}</ContactProvider>
      </body>
    </html>
  );
}
