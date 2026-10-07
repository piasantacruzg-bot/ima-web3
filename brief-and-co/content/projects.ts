import type { Localized } from "@/lib/i18n";

/**
 * An image (or muted video) slot. Until real files are supplied, leave `src`
 * empty and the site renders a clearly labelled placeholder showing where the
 * asset should go. Never fill these with stock imagery.
 */
export type Media = {
  src?: string;
  kind?: "image" | "video";
  /** Intended asset path, shown on the placeholder. */
  placeholder: string;
  alt: Localized;
  /** CSS aspect-ratio, reserved up front to avoid layout shift. */
  ratio: string;
  /** "result" = finished outcome, "process" = the work behind the work. */
  world?: "result" | "process" | "portrait";
  width?: number;
  height?: number;
};

/** Case-study text. `null` means not supplied yet: the chapter shows a placeholder. */
type Chapter = Localized<string[]> | null;

export type Project = {
  slug: string;
  number: string;
  title: string;
  location: Localized;
  /** Short location for indexes, e.g. LIMA / CDMX. */
  city: string;
  year: number;
  services: Localized<string[]>;
  cover: Media;
  gallery: Media[];
  brief: Chapter;
  approach: Chapter;
  work: Chapter;
  /** Only real outcomes. Never invent metrics. */
  result: Chapter;
  collaborators: string[];
  links: { label: string; url: string }[];
};

export const projects: Project[] = [
  {
    slug: "capital-nocturno",
    number: "01",
    title: "Capital Nocturno",
    location: { en: "Lima", es: "Lima" },
    city: "Lima",
    year: 2026,
    services: {
      en: ["Creative Project Management", "Event Production", "Partnerships"],
      es: ["Creative Project Management", "Producción de eventos", "Partnerships"],
    },
    // TODO: supply cover + gallery in /public/assets/projects/capital-nocturno/
    cover: {
      placeholder: "/assets/projects/capital-nocturno/cover.*",
      alt: { en: "Capital Nocturno, cover image", es: "Capital Nocturno, imagen principal" },
      ratio: "16 / 9",
      world: "result",
    },
    gallery: [
      {
        placeholder: "/assets/projects/capital-nocturno/process-01.*",
        alt: { en: "Capital Nocturno, behind the scenes", es: "Capital Nocturno, detrás de escena" },
        ratio: "4 / 5",
        world: "process",
      },
      {
        placeholder: "/assets/projects/capital-nocturno/detail-01.*",
        alt: { en: "Capital Nocturno, production detail", es: "Capital Nocturno, detalle de producción" },
        ratio: "4 / 5",
        world: "process",
      },
      {
        placeholder: "/assets/projects/capital-nocturno/result-01.*",
        alt: { en: "Capital Nocturno, the event", es: "Capital Nocturno, el evento" },
        ratio: "3 / 2",
        world: "result",
      },
    ],
    // TODO: case-study copy to be supplied by the studio.
    brief: null,
    approach: null,
    work: null,
    result: null,
    collaborators: [],
    links: [],
  },
  {
    slug: "etmc-mexico",
    number: "02",
    title: "ETMC Mexico",
    location: { en: "Mexico City", es: "Ciudad de México" },
    city: "CDMX",
    year: 2026,
    services: {
      en: ["Creative Project Management", "Brand Experience", "Partnerships", "Production"],
      es: ["Creative Project Management", "Experiencia de marca", "Partnerships", "Producción"],
    },
    // TODO: supply cover + gallery in /public/assets/projects/etmc-mexico/
    cover: {
      placeholder: "/assets/projects/etmc-mexico/cover.*",
      alt: { en: "ETMC Mexico, cover image", es: "ETMC Mexico, imagen principal" },
      ratio: "16 / 9",
      world: "result",
    },
    gallery: [
      {
        placeholder: "/assets/projects/etmc-mexico/process-01.*",
        alt: { en: "ETMC Mexico, behind the scenes", es: "ETMC Mexico, detrás de escena" },
        ratio: "4 / 5",
        world: "process",
      },
      {
        placeholder: "/assets/projects/etmc-mexico/detail-01.*",
        alt: { en: "ETMC Mexico, production detail", es: "ETMC Mexico, detalle de producción" },
        ratio: "4 / 5",
        world: "process",
      },
      {
        placeholder: "/assets/projects/etmc-mexico/result-01.*",
        alt: { en: "ETMC Mexico, the experience", es: "ETMC Mexico, la experiencia" },
        ratio: "3 / 2",
        world: "result",
      },
    ],
    // TODO: case-study copy to be supplied by the studio.
    brief: null,
    approach: null,
    work: null,
    result: null,
    collaborators: [],
    links: [],
  },
];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}

/** The project after this one, wrapping around to the first. */
export function getNextProject(slug: string) {
  const i = projects.findIndex((p) => p.slug === slug);
  return projects[(i + 1) % projects.length];
}
