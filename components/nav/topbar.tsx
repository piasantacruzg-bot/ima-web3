import { LogOut } from "lucide-react";
import { signOut } from "@/app/(app)/actions";
import type { CurrentUser } from "@/lib/auth";
import { GlobalSearch } from "@/components/nav/global-search";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  member: "Member",
};

export function Topbar({ user }: { user: CurrentUser }) {
  const name = user.profile?.full_name || user.email || "Signed in";
  const role = user.profile ? ROLE_LABEL[user.profile.role] : null;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-paper-raised px-6">
      <GlobalSearch />
      <div className="flex items-center gap-3">
        <div className="text-right leading-tight">
          <p className="text-sm text-ink">{name}</p>
          {role ? <p className="text-xs text-ink-soft">{role}</p> : null}
        </div>
        <form action={signOut}>
          <button
            type="submit"
            title="Sign out"
            className="flex h-8 w-8 items-center justify-center rounded-sm border border-line text-ink-soft transition hover:border-ink/30 hover:text-ink"
          >
            <LogOut size={15} strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </header>
  );
}
