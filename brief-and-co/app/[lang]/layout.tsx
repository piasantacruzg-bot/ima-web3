import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import RevealObserver from "@/components/RevealObserver";
import { getDictionary } from "@/content/dictionary";
import { site } from "@/content/site";
import { isLocale, locales } from "@/lib/i18n";
import "../globals.css";

// TODO: if a licensed grotesk (Neue Montreal, Söhne, Suisse Intl) is supplied,
// load it with next/font/local and point --font-sans at it.
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const dynamicParams = false;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s / ${site.name}` },
};

export const viewport: Viewport = {
  themeColor: "#F1EFE8",
};

export default function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  if (!isLocale(params.lang)) notFound();
  const lang = params.lang;
  const t = getDictionary(lang);

  return (
    <html lang={lang} className={`${sans.variable} ${mono.variable}`}>
      <head>
        {/* Lets CSS hide reveal elements only when JS is actually running. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          {t.nav.skip}
        </a>
        <Header lang={lang} t={t.nav} />
        <main id="main" tabIndex={-1} style={{ outline: "none" }}>
          {children}
        </main>
        <Footer t={t.footer} />
        <RevealObserver />
      </body>
    </html>
  );
}
