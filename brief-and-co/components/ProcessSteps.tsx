import type { Dictionary } from "@/content/dictionary";

type Props = { steps: Dictionary["home"]["process"]["steps"] };

/** BRIEF / PLAN / MAKE / DELIVER as four typographic chapters. */
export default function ProcessSteps({ steps }: Props) {
  return (
    <ol>
      {steps.map((step, i) => (
        <li key={step.name} className="grid process-step reveal">
          <p className="meta process-step__num">0{i + 1} /</p>
          <h3 className="process-step__name">{step.name}</h3>
          <p className="body process-step__text">{step.text}</p>
        </li>
      ))}
    </ol>
  );
}
