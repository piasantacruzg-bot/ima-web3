import { NotConfiguredAdapter } from "@/lib/integrations/social-platform-adapter";
import type { SocialPlatform } from "@/types/database";

// facebook/other aren't in the Phase 6 brief's named-provider list — kept
// as plain not-configured adapters so the registry stays total over
// every SocialPlatform value without a dedicated OAuth flow for them.
export class FacebookAdapter extends NotConfiguredAdapter {
  readonly platform: SocialPlatform = "facebook";
}

export class OtherPlatformAdapter extends NotConfiguredAdapter {
  readonly platform: SocialPlatform = "other";
}
