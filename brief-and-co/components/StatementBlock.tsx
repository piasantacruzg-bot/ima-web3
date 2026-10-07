import Lines from "@/components/Lines";
import SectionLabel from "@/components/SectionLabel";

type Props = {
  id?: string;
  label: string;
  title: string[];
  lead?: string;
  body: string[];
  close?: string;
  as?: "h1" | "h2";
};

/** Oversized statement, then a narrow text column offset to the right. */
export default function StatementBlock({ id, label, title, lead, body, close, as: Heading = "h2" }: Props) {
  return (
    <div className="grid statement">
      <SectionLabel className="statement__label reveal">{label}</SectionLabel>
      <Heading id={id} className="display-l statement__title reveal">
        <Lines lines={title} />
      </Heading>
      <div className="statement__text reveal">
        {lead && <p className="lead" style={{ marginBottom: "var(--space-6)" }}>{lead}</p>}
        {body.map((p, i) => (
          <p className="body muted" key={i}>
            {p}
          </p>
        ))}
        {close && <p className="body statement__close">{close}</p>}
      </div>
    </div>
  );
}
