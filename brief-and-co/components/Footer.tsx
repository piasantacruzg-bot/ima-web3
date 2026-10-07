import type { Dictionary } from "@/content/dictionary";
import { site } from "@/content/site";

export default function Footer({ t }: { t: Dictionary["footer"] }) {
  const links = [
    { label: t.instagram, url: site.social.instagram },
    { label: t.linkedin, url: site.social.linkedin },
    { label: t.email, url: site.email ? `mailto:${site.email}` : "" },
  ];

  return (
    <footer className="site-footer">
      <div className="wrap grid site-footer__grid">
        <div className="site-footer__brand">
          <p className="site-footer__wordmark">{site.name}</p>
          <p className="meta" style={{ marginTop: "var(--space-4)" }}>
            {site.descriptor}
            <br />
            {site.location}
          </p>
        </div>
        <div className="site-footer__links meta">
          <ul>
            {links.map((link) => (
              <li key={link.label}>
                {link.url ? (
                  <a
                    href={link.url}
                    {...(link.url.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {link.label}
                  </a>
                ) : (
                  <span>{link.label}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="site-footer__legal meta">
          <p>
            © {site.year} {site.name}
          </p>
          <p>{site.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
