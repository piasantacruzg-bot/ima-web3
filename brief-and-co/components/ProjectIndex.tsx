"use client";

import Link from "next/link";
import { useState } from "react";
import ProjectMedia from "@/components/ProjectMedia";
import type { Project } from "@/content/projects";
import { href, type Locale } from "@/lib/i18n";

type Props = { projects: Project[]; lang: Locale; cta: string; previewLabel: string };

/**
 * Text-led archive. On desktop, hovering or focusing a row shows its image in
 * the sticky preview column. On mobile each row carries its own image.
 */
export default function ProjectIndex({ projects, lang, cta, previewLabel }: Props) {
  const [active, setActive] = useState(projects[0]?.slug);

  return (
    <div className="grid work-index">
      <ol className="work-index__rows">
        {projects.map((p) => (
          <li key={p.slug}>
            <Link
              href={href(lang, `/work/${p.slug}`)}
              className="project-row reveal"
              onMouseEnter={() => setActive(p.slug)}
              onFocus={() => setActive(p.slug)}
            >
              <div className="project-row__media">
                <ProjectMedia media={p.cover} lang={lang} sizes="100vw" decorative reveal={false} />
              </div>
              <div className="project-row__top">
                <span className="meta">{p.number}</span>
                <h2 className="project-row__title">{p.title}</h2>
              </div>
              <div className="project-row__details">
                <div>
                  <p className="meta">
                    {p.city} / {p.year}
                  </p>
                  <p className="meta">{p.services[lang].join(" / ")}</p>
                </div>
                <span className="arrow-link" aria-hidden="true">
                  <span>{cta}</span>
                  <span className="arrow">→</span>
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ol>
      <div className="work-index__preview" aria-label={previewLabel} role="region">
        {projects.map((p) => (
          <div key={p.slug} className="work-index__preview-item" data-active={p.slug === active}>
            <ProjectMedia
              media={{ ...p.cover, ratio: "4 / 5" }}
              lang={lang}
              sizes="40vw"
              reveal={false}
              decorative
            />
          </div>
        ))}
      </div>
    </div>
  );
}
