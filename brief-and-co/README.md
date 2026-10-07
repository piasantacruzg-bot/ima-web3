# Brief&Co. website

Bilingual (EN / ES) portfolio site for Brief&Co., Creative Project Management Studio.
Lima. Working worldwide.

Built from the *Website Blueprint* and *Visual Brand Guide* (v1.0, 2026).
Next.js 14 (App Router) + TypeScript + plain CSS. No UI library.

This is its own app, separate from the IMA WEB3 reporting tool at the repo root.

## Run it

```bash
cd brief-and-co
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Where to edit things

| What | File |
|---|---|
| All page copy and UI labels, EN + ES | `content/dictionary.ts` |
| Projects (case studies) | `content/projects.ts` |
| Services and capability lists | `content/services.ts` |
| Team | `content/team.ts` |
| Social links, email, domain | `content/site.ts` |
| Design tokens (color, type, spacing, motion) | top of `app/globals.css` |

### Adding a project

Add an entry to `projects` in `content/projects.ts`. It gets a route at
`/en/work/<slug>` and `/es/work/<slug>` automatically, appears on the home page
and the Work index, and joins the "Next project" loop.

Case-study chapters (`brief`, `approach`, `work`, `result`) are `null` until the
real text exists. While `null`, the page shows a quiet "Case study text in
preparation." line. Don't fill them with invented results or metrics.

### Adding images

Drop files in `public/assets/...` and set `src` on the matching media entry,
e.g. `src: "/assets/projects/capital-nocturno/cover.jpg"`. Until then each slot
renders a labelled placeholder showing the path it expects. Video works too:
set `kind: "video"` (it plays muted and looped).

Expected paths:

```
/assets/logo/brief-and-co-wordmark.*
/assets/team/maria-pia.*
/assets/team/fabiana-corrales.*
/assets/projects/capital-nocturno/*
/assets/projects/etmc-mexico/*
```

## Contact form

Briefs are POSTed as JSON to `CONTACT_WEBHOOK_URL` (see `.env.example`).
Formspree, Make, Zapier or your own endpoint all work. If it isn't set, the
form shows an honest error instead of pretending the brief went through.

## Language

- Routes are `/en/...` and `/es/...`. `/` redirects to the saved language
  (cookie), then the browser language, then English.
- The EN / ES switch keeps you on the same page and remembers the choice.
- `<html lang>`, titles, descriptions and hreflang alternates are set per language.

## Still to do (needs real info from the studio)

- [ ] Wordmark file (the header currently sets "Brief&Co." in Inter)
- [ ] Project photography and video
- [ ] Team portraits
- [ ] Case-study text for both projects
- [ ] Instagram, LinkedIn and email in `content/site.ts`
- [ ] Production domain in `content/site.ts`
- [ ] `CONTACT_WEBHOOK_URL`
- [ ] Budget ranges / currency in the contact form (`content/dictionary.ts`)
- [ ] Licensed grotesk (Neue Montreal / Söhne / Suisse) if available, in place of Inter
