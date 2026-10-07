import Image from "next/image";
import type { Media } from "@/content/projects";
import type { Locale } from "@/lib/i18n";

type Props = {
  media: Media;
  lang: Locale;
  sizes?: string;
  priority?: boolean;
  bleed?: boolean;
  reveal?: boolean;
  /** Set when the image only repeats something already said in text nearby. */
  decorative?: boolean;
  className?: string;
};

const placeholderLabels = {
  result: { en: "Result", es: "Resultado" },
  process: { en: "Process", es: "Proceso" },
  portrait: { en: "Portrait", es: "Retrato" },
};

/**
 * Image or muted video with its aspect ratio reserved up front. When no file
 * has been supplied yet, shows a labelled placeholder with the intended path.
 */
export default function ProjectMedia({
  media,
  lang,
  sizes = "100vw",
  priority = false,
  bleed = false,
  reveal = true,
  decorative = false,
  className = "",
}: Props) {
  const classes = ["media", bleed && "media--bleed", reveal && "reveal-media", className]
    .filter(Boolean)
    .join(" ");
  const alt = decorative ? "" : media.alt[lang];

  if (!media.src) {
    return (
      <div
        className={`${classes} media--placeholder`}
        style={{ aspectRatio: media.ratio }}
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : alt}
        aria-hidden={decorative || undefined}
      >
        <span className="media__ph-label" aria-hidden="true">
          {lang === "es" ? "Imagen" : "Image"} / {placeholderLabels[media.world ?? "result"][lang]}
        </span>
        <span className="media__ph-path" aria-hidden="true">
          {media.placeholder}
        </span>
      </div>
    );
  }

  return (
    <div className={classes} style={{ aspectRatio: media.ratio }}>
      {media.kind === "video" ? (
        <video src={media.src} muted loop playsInline autoPlay preload="metadata" aria-label={alt || undefined} aria-hidden={decorative || undefined} />
      ) : (
        <Image src={media.src} alt={alt} fill sizes={sizes} priority={priority} />
      )}
    </div>
  );
}
