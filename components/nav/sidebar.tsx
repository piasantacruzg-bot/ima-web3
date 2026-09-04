"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Link2,
  BarChart3,
  Upload,
  Settings,
  Plug,
} from "lucide-react";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/creators", label: "Creators", icon: Users },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/content", label: "Content Tracker", icon: Link2 },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/imports", label: "Imports", icon: Upload },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/integrations", label: "Integrations", icon: Plug },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-60 shrink-0 flex-col border-r border-line bg-paper-raised px-3 py-5">
      <div className="mb-6 px-2">
        <p className="font-serif text-lg leading-tight tracking-tight text-ink">
          Creator Campaign OS
        </p>
      </div>
      <ul className="flex flex-1 flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={clsx(
                  "flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm transition",
                  isActive
                    ? "bg-ink text-paper-raised"
                    : "text-ink-soft hover:bg-line-soft hover:text-ink"
                )}
              >
                <Icon size={16} strokeWidth={1.75} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
