import Link from "next/link";
import ProjectMedia from "@/components/ProjectMedia";
import type { Project } from "@/content/projects";
import { href, type Locale } from "@/lib/i18n";

type Props = { project: Project; lang: Locale; cta: string; alt?: boolean };

/** Large media + minimal metadata. Used for selected work on the home page. */
export default function ProjectFeature({ project, lang, cta, alt = false }: Props) {
  const url = href(lang, `/work/${project.slug}`);
  return (
    <article className={`grid feature ${alt ? "feature--alt" : ""}`}>
      <Link href={url} className="feature__link feature__media" tabIndex={-1} aria-hidden="true">
        <ProjectMedia media={project.cover} lang={lang} sizes="(min-width: 1024px) 66vw, 100vw" decorative />
      </Link>
      <div className="feature__info reveal">
        <p className="meta">
          {project.number} / {project.city} / {project.year}
        </p>
        <h3 className="feature__title">
          <Link href={url}>{project.title}</Link>
        </h3>
        <div className="feature__meta">
          <p className="meta">{project.services[lang].join(" · ")}</p>
          <p className="meta">
            {project.location[lang]} / {project.year}
          </p>
        </div>
        <p style={{ marginTop: "var(--space-5)" }}>
          <Link href={url} className="arrow-link">
            <span>{cta}</span>
            <span className="arrow" aria-hidden="true">
              →
            </span>
            <span className="sr-only">: {project.title}</span>
          </Link>
        </p>
      </div>
    </article>
  );
}
