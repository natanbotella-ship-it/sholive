"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Barre de navigation mobile fixée en bas d'écran (pattern app TikTok/Uber
// Eats) — les créateurs consultent majoritairement depuis leur téléphone.
// Composant client uniquement pour lire le pathname (état actif) ; aucune
// donnée chargée ici, l'état de session arrive du layout en props.
type Props = {
  isAuthenticated: boolean;
  dashboardHref: string;
};

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function HomeIcon() {
  return (
    <svg {...iconProps} aria-hidden>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg {...iconProps} aria-hidden>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4v1a3 3 0 0 0 3 3" />
      <path d="M17 6h3v1a3 3 0 0 1-3 3" />
    </svg>
  );
}

function GuideIcon() {
  return (
    <svg {...iconProps} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.8.3-.9 1-.9 1.7" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg {...iconProps} aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
    </svg>
  );
}

export function MobileNav({ isAuthenticated, dashboardHref }: Props) {
  const pathname = usePathname();

  const items = [
    { href: "/", label: "Accueil", icon: <HomeIcon />, exact: true },
    { href: "/challenges", label: "Challenges", icon: <TrophyIcon />, exact: false },
    { href: "/comment-ca-marche", label: "Guide", icon: <GuideIcon />, exact: false },
    isAuthenticated
      ? { href: dashboardHref, label: "Mon espace", icon: <UserIcon />, exact: false }
      : { href: "/login", label: "Compte", icon: <UserIcon />, exact: false },
  ];

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-night-border bg-night/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors ${
                  active ? "text-night-fg" : "text-night-muted hover:text-night-fg"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                <span
                  aria-hidden
                  className={`h-1 w-1 rounded-full ${active ? "bg-primary" : "bg-transparent"}`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
