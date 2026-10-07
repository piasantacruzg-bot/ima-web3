"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LanguageSwitch from "@/components/LanguageSwitch";
import type { Dictionary } from "@/content/dictionary";
import { site } from "@/content/site";
import { href, type Locale } from "@/lib/i18n";

type Props = { lang: Locale; t: Dictionary["nav"] };

export default function Header({ lang, t }: Props) {
  const pathname = usePathname() || "";
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const items = [
    { key: "work", label: t.work, path: "/work" },
    { key: "services", label: t.services, path: "/services" },
    { key: "studio", label: t.studio, path: "/studio" },
    { key: "contact", label: t.contact, path: "/contact" },
  ];

  const isCurrent = (path: string) => {
    const target = href(lang, path);
    return pathname === target || pathname.startsWith(`${target}/`);
  };

  // Close the menu whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
        return;
      }
      // Keep focus inside the open menu.
      if (e.key === "Tab" && menu.current) {
        const focusable = menu.current.querySelectorAll<HTMLElement>("a, button");
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="site-header">
      <div className="wrap site-header__bar">
        <Link href={href(lang)} className="wordmark" aria-label={t.home}>
          {/* TODO: swap for /assets/logo/brief-and-co-wordmark.svg once supplied. */}
          {site.name}
        </Link>

        <div className="nav">
          <nav aria-label="Main">
            <ul className="nav__list">
              {items.map((item) => (
                <li key={item.key}>
                  <Link
                    href={href(lang, item.path)}
                    className="nav__link"
                    aria-current={isCurrent(item.path) ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <LanguageSwitch lang={lang} label={t.language} />
        </div>

        <button
          ref={menuButton}
          type="button"
          className="menu-button"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen(true)}
        >
          {t.menu}
        </button>
      </div>

      {open && (
        <div
          ref={menu}
          id="mobile-menu"
          className="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label={t.menu}
        >
          <div className="wrap site-header__bar">
            <Link href={href(lang)} className="wordmark" aria-label={t.home}>
              {site.name}
            </Link>
            <button
              ref={closeButton}
              type="button"
              className="menu-button"
              onClick={() => {
                setOpen(false);
                menuButton.current?.focus();
              }}
            >
              {t.close}
            </button>
          </div>
          <nav className="wrap" aria-label="Main">
            <ul className="mobile-menu__list">
              {items.map((item, i) => (
                <li key={item.key}>
                  <Link
                    href={href(lang, item.path)}
                    className="mobile-menu__link"
                    aria-current={isCurrent(item.path) ? "page" : undefined}
                  >
                    <span className="meta" aria-hidden="true">
                      0{i + 1}
                    </span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="wrap mobile-menu__foot">
            <p className="meta">{site.location}</p>
            <LanguageSwitch lang={lang} label={t.language} />
          </div>
        </div>
      )}
    </header>
  );
}
