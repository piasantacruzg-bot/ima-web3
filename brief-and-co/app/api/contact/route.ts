import { NextResponse } from "next/server";
import { validateBrief, type BriefInput } from "@/lib/contact";

const MAX = 5000;

function clean(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, MAX) : "";
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // Honeypot: real visitors never fill this hidden field.
  if (clean(body.website)) return NextResponse.json({ ok: true });

  const brief: BriefInput = {
    name: clean(body.name),
    company: clean(body.company),
    email: clean(body.email),
    type: clean(body.type),
    message: clean(body.message),
    budget: clean(body.budget),
    timeline: clean(body.timeline),
  };

  const errors = validateBrief(brief);
  if (Object.keys(errors).length) {
    return NextResponse.json({ ok: false, error: "validation", fields: errors }, { status: 422 });
  }

  // TODO: connect delivery. Set CONTACT_WEBHOOK_URL to any endpoint that
  // accepts a JSON POST (Formspree, Make, Zapier, your own service...).
  const webhook = process.env.CONTACT_WEBHOOK_URL;
  if (!webhook) {
    console.warn("[contact] CONTACT_WEBHOOK_URL is not set; brief was not delivered.");
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ ...brief, lang: clean(body.lang), receivedAt: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
  } catch (err) {
    console.error("[contact] delivery failed", err);
    return NextResponse.json({ ok: false, error: "delivery_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
