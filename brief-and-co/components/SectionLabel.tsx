type Props = { children: React.ReactNode; className?: string; as?: "p" | "span" };

/** Small mono label, e.g. THE STUDIO / 01. */
export default function SectionLabel({ children, className = "", as: Tag = "p" }: Props) {
  return <Tag className={`meta ${className}`.trim()}>{children}</Tag>;
}
