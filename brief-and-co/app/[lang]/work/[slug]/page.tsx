import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ContactBand from "@/components/ContactBand";
import ProjectMedia from "@/components/ProjectMedia";
import SectionLabel from "@/components/SectionLabel";
import { getDictionary } from "@/content/dictionary";
import { getNextProject, getProject, projects, type Project } from "@/content/projects";
import { href, locales, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: { lang: Locale; slug: string } };

export function generateStaticParams() {
  return locales.flatMap((lang) => projects.map((p) => ({ lang, slug: p.slug })));
}

export const dynamicParams = false;

export function generateMetadata({ params }: Props): Metadata {
  const project = getProject(params.slug);
  if (!project) return {};
  const description = `${project.title}. ${project.location[params.lang]} / ${project.year}. ${project.services[params.lang].join(", ")}.`;
  return pageMetadata(params.lang, `/work/${project.slug}`, project.title, description);
}

export default function ProjectPage({ params: { lang, slug } }: Props) {
  const project = getProject(slug);
  if (!project) notFound();
  const t = getDictionary(lang);
  const next = getNextProject(slug);
  const [processA, processB, ...rest] = project.gallery;

  return (
    <article>
      <header className="wrap grid case-hero">
        <SectionLabel className="reveal">
          {t.project.label} / {project.number}
        </SectionLabel>
        <h1 className="display-xl case-hero__title reveal">{project.title}.</h1>
        <p className="meta case-hero__meta reveal">
          {project.location[lang]} / {project.year}
        </p>
        <ul className="meta case-hero__services reveal">
          {project.services[lang].map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </header>

      <div className="wrap">
        <ProjectMedia media={project.cover} lang={lang} priority sizes="100vw" bleed />
      </div>

      <Chapter id="brief" title={t.project.brief} text={project.brief} lang={lang} pending={t.project.pending} />
      <Chapter id="approach" title={t.project.approach} text={project.approach} lang={lang} pending={t.project.pending} />

      {(processA || processB) && (
        <div className="wrap grid gallery">
          {processA && (
            <div className="gallery__a">
              <ProjectMedia media={processA} lang={lang} sizes="(min-width: 768px) 40vw, 100vw" />
            </div>
          )}
          {processB && (
            <div className="gallery__b">
              <ProjectMedia media={processB} lang={lang} sizes="(min-width: 768px) 40vw, 100vw" />
            </div>
          )}
        </div>
      )}

      <Chapter id="work" title={t.project.work} text={project.work} lang={lang} pending={t.project.pending}>
        {project.collaborators.length > 0 && (
          <div style={{ marginTop: "var(--space-6)" }}>
            <p className="meta">{t.project.collaborators}</p>
            <p className="body">{project.collaborators.join(" / ")}</p>
          </div>
        )}
      </Chapter>

      {rest.map((m, i) => (
        <div className="wrap" key={i}>
          <ProjectMedia media={m} lang={lang} sizes="100vw" bleed={i === 0} />
        </div>
      ))}

      <Chapter id="result" title={t.project.result} text={project.result} lang={lang} pending={t.project.pending}>
        {project.links.length > 0 && (
          <ul style={{ marginTop: "var(--space-6)" }}>
            {project.links.map((l) => (
              <li key={l.url}>
                <a className="arrow-link" href={l.url} target="_blank" rel="noopener noreferrer">
                  <span>{l.label}</span>
                  <span className="arrow" aria-hidden="true">
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Chapter>

      <nav className="wrap rule-top" aria-label={t.project.next}>
        <Link href={href(lang, `/work/${next.slug}`)} className="next-project">
          <span className="meta">
            {t.project.next} / {next.number}
          </span>
          <span className="display-l next-project__title">
            {next.title}
            <span className="arrow" aria-hidden="true">
              →
            </span>
          </span>
        </Link>
      </nav>

      <ContactBand label={t.contact.label} title={t.contact.title} cta={t.cta.sendBrief} ctaHref={href(lang, "/contact")} />
    </article>
  );
}

function Chapter({
  id,
  title,
  text,
  lang,
  pending,
  children,
}: {
  id: string;
  title: string;
  text: Project["brief"];
  lang: Locale;
  pending: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="section" aria-labelledby={`chapter-${id}`}>
      <div className="wrap grid chapter">
        <h2 id={`chapter-${id}`} className="heading chapter__title reveal">
          {title}
        </h2>
        <div className="chapter__text reveal">
          {text ? (
            text[lang].map((p, i) => (
              <p className="body" key={i}>
                {p}
              </p>
            ))
          ) : (
            // Placeholder until the studio supplies this chapter.
            <p className="meta pending">{pending}</p>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}
