import type { Localized } from "@/lib/i18n";
import type { Media } from "@/content/projects";

export type TeamMember = {
  id: string;
  name: string;
  role: Localized;
  bio: Localized<string[]>;
  portrait: Media;
};

export const team: TeamMember[] = [
  {
    id: "maria-pia-santa-cruz",
    name: "Maria Pia Santa Cruz",
    role: {
      en: "PR & Creative Project Manager",
      es: "PR & Creative Project Manager",
    },
    bio: {
      en: [
        "Maria Pia leads projects from brief to delivery, connecting creative direction with the people, partners and production needed to make them happen.",
        "Her work spans project management, PR, partnerships, brand experiences and creative production across different markets.",
      ],
      es: [
        "Maria Pia lidera proyectos desde el brief hasta la entrega, conectando la dirección creativa con las personas, partners y producción necesarios para hacerlos realidad.",
        "Su trabajo abarca project management, PR, partnerships, experiencias de marca y producción creativa en distintos mercados.",
      ],
    },
    // TODO: add editorial portrait at /public/assets/team/maria-pia.jpg and set src.
    portrait: {
      placeholder: "/assets/team/maria-pia.*",
      alt: { en: "Portrait of Maria Pia Santa Cruz", es: "Retrato de Maria Pia Santa Cruz" },
      ratio: "4 / 5",
      world: "portrait",
    },
  },
  {
    id: "fabiana-corrales",
    name: "Fabiana Corrales",
    role: { en: "Digital Strategist", es: "Estratega Digital" },
    bio: {
      en: [
        "Fabiana shapes the digital thinking behind our projects, connecting strategy, content and audience behavior to build stronger brand experiences across digital channels.",
        "She works across digital strategy, content planning and campaign development, helping translate creative ideas into relevant digital experiences.",
      ],
      es: [
        "Fabiana desarrolla la estrategia digital detrás de nuestros proyectos, conectando estrategia, contenido y comportamiento de audiencias para construir experiencias de marca más relevantes en canales digitales.",
        "Trabaja en estrategia digital, planificación de contenido y desarrollo de campañas, ayudando a convertir ideas creativas en experiencias digitales relevantes.",
      ],
    },
    // TODO: add editorial portrait at /public/assets/team/fabiana-corrales.jpg and set src.
    portrait: {
      placeholder: "/assets/team/fabiana-corrales.*",
      alt: { en: "Portrait of Fabiana Corrales", es: "Retrato de Fabiana Corrales" },
      ratio: "4 / 5",
      world: "portrait",
    },
  },
];
