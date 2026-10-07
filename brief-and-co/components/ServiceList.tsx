import type { Service } from "@/content/services";
import type { Locale } from "@/lib/i18n";

type Props = { services: Service[]; lang: Locale; detailed?: boolean };

export default function ServiceList({ services, lang, detailed = false }: Props) {
  return (
    <ol className="service-list">
      {services.map((s) => (
        <li key={s.id} id={s.id} className="grid service-row reveal">
          <p className="meta service-row__num">{s.number} /</p>
          <h3 className="service-row__name">{s.name}</h3>
          <div className="service-row__text">
            <p className="body">{s.summary[lang]}</p>
            {detailed && (
              <ul className="meta service-row__caps" aria-label={s.name}>
                {s.capabilities[lang].map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
