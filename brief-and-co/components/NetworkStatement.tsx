import SectionLabel from "@/components/SectionLabel";
import type { Dictionary } from "@/content/dictionary";

export default function NetworkStatement({ t }: { t: Dictionary["studio"]["network"] }) {
  return (
    <div className="grid network">
      <SectionLabel className="reveal">{t.label}</SectionLabel>
      <h2 className="display-l network__title reveal">{t.title}</h2>
      <div className="network__text reveal">
        {t.body.map((p, i) => (
          <p className={i === 0 ? "lead" : "body muted"} key={i} style={i === 0 ? { marginBottom: "var(--space-5)" } : undefined}>
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}
