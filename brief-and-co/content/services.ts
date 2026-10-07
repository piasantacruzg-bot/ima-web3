import type { Localized } from "@/lib/i18n";

export type Service = {
  id: string;
  number: string;
  // Service names are kept in English in both languages, as studio terms.
  name: string;
  summary: Localized;
  capabilities: Localized<string[]>;
};

export const services: Service[] = [
  {
    id: "creative-project-management",
    number: "01",
    name: "Creative Project Management",
    summary: {
      en: "From planning to final delivery. We manage timelines, teams, budgets, vendors and every moving part in between.",
      es: "Del planning a la entrega final. Gestionamos tiempos, equipos, presupuestos, proveedores y todas las piezas que hacen posible un proyecto.",
    },
    capabilities: {
      en: [
        "Project planning",
        "Timelines & workflows",
        "Budget coordination",
        "Team coordination",
        "Vendor management",
        "Stakeholder management",
        "On-site execution",
        "Final delivery",
      ],
      es: [
        "Planificación de proyectos",
        "Cronogramas y flujos de trabajo",
        "Coordinación de presupuesto",
        "Coordinación de equipos",
        "Gestión de proveedores",
        "Gestión de stakeholders",
        "Ejecución on-site",
        "Entrega final",
      ],
    },
  },
  {
    id: "creative-production",
    number: "02",
    name: "Creative Production",
    summary: {
      en: "Campaigns, content, shoots and creative productions, coordinated from concept through execution.",
      es: "Campañas, contenido, shoots y producciones creativas coordinadas desde el concepto hasta la ejecución.",
    },
    capabilities: {
      en: [
        "Campaign production",
        "Content production",
        "Photo & video shoots",
        "Creative teams",
        "Location & talent coordination",
        "Production management",
      ],
      es: [
        "Producción de campañas",
        "Producción de contenido",
        "Shoots de foto y video",
        "Equipos creativos",
        "Coordinación de locaciones y talento",
        "Gestión de producción",
      ],
    },
  },
  {
    id: "brand-experiences",
    number: "03",
    name: "Brand Experiences",
    summary: {
      en: "Launches, events, activations and experiences designed to bring brands into the real world.",
      es: "Lanzamientos, eventos, activaciones y experiencias que llevan las marcas al mundo real.",
    },
    capabilities: {
      en: [
        "Events",
        "Brand launches",
        "Activations",
        "Pop-ups",
        "Hospitality experiences",
        "Guest experience",
        "On-site production",
      ],
      es: [
        "Eventos",
        "Lanzamientos de marca",
        "Activaciones",
        "Pop-ups",
        "Experiencias de hospitality",
        "Experiencia de invitados",
        "Producción on-site",
      ],
    },
  },
  {
    id: "partnerships-pr",
    number: "04",
    name: "Partnerships & PR",
    summary: {
      en: "Creators, talent, media, brands and strategic collaborations that connect the right people around the right project.",
      es: "Creadores, talento, medios, marcas y colaboraciones estratégicas que conectan a las personas correctas alrededor de cada proyecto.",
    },
    capabilities: {
      en: [
        "Brand partnerships",
        "Creator collaborations",
        "Talent coordination",
        "Media relations",
        "PR activations",
        "Sponsorships",
        "Strategic collaborations",
      ],
      es: [
        "Partnerships de marca",
        "Colaboraciones con creadores",
        "Coordinación de talento",
        "Relaciones con medios",
        "Activaciones de PR",
        "Sponsorships",
        "Colaboraciones estratégicas",
      ],
    },
  },
];
