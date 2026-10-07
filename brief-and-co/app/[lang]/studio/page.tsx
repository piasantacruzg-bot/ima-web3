import type { Metadata } from "next";
import ContactBand from "@/components/ContactBand";
import Lines from "@/components/Lines";
import NetworkStatement from "@/components/NetworkStatement";
import SectionLabel from "@/components/SectionLabel";
import TeamMember from "@/components/TeamMember";
import { getDictionary } from "@/content/dictionary";
import { team } from "@/content/team";
import { href, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: { lang: Locale } };

export function generateMetadata({ params }: Props): Metadata {
  const t = getDictionary(params.lang).meta.studio;
  return pageMetadata(params.lang, "/studio", t.title, t.description);
}

export default function StudioPage({ params: { lang } }: Props) {
  const t = getDictionary(lang);
  return (
    <>
      <section className="wrap" style={{ paddingTop: "var(--space-9)", paddingBottom: "var(--section)" }}>
        <div className="grid studio-hero">
          <SectionLabel className="reveal">{t.studio.label}</SectionLabel>
          <h1 className="display-xl reveal">
            <Lines lines={t.studio.title} />
          </h1>
          <div className="studio-hero__text reveal">
            <p className="lead" style={{ marginBottom: "var(--space-5)" }}>
              {t.studio.body[0]}
            </p>
            {t.studio.body.slice(1).map((p, i) => (
              <p className="body muted" key={i}>
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="section rule-top" aria-labelledby="team-title">
        <div className="wrap">
          <div className="grid section-head">
            <SectionLabel className="section-head__label reveal">{t.studio.team.label}</SectionLabel>
            <h2 id="team-title" className="display-l section-head__title reveal">
              {t.studio.team.title}
            </h2>
          </div>
          <div className="grid team">
            {team.map((m) => (
              <TeamMember key={m.id} member={m} lang={lang} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section--loose" aria-label={t.studio.network.label}>
        <div className="wrap">
          <NetworkStatement t={t.studio.network} />
        </div>
      </section>

      <ContactBand label={t.contact.label} title={t.contact.title} cta={t.cta.sendBrief} ctaHref={href(lang, "/contact")} />
    </>
  );
}
