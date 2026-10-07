"use client";

import { useRef, useState } from "react";
import type { Dictionary } from "@/content/dictionary";
import { site } from "@/content/site";
import { validateBrief, type BriefErrors, type BriefInput } from "@/lib/contact";
import type { Locale } from "@/lib/i18n";

type Props = { t: Dictionary["contact"]; lang: Locale };
type Status = "idle" | "sending" | "sent" | "error";

const empty: BriefInput = { name: "", company: "", email: "", type: "", message: "", budget: "", timeline: "" };

export default function ContactForm({ t, lang }: Props) {
  const [values, setValues] = useState<BriefInput>(empty);
  const [errors, setErrors] = useState<BriefErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  function update<K extends keyof BriefInput>(key: K, value: string) {
    const next = { ...values, [key]: value };
    setValues(next);
    // After a first submit attempt, re-check as the visitor fixes things.
    if (submitted) setErrors(validateBrief(next));
  }

  function errorText(field: keyof BriefErrors) {
    const e = errors[field];
    if (!e) return null;
    if (field === "email" && e === "format") return t.errors.emailFormat;
    return t.errors[field];
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    const found = validateBrief(values);
    setErrors(found);
    if (Object.keys(found).length) {
      const first = (["name", "email", "message"] as const).find((f) => found[f]);
      formRef.current?.querySelector<HTMLElement>(`#brief-${first}`)?.focus();
      return;
    }

    setStatus("sending");
    const honeypot = (formRef.current?.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, lang, website: honeypot }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("sent");
      setValues(empty);
      setSubmitted(false);
      requestAnimationFrame(() => successRef.current?.focus());
    } catch {
      setStatus("error");
      requestAnimationFrame(() => alertRef.current?.focus());
    }
  }

  if (status === "sent") {
    return (
      <div className="form__success" ref={successRef} tabIndex={-1} role="status">
        <p className="heading">{t.success.title}</p>
        <p className="body muted" style={{ marginTop: "var(--space-4)" }}>
          {t.success.body}
        </p>
        <button
          type="button"
          className="arrow-link form__submit"
          style={{ marginTop: "var(--space-6)" }}
          onClick={() => setStatus("idle")}
        >
          <span>{t.success.again}</span>
          <span className="arrow" aria-hidden="true">
            →
          </span>
        </button>
      </div>
    );
  }

  const hasErrors = submitted && Object.keys(errors).length > 0;

  return (
    <form ref={formRef} className="form" noValidate onSubmit={onSubmit} aria-describedby={hasErrors ? "brief-summary" : undefined}>
      {hasErrors && (
        <p id="brief-summary" className="meta" role="alert" style={{ color: "#9b1c1c" }}>
          {t.errors.summary}
        </p>
      )}
      {status === "error" && (
        <div className="form__alert" ref={alertRef} tabIndex={-1} role="alert">
          <p className="body">{t.errors.server}</p>
          <p className="body muted">
            {site.email ? (
              <>
                {t.errors.fallback}{" "}
                <a className="text-link" href={`mailto:${site.email}`}>
                  {site.email}
                </a>
                .
              </>
            ) : (
              t.errors.retry
            )}
          </p>
        </div>
      )}

      <div className="form__pair">
        <Field id="name" label={t.fields.name} error={errorText("name")}>
          <input
            id="brief-name"
            className="field__control"
            type="text"
            autoComplete="name"
            required
            aria-required="true"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "brief-name-error" : undefined}
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </Field>
        <Field id="company" label={t.fields.company} optional={t.optional}>
          <input
            id="brief-company"
            className="field__control"
            type="text"
            autoComplete="organization"
            value={values.company}
            onChange={(e) => update("company", e.target.value)}
          />
        </Field>
      </div>

      <Field id="email" label={t.fields.email} error={errorText("email")}>
        <input
          id="brief-email"
          className="field__control"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "brief-email-error" : undefined}
          value={values.email}
          onChange={(e) => update("email", e.target.value)}
        />
      </Field>

      <Field id="type" label={t.fields.type} optional={t.optional}>
        <select id="brief-type" className="field__control" value={values.type} onChange={(e) => update("type", e.target.value)}>
          <option value="">{t.choose}</option>
          {t.types.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </Field>

      <Field id="message" label={t.fields.message} error={errorText("message")}>
        <textarea
          id="brief-message"
          className="field__control"
          rows={5}
          required
          aria-required="true"
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "brief-message-error" : undefined}
          value={values.message}
          onChange={(e) => update("message", e.target.value)}
        />
      </Field>

      <div className="form__pair">
        <Field id="budget" label={t.fields.budget} optional={t.optional}>
          <select id="brief-budget" className="field__control" value={values.budget} onChange={(e) => update("budget", e.target.value)}>
            <option value="">{t.choose}</option>
            {t.budgets.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
        <Field id="timeline" label={t.fields.timeline} optional={t.optional}>
          <input
            id="brief-timeline"
            className="field__control"
            type="text"
            placeholder={t.timelinePlaceholder}
            value={values.timeline}
            onChange={(e) => update("timeline", e.target.value)}
          />
        </Field>
      </div>

      {/* Spam trap, hidden from people and assistive tech. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="brief-website">Website</label>
        <input id="brief-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <button type="submit" className="arrow-link arrow-link--large form__submit" disabled={status === "sending"}>
        <span>{status === "sending" ? t.sending : t.submit}</span>
        <span className="arrow" aria-hidden="true">
          →
        </span>
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  optional,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="field" data-invalid={!!error}>
      <label className="field__label" htmlFor={`brief-${id}`}>
        <span>{label}</span>
        {optional && <span className="field__optional">{optional}</span>}
      </label>
      {children}
      {error && (
        <p id={`brief-${id}-error`} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}
