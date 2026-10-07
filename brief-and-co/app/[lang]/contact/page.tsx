import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import Lines from "@/components/Lines";
import SectionLabel from "@/components/SectionLabel";
import { getDictionary } from "@/content/dictionary";
import { site } from "@/content/site";
import type { Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: { lang: Locale } };

export function generateMetadata({ params }: Props): Metadata {
  const t = getDictionary(params.lang).meta.contact;
  return pageMetadata(params.lang, "/contact", t.title, t.description);
}

export default function ContactPage({ params: { lang } }: Props) {
  const t = getDictionary(lang).contact;
  return (
    <section className="wrap" style={{ paddingTop: "var(--space-9)", paddingBottom: "var(--section)" }}>
      <div className="grid contact">
        <div className="contact__intro">
          <SectionLabel className="reveal">{t.label}</SectionLabel>
          <h1 className="display-l reveal" style={{ marginTop: "var(--space-7)" }}>
            <Lines lines={t.title} />
          </h1>
          <p className="lead contact__lead reveal">
            {t.lead[0]}
            <br />
            {t.lead[1]}
          </p>
          <p className="meta reveal" style={{ marginTop: "var(--space-7)" }}>
            {site.location}
          </p>
        </div>
        <div className="contact__form">
          <ContactForm t={t} lang={lang} />
        </div>
      </div>
    </section>
  );
}
