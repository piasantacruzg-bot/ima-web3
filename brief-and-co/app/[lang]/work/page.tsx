import type { Metadata } from "next";
import Lines from "@/components/Lines";
import ProjectIndex from "@/components/ProjectIndex";
import SectionLabel from "@/components/SectionLabel";
import { getDictionary } from "@/content/dictionary";
import { projects } from "@/content/projects";
import type { Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: { lang: Locale } };

export function generateMetadata({ params }: Props): Metadata {
  const t = getDictionary(params.lang).meta.work;
  return pageMetadata(params.lang, "/work", t.title, t.description);
}

export default function WorkPage({ params: { lang } }: Props) {
  const t = getDictionary(lang);
  return (
    <>
      <section className="wrap" style={{ paddingTop: "var(--space-9)", paddingBottom: "var(--space-9)" }}>
        <SectionLabel className="reveal">{t.work.label}</SectionLabel>
        <h1 className="display-xl reveal" style={{ marginTop: "var(--space-7)" }}>
          <Lines lines={t.work.title} />
        </h1>
      </section>
      <section className="wrap" style={{ paddingBottom: "var(--section)" }} aria-label={t.nav.work}>
        <ProjectIndex projects={projects} lang={lang} cta={t.cta.viewProject} previewLabel={t.work.preview} />
      </section>
    </>
  );
}
