import type { Locale } from "@/lib/i18n";

// All page copy and UI labels, in one place per language.
// Brand lines (FROM BRIEF TO DONE., THE WORK BEHIND THE WORK.) and the
// location signature stay in English on purpose.

const en = {
  nav: {
    work: "Work",
    services: "Services",
    studio: "Studio",
    contact: "Contact",
    menu: "Menu",
    close: "Close",
    home: "Brief&Co., home",
    language: "Language",
    skip: "Skip to content",
  },
  meta: {
    home: {
      title: "Brief&Co. / Creative Project Management Studio",
      description:
        "Brief&Co. plans, coordinates and delivers creative projects from brief to completion. Lima. Working worldwide.",
    },
    work: {
      title: "Work",
      description:
        "Selected projects planned, coordinated and delivered by Brief&Co.",
    },
    services: {
      title: "Services",
      description:
        "Creative Project Management, Creative Production, Brand Experiences and Partnerships & PR.",
    },
    studio: {
      title: "Studio",
      description:
        "Brief&Co. is an independent Creative Project Management Studio based in Lima and working worldwide.",
    },
    contact: {
      title: "Contact",
      description: "Have a project in mind? Send us the brief.",
    },
  },
  home: {
    hero: {
      label: "Brief&Co. / 2026",
      lines: ["We make", "creative projects", "happen."],
      cta: "View our work",
    },
    intro: {
      label: "What we do / 01",
      lead: "Great ideas are only the beginning.",
      body: [
        "We plan, coordinate and deliver creative projects, bringing together the right people, partners and processes to move ideas from brief to execution.",
        "From campaigns and brand experiences to launches, productions and collaborations.",
      ],
      close: "We handle the moving parts.",
    },
    services: {
      label: "Services / 04",
      title: "What we handle.",
      cta: "Explore services",
    },
    work: {
      label: "Selected work / 2026",
      title: "The work.",
      cta: "All projects",
    },
    process: {
      label: "Process / 04",
      steps: [
        { name: "Brief", text: "Understand the idea. Objectives, audience, scope and what needs to happen." },
        { name: "Plan", text: "Build the roadmap. People, partners, resources, timelines and budget." },
        { name: "Make", text: "Put everything in motion. Production, coordination and execution." },
        { name: "Deliver", text: "Get it done. From final details to launch and delivery." },
      ],
    },
    contact: {
      label: "Contact /",
      title: ["Have a project", "in mind?"],
    },
  },
  services: {
    label: "Services / 04",
    title: "What we handle.",
    intro: [
      "Some projects need an idea. Others already have one and need someone to make it happen.",
      "We can step in at different stages, from early planning to full project execution.",
    ],
  },
  work: {
    label: "Selected work / 2026",
    title: ["Projects we've", "brought to life."],
    preview: "Project preview",
  },
  project: {
    label: "Project",
    brief: "The brief.",
    approach: "The approach.",
    work: "The work.",
    result: "The result.",
    collaborators: "Collaborators",
    links: "Links",
    pending: "Case study text in preparation.",
    next: "Next project",
  },
  studio: {
    label: "The studio / 01",
    title: ["Small team.", "Big projects."],
    body: [
      "Brief&Co. is an independent Creative Project Management Studio based in Lima and working worldwide.",
      "We work at the intersection of creativity and execution, building the teams, partnerships and processes each project needs.",
      "Our structure is intentionally flexible. We bring together a trusted network of creatives, producers, specialists and partners depending on the scope of each project.",
    ],
    team: {
      label: "Team / 02",
      title: "People behind the projects.",
    },
    network: {
      label: "Network / 03",
      title: "+ The right people for every project.",
      body: [
        "Every project is different. So is the team behind it.",
        "We collaborate with a trusted network of designers, photographers, filmmakers, producers, creators, developers, PR specialists, vendors and creative talent, building the right team around each brief.",
      ],
    },
  },
  contact: {
    label: "Contact /",
    title: ["Have a project", "in mind?"],
    lead: ["Send us the brief.", "We'll take it from there."],
    fields: {
      name: "Name",
      company: "Company",
      email: "Email",
      type: "Project type",
      message: "Tell us about the project",
      budget: "Budget range",
      timeline: "Timeline",
    },
    optional: "Optional",
    choose: "Select one",
    types: [
      "Creative Project Management",
      "Creative Production",
      "Brand Experiences",
      "Partnerships & PR",
      "Not sure yet",
    ],
    // TODO: adjust ranges and currency to what the studio wants to ask.
    budgets: ["Under USD 10k", "USD 10k–25k", "USD 25k–50k", "USD 50k+", "Not defined yet"],
    timelinePlaceholder: "e.g. Launch in March",
    submit: "Send the brief",
    sending: "Sending…",
    errors: {
      name: "Please tell us your name.",
      email: "Please enter your email.",
      emailFormat: "That email doesn't look right.",
      message: "Tell us a little about the project.",
      summary: "Some fields need your attention.",
      server: "We couldn't send the brief right now.",
      fallback: "Please write to us directly at",
      retry: "Please try again in a moment.",
    },
    success: {
      title: "Brief received.",
      body: "Thanks. We'll read it and get back to you soon.",
      again: "Send another brief",
    },
  },
  cta: {
    sendBrief: "Send the brief",
    viewProject: "View project",
  },
  footer: {
    instagram: "Instagram",
    linkedin: "LinkedIn",
    email: "Email",
  },
};

