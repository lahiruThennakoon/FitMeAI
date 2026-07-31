"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  match: (pathname: string) => boolean;
  icon: (active: boolean) => ReactNode;
};

const MORE_ROUTES = ["/fasting", "/glucose", "/progress", "/goals", "/settings"];

const MORE_LINKS = [
  { href: "/fasting", label: "Fasting timer" },
  { href: "/glucose", label: "Log glucose" },
  { href: "/progress", label: "Progress charts" },
  { href: "/goals", label: "Profile & targets" },
  { href: "/settings", label: "Settings" },
] as const;

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="m3 10.5 9-7 9 7" />
      <path d="M5 9.5V20h14V9.5" />
    </svg>
  );
}

function LogFoodIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v8a5 5 0 0 0 5 5v0a5 5 0 0 0 5-5V2" />
    </svg>
  );
}

function ExerciseIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M6.5 8.5 3 12l3.5 3.5" />
      <path d="M17.5 8.5 21 12l-3.5 3.5" />
      <path d="M9 12h6" />
    </svg>
  );
}

function MoreIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <circle cx="6" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="18" cy="12" r="1.5" />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    shortLabel: "Home",
    match: (pathname) => pathname === "/dashboard",
    icon: (active) => <HomeIcon active={active} />,
  },
  {
    href: "/log",
    label: "Log food",
    shortLabel: "Log",
    match: (pathname) => pathname.startsWith("/log"),
    icon: (active) => <LogFoodIcon active={active} />,
  },
  {
    href: "/exercise",
    label: "Log exercise",
    shortLabel: "Exercise",
    match: (pathname) => pathname.startsWith("/exercise"),
    icon: (active) => <ExerciseIcon active={active} />,
  },
];

function isMoreRoute(pathname: string) {
  return MORE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function AppQuickNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreActive = isMoreRoute(pathname);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMoreOpen(false);
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (moreRef.current?.contains(target)) return;
      setMoreOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [moreOpen]);

  return (
    <nav
      className="app-quick-nav"
      aria-label="Quick actions"
      data-testid="app-quick-nav"
    >
      <div className="app-quick-nav-inner">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname) && !moreOpen;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "app-quick-nav-item app-quick-nav-item--active"
                  : "app-quick-nav-item"
              }
            >
              {item.icon(active)}
              <span>{item.shortLabel}</span>
            </Link>
          );
        })}

        <div className="relative" ref={moreRef}>
          {moreOpen ? (
            <div className="app-quick-nav-more-menu" role="menu">
              {MORE_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  className="app-quick-nav-more-link"
                  onClick={() => setMoreOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            aria-current={moreActive ? "page" : undefined}
            onClick={() => setMoreOpen((open) => !open)}
            className={
              moreActive || moreOpen
                ? "app-quick-nav-item app-quick-nav-item--active"
                : "app-quick-nav-item"
            }
          >
            <MoreIcon active={moreActive || moreOpen} />
            <span>More</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
