import type { Metadata } from "next";
import ContactBand from "@/components/ContactBand";
import SectionLabel from "@/components/SectionLabel";
import ServiceList from "@/components/ServiceList";
import { getDictionary } from "@/content/dictionary";
import { services } from "@/content/services";
import { href, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: { lang: Locale } };

export function generateMetadata({ params }: Props): Metadata {
  const t = getDictionary(params.lang).meta.services;
  return pageMetadata(params.lang, "/services", t.title, t.description);
}

export default function ServicesPage({ params: { lang } }: Props) {
  const t = getDictionary(lang);
  return (
    <>
      <section className="wrap" style={{ paddingTop: "var(--space-9)", paddingBottom: "var(--section)" }}>
        <div className="grid services-intro">
          <SectionLabel className="reveal">{t.services.label}</SectionLabel>
          <h1 className="display-xl reveal">{t.services.title}</h1>
          <div className="services-intro__text reveal">
            <p className="lead" style={{ marginBottom: "var(--space-5)" }}>
              {t.services.intro[0]}
            </p>
            <p className="body muted">{t.services.intro[1]}</p>
          </div>
        </div>
      </section>
      <section className="wrap" style={{ paddingBottom: "var(--section)" }} aria-label={t.nav.services}>
        <ServiceList services={services} lang={lang} detailed />
      </section>
      <ContactBand label={t.contact.label} title={t.contact.title} cta={t.cta.sendBrief} ctaHref={href(lang, "/contact")} />
    </>
  );
}
