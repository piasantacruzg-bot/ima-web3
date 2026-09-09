import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildNotificationEmailContent, isEmailConfigured } from "@/lib/notifications/email";

describe("buildNotificationEmailContent", () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  it("uses the title as the subject", () => {
    const content = buildNotificationEmailContent("Deliverable overdue", null);
    expect(content.subject).toBe("Deliverable overdue");
  });

  it("includes the body when present, omits it when null", () => {
    const withBody = buildNotificationEmailContent("Metrics needed", "Sofia — Reel on instagram");
    expect(withBody.html).toContain("Sofia — Reel on instagram");
    expect(withBody.text).toContain("Sofia — Reel on instagram");

    const withoutBody = buildNotificationEmailContent("Metrics needed", null);
    expect(withoutBody.html).not.toContain("<p>null</p>");
    expect(withoutBody.text.trim()).toBe("Metrics needed");
  });

  it("escapes HTML in the title/body so a title can't inject markup", () => {
    const content = buildNotificationEmailContent("<script>alert(1)</script>", "safe & sound");
    expect(content.html).not.toContain("<script>");
    expect(content.html).toContain("&lt;script&gt;");
    expect(content.html).toContain("safe &amp; sound");
  });

  it("adds a link only when NEXT_PUBLIC_APP_URL is set", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const withoutUrl = buildNotificationEmailContent("Title", null);
    expect(withoutUrl.html).not.toContain("<a href");
    expect(withoutUrl.text).toBe("Title");

    process.env.NEXT_PUBLIC_APP_URL = "https://example.vercel.app";
    const withUrl = buildNotificationEmailContent("Title", null);
    expect(withUrl.html).toContain("https://example.vercel.app");
    expect(withUrl.text).toContain("https://example.vercel.app");
  });
});

describe("isEmailConfigured", () => {
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.NOTIFICATION_EMAIL_FROM;

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.NOTIFICATION_EMAIL_FROM;
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.NOTIFICATION_EMAIL_FROM;
    else process.env.NOTIFICATION_EMAIL_FROM = originalFrom;
  });

  it("is false when neither env var is set", () => {
    expect(isEmailConfigured()).toBe(false);
  });

  it("is false when only one of the two env vars is set", () => {
    process.env.RESEND_API_KEY = "re_test";
    expect(isEmailConfigured()).toBe(false);
  });

  it("is true only when both env vars are set", () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.NOTIFICATION_EMAIL_FROM = "notifications@example.com";
    expect(isEmailConfigured()).toBe(true);
  });
});