export type Dictionary = typeof en;

const es: Dictionary = {
  nav: {
    work: "Proyectos",
    services: "Servicios",
    studio: "Estudio",
    contact: "Contacto",
    menu: "Menú",
    close: "Cerrar",
    home: "Brief&Co., inicio",
    language: "Idioma",
    skip: "Saltar al contenido",
  },
  meta: {
    home: {
      title: "Brief&Co. / Estudio de Creative Project Management",
      description:
        "Brief&Co. planifica, coordina y ejecuta proyectos creativos del brief a la entrega. Lima. Working worldwide.",
    },
    work: {
      title: "Proyectos",
      description:
        "Proyectos seleccionados planificados, coordinados y ejecutados por Brief&Co.",
    },
    services: {
      title: "Servicios",
      description:
        "Creative Project Management, Creative Production, Brand Experiences y Partnerships & PR.",
    },
    studio: {
      title: "Estudio",
      description:
        "Brief&Co. es un estudio independiente de Creative Project Management basado en Lima y trabajando con proyectos alrededor del mundo.",
    },
    contact: {
      title: "Contacto",
      description: "¿Tienes un proyecto en mente? Envíanos el brief.",
    },
  },
  home: {
    hero: {
      label: "Brief&Co. / 2026",
      lines: ["Hacemos que", "los proyectos", "sucedan."],
      cta: "Ver proyectos",
    },
    intro: {
      label: "Qué hacemos / 01",
      lead: "Las buenas ideas son solo el comienzo.",
      body: [
        "Planificamos, coordinamos y ejecutamos proyectos creativos, conectando a las personas, partners y procesos necesarios para llevar una idea del brief a la realidad.",
        "Desde campañas y experiencias de marca hasta lanzamientos, producciones y colaboraciones.",
      ],
      close: "Nos encargamos de que todo funcione.",
    },
    services: {
      label: "Servicios / 04",
      title: "De qué nos encargamos.",
      cta: "Ver servicios",
    },
    work: {
      label: "Proyectos / 2026",
      title: "Proyectos.",
      cta: "Todos los proyectos",
    },
    process: {
      label: "Proceso / 04",
      steps: [
        { name: "Brief", text: "Entendemos la idea. Objetivos, audiencia, alcance y qué tiene que suceder." },
        { name: "Plan", text: "Construimos el plan. Personas, partners, recursos, tiempos y presupuesto." },
        { name: "Make", text: "Ponemos todo en movimiento. Producción, coordinación y ejecución." },
        { name: "Deliver", text: "Lo hacemos realidad. De los últimos detalles al lanzamiento y la entrega." },
      ],
    },
    contact: {
      label: "Contacto /",
      title: ["¿Tienes un", "proyecto en mente?"],
    },
  },
  services: {
    label: "Servicios / 04",
    title: "De qué nos encargamos.",
    intro: [
      "Algunos proyectos necesitan una idea. Otros ya la tienen y necesitan a alguien que la haga realidad.",
      "Podemos entrar en distintas etapas, desde el planning inicial hasta la ejecución completa.",
    ],
  },
  work: {
    label: "Proyectos / 2026",
    title: ["Proyectos que", "hicimos realidad."],
    preview: "Vista previa del proyecto",
  },
  project: {
    label: "Proyecto",
    brief: "El brief.",
    approach: "El enfoque.",
    work: "El trabajo.",
    result: "El resultado.",
    collaborators: "Colaboradores",
    links: "Links",
    pending: "Texto del caso en preparación.",
    next: "Siguiente proyecto",
  },
  studio: {
    label: "El estudio / 01",
    title: ["Equipo pequeño.", "Proyectos grandes."],
    body: [
      "Brief&Co. es un estudio independiente de Creative Project Management basado en Lima y trabajando con proyectos alrededor del mundo.",
      "Trabajamos en el punto donde la creatividad se encuentra con la ejecución, construyendo los equipos, alianzas y procesos que cada proyecto necesita.",
      "Nuestra estructura es intencionalmente flexible. Trabajamos con una red de creativos, productores, especialistas y partners según las necesidades de cada proyecto.",
    ],
    team: {
      label: "Equipo / 02",
      title: "Las personas detrás de los proyectos.",
    },
    network: {
      label: "Red / 03",
      title: "+ Las personas correctas para cada proyecto.",
      body: [
        "Cada proyecto es diferente. El equipo detrás también.",
        "Colaboramos con una red de diseñadores, fotógrafos, filmmakers, productores, creators, developers, especialistas en PR, proveedores y talento creativo, construyendo el equipo adecuado alrededor de cada brief.",
      ],
    },
  },
  contact: {
    label: "Contacto /",
    title: ["¿Tienes un", "proyecto en mente?"],
    lead: ["Envíanos el brief.", "Nosotros nos encargamos del resto."],
    fields: {
      name: "Nombre",
      company: "Empresa",
      email: "Email",
      type: "Tipo de proyecto",
      message: "Cuéntanos sobre el proyecto",
      budget: "Rango de presupuesto",
      timeline: "Timeline",
    },
    optional: "Opcional",
    choose: "Elige una opción",
    types: [
      "Creative Project Management",
      "Creative Production",
      "Brand Experiences",
      "Partnerships & PR",
      "Aún no lo sé",
    ],
    budgets: ["Menos de USD 10k", "USD 10k–25k", "USD 25k–50k", "USD 50k+", "Aún por definir"],
    timelinePlaceholder: "p. ej. Lanzamiento en marzo",
    submit: "Enviar brief",
    sending: "Enviando…",
    errors: {
      name: "Cuéntanos tu nombre.",
      email: "Ingresa tu email.",
      emailFormat: "Ese email no parece correcto.",
      message: "Cuéntanos un poco sobre el proyecto.",
      summary: "Algunos campos necesitan tu atención.",
      server: "No pudimos enviar el brief en este momento.",
      fallback: "Escríbenos directamente a",
      retry: "Inténtalo de nuevo en un momento.",
    },
    success: {
      title: "Brief recibido.",
      body: "Gracias. Lo leeremos y te escribiremos pronto.",
      again: "Enviar otro brief",
    },
  },
  cta: {
    sendBrief: "Enviar brief",
    viewProject: "Ver proyecto",
  },
  footer: {
    instagram: "Instagram",
    linkedin: "LinkedIn",
    email: "Email",
  },
};

const dictionaries: Record<Locale, Dictionary> = { en, es };

export function getDictionary(lang: Locale): Dictionary {
  return dictionaries[lang];
}
