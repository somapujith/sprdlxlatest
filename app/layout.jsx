import { preload } from "react-dom";
import { ContactProvider } from "@/components/ContactProvider";
import { site } from "@/data/site";
import "./globals.css";

const ogImage = {
  url: "/media/og-image.png",
  width: 1200,
  height: 630,
  alt: `${site.title} · AI venture studio, India`,
};

export const metadata = {
  metadataBase: new URL(site.url),
  title: site.title,
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: "/" },
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
  openGraph: {
    type: "website",
    url: "/",
    siteName: site.name,
    locale: "en_US",
    title: site.title,
    description: site.description,
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
    images: [ogImage],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0d10",
};

const organization = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${site.url}/#organization`,
      name: site.name,
      legalName: site.legalName,
      url: `${site.url}/`,
      description: site.description,
      email: site.contactEmail,
      logo: `${site.url}${site.logo}`,
      sameAs: site.socials.map((social) => social.href),
    },
    {
      "@type": "WebSite",
      "@id": `${site.url}/#website`,
      name: site.name,
      url: `${site.url}/`,
      inLanguage: "en",
      publisher: { "@id": `${site.url}/#organization` },
    },
  ],
};

export default function RootLayout({ children }) {
  // The lunar environment is the first thing the hero paints.
  preload("/media/environments/lunar.webp", { as: "image", fetchPriority: "high" });

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="describedby" href="/llms.txt" type="text/plain" />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, "\\u003c") }}
        />
        <ContactProvider email={site.contactEmail}>{children}</ContactProvider>
      </body>
    </html>
  );
}
