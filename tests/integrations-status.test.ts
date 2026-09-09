import { describe, it, expect } from "vitest";
import { summarizePlatformStatus, type AccountStatusInput } from "@/lib/integrations-status";

function account(overrides: Partial<AccountStatusInput> = {}): AccountStatusInput {
  return { oauth_status: "not_connected", sync_status: "never_synced", ...overrides };
}

describe("summarizePlatformStatus", () => {
  it("is not_connected when there are no accounts for the platform at all", () => {
    expect(summarizePlatformStatus([])).toBe("not_connected");
  });

  it("is connected when every account is healthy and connected", () => {
    expect(summarizePlatformStatus([account({ oauth_status: "connected", sync_status: "synced" })])).toBe("connected");
  });

  it("is partial when some accounts are connected and others aren't", () => {
    const accounts = [account({ oauth_status: "connected", sync_status: "synced" }), account({ oauth_status: "not_connected" })];
    expect(summarizePlatformStatus(accounts)).toBe("partial");
  });

  it("is needs_reauth when an account has expired or been revoked, with none healthy", () => {
    expect(summarizePlatformStatus([account({ oauth_status: "expired" })])).toBe("needs_reauth");
    expect(summarizePlatformStatus([account({ oauth_status: "revoked" })])).toBe("needs_reauth");
  });

  it("is error when an account is erroring (oauth or sync), with none healthy or needing reauth", () => {
    expect(summarizePlatformStatus([account({ oauth_status: "error" })])).toBe("error");
    expect(summarizePlatformStatus([account({ oauth_status: "connected", sync_status: "error" })])).toBe("error");
  });

  it("treats a connected account with a failing sync as not fully healthy", () => {
    const accounts = [account({ oauth_status: "connected", sync_status: "error" }), account({ oauth_status: "connected", sync_status: "synced" })];
    expect(summarizePlatformStatus(accounts)).toBe("partial");
  });
});
