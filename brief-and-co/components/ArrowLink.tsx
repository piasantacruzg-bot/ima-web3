import Link from "next/link";

type Props = {
  href: string;
  children: React.ReactNode;
  direction?: "right" | "down";
  size?: "small" | "large";
  className?: string;
};

/** Text + arrow. The site's only button style. */
export default function ArrowLink({ href, children, direction = "right", size = "small", className = "" }: Props) {
  const classes = [
    "arrow-link",
    direction === "down" && "arrow-link--down",
    size === "large" && "arrow-link--large",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Link href={href} className={classes}>
      <span>{children}</span>
      <span className="arrow" aria-hidden="true">
        {direction === "down" ? "↓" : "→"}
      </span>
    </Link>
  );
}
