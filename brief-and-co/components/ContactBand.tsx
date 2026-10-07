import ArrowLink from "@/components/ArrowLink";
import Lines from "@/components/Lines";
import SectionLabel from "@/components/SectionLabel";

type Props = { label: string; title: string[]; cta: string; ctaHref: string };

/** Closing invitation used at the bottom of content pages. */
export default function ContactBand({ label, title, cta, ctaHref }: Props) {
  return (
    <section className="section section--ink" aria-labelledby="contact-band-title">
      <div className="wrap">
        <SectionLabel className="reveal">{label}</SectionLabel>
        <div className="grid contact-band" style={{ marginTop: "var(--space-7)" }}>
          <h2 id="contact-band-title" className="display-l contact-band__title reveal">
            <Lines lines={title} />
          </h2>
          <div className="contact-band__cta reveal">
            <ArrowLink href={ctaHref} size="large">
              {cta}
            </ArrowLink>
          </div>
        </div>
      </div>
    </section>
  );
}
