import ArrowLink from "@/components/ArrowLink";
import Lines from "@/components/Lines";
import SectionLabel from "@/components/SectionLabel";
import type { Dictionary } from "@/content/dictionary";
import { site } from "@/content/site";

type Props = { t: Dictionary["home"]["hero"]; descriptor: string; ctaHref: string };

export default function Hero({ t, descriptor, ctaHref }: Props) {
  return (
    <section className="wrap hero" aria-labelledby="hero-title">
      <div>
        <SectionLabel className="reveal">{t.label}</SectionLabel>
        <h1 id="hero-title" className="display-xl hero__title reveal">
          <Lines lines={t.lines} />
        </h1>
      </div>
      <div className="grid hero__foot">
        <p className="hero__descriptor reveal">{descriptor}</p>
        <p className="meta hero__location reveal">{site.location}</p>
        <div className="hero__cta reveal">
          <ArrowLink href={ctaHref} direction="down">
            {t.cta}
          </ArrowLink>
        </div>
      </div>
    </section>
  );
}
