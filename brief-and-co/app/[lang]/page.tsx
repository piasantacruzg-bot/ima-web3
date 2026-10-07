import type { Metadata } from "next";
import ArrowLink from "@/components/ArrowLink";
import Hero from "@/components/Hero";
import ProcessSteps from "@/components/ProcessSteps";
import ProjectFeature from "@/components/ProjectFeature";
import SectionLabel from "@/components/SectionLabel";
import ServiceList from "@/components/ServiceList";
import StatementBlock from "@/components/StatementBlock";
import { getDictionary } from "@/content/dictionary";
import { projects } from "@/content/projects";
import { services } from "@/content/services";
import { site } from "@/content/site";
import { href, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: { lang: Locale } };

export function generateMetadata({ params }: Props): Metadata {
  const t = getDictionary(params.lang).meta.home;
  return { ...pageMetadata(params.lang, "/", t.title, t.description), title: { absolute: t.title } };
}

export default function Home({ params: { lang } }: Props) {
  const t = getDictionary(lang);
  const descriptor = lang === "es" ? "Estudio de Creative Project Management." : `${site.descriptor}.`;

  return (
    <>
      <Hero t={t.home.hero} descriptor={descriptor} ctaHref="#work" />

      <section className="section section--loose" aria-labelledby="intro-title">
        <div className="wrap">
          <StatementBlock
            id="intro-title"
            label={t.home.intro.label}
            title={["From brief", "to done."]}
            lead={t.home.intro.lead}
            body={t.home.intro.body}
            close={t.home.intro.close}
          />
        </div>
      </section>

      <section className="section" aria-labelledby="services-title">
        <div className="wrap">
          <div className="grid section-head">
            <SectionLabel className="section-head__label reveal">{t.home.services.label}</SectionLabel>
            <h2 id="services-title" className="display-l section-head__title reveal">
              {t.home.services.title}
            </h2>
          </div>
          <ServiceList services={services} lang={lang} />
          <p style={{ marginTop: "var(--space-6)" }}>
            <ArrowLink href={href(lang, "/services")}>{t.home.services.cta}</ArrowLink>
          </p>
        </div>
      </section>

      <section id="work" className="section" aria-labelledby="work-title" style={{ scrollMarginTop: "var(--space-5)" }}>
        <div className="wrap">
          <div className="grid section-head" style={{ marginBottom: "var(--space-5)" }}>
            <SectionLabel className="section-head__label reveal">{t.home.work.label}</SectionLabel>
            <h2 id="work-title" className="display-l section-head__title reveal">
              {t.home.work.title}
            </h2>
          </div>
          {projects.map((p, i) => (
            <ProjectFeature key={p.slug} project={p} lang={lang} cta={t.cta.viewProject} alt={i % 2 === 1} />
          ))}
          <p className="rule-top" style={{ paddingTop: "var(--space-5)" }}>
            <ArrowLink href={href(lang, "/work")}>{t.home.work.cta}</ArrowLink>
          </p>
        </div>
      </section>

      <section className="section section--ink section--loose" aria-labelledby="process-title">
        <div className="wrap">
          <div className="grid section-head">
            <SectionLabel className="section-head__label reveal">{t.home.process.label}</SectionLabel>
            <h2 id="process-title" className="display-l section-head__title reveal">
              The work
              <br />
              behind the work.
            </h2>
          </div>
          <ProcessSteps steps={t.home.process.steps} />
        </div>
      </section>

      <section className="section section--loose" aria-labelledby="home-contact-title">
        <div className="wrap">
          <SectionLabel className="reveal">{t.home.contact.label}</SectionLabel>
          <div className="grid contact-band" style={{ marginTop: "var(--space-7)" }}>
            <h2 id="home-contact-title" className="display-l contact-band__title reveal">
              {t.home.contact.title.map((line, i) => (
                <span className="line" key={i}>
                  {line}{" "}
                </span>
              ))}
            </h2>
            <div className="contact-band__cta reveal">
              <ArrowLink href={href(lang, "/contact")} size="large">
                {t.cta.sendBrief}
              </ArrowLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
