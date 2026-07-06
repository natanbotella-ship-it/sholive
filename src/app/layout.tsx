import type { Metadata } from "next";
import Link from "next/link";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { signOutAction } from "./actions";
import { MobileNav } from "@/components/mobile-nav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// Display "affiche" pour les titres (identité Nuit des Lumières) — police
// variable, servie par next/font, aucune dépendance npm ajoutée.
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  title: "Sholive",
  description: "Marketplace de compétition vidéo locale — Lyon",
};

// Header lit la session (getAuthenticatedUser, jamais user_metadata — cf. lib/auth)
// pour afficher clairement le statut de connexion et le rôle : avant le 2026-07-06,
// le header était volontairement statique ("Mon espace" pointait toujours vers
// /creator/dashboard et laissait le middleware router) — source de confusion en test
// manuel (impossible de savoir si on est connecté, et en tant que quoi), et aucun
// moyen de se déconnecter n'existait sur le site.
//
// Refonte 2026-07-07 : header/footer en encre nuit (identité Nuit des Lumières),
// navigation mobile déportée dans une barre d'onglets fixée en bas d'écran
// (MobileNav) — sur mobile le header ne garde que logo + action de compte.
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authUser = await getAuthenticatedUser(createClient());
  const dashboardHref =
    authUser?.role === "merchant" ? "/merchant/dashboard" : "/creator/dashboard";

  return (
    <html lang="fr">
      <body className={`${inter.variable} ${archivo.variable} font-sans antialiased`}>
        {/* pb mobile : laisse la place à la barre d'onglets fixe en bas d'écran */}
        <div className="flex min-h-screen flex-col pb-16 sm:pb-0">
          <header className="sticky top-0 z-40 border-b border-night-border bg-night/95 text-night-fg backdrop-blur">
            <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
              <Link
                href="/"
                className="flex shrink-0 items-center gap-2 font-display text-lg font-extrabold tracking-tight"
              >
                <span>
                  Sholive<span className="text-primary">.</span>
                </span>
                <span className="hidden rounded-full border border-night-border bg-night-surface px-2.5 py-0.5 text-xs font-semibold text-night-muted md:inline-flex">
                  Lyon
                </span>
              </Link>
              <nav className="flex items-center gap-3 text-sm sm:gap-5">
                <Link
                  href="/challenges"
                  className="hidden font-medium text-night-muted transition-colors hover:text-night-fg sm:inline"
                >
                  Challenges
                </Link>
                <Link
                  href="/comment-ca-marche"
                  className="hidden font-medium text-night-muted transition-colors hover:text-night-fg sm:inline"
                >
                  Comment ça marche
                </Link>
                {authUser ? (
                  <>
                    <span className="hidden rounded-full border border-night-border bg-night-surface px-2.5 py-0.5 text-xs font-semibold text-night-muted sm:inline-flex">
                      {authUser.role === "merchant" ? "Compte pro" : "Compte créateur"}
                    </span>
                    <Link
                      href={dashboardHref}
                      className="hidden font-medium text-night-muted transition-colors hover:text-night-fg sm:inline"
                    >
                      Mon espace
                    </Link>
                    <form action={signOutAction}>
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-xl border border-night-border px-3 py-1.5 text-sm font-semibold text-night-fg transition-colors hover:bg-night-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        Déconnexion
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="hidden font-medium text-night-muted transition-colors hover:text-night-fg sm:inline"
                    >
                      Connexion
                    </Link>
                    <Link href="/register" className="btn-primary btn-sm shrink-0">
                      Créer un compte
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </header>

          <div className="flex flex-1 flex-col">{children}</div>

          <footer className="section-night border-t border-night-border">
            <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
              <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-sm space-y-2">
                  <p className="font-display text-lg font-extrabold tracking-tight">
                    Sholive<span className="text-primary">.</span>
                  </p>
                  <p className="text-sm text-night-muted">
                    La compétition vidéo des commerces lyonnais. Les pros lancent un
                    challenge avec une cagnotte, les créateurs font le show, les
                    meilleures vidéos remportent la mise.
                  </p>
                </div>
                <div className="flex gap-12 text-sm">
                  <nav aria-label="Découvrir" className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-night-muted">
                      Découvrir
                    </p>
                    <ul className="space-y-1.5">
                      <li>
                        <Link href="/challenges" className="transition-colors hover:text-night-fg text-night-muted">
                          Challenges
                        </Link>
                      </li>
                      <li>
                        <Link href="/comment-ca-marche" className="transition-colors hover:text-night-fg text-night-muted">
                          Comment ça marche
                        </Link>
                      </li>
                    </ul>
                  </nav>
                  <nav aria-label="Compte" className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-night-muted">
                      Compte
                    </p>
                    <ul className="space-y-1.5">
                      <li>
                        <Link href="/login" className="transition-colors hover:text-night-fg text-night-muted">
                          Connexion
                        </Link>
                      </li>
                      <li>
                        <Link href="/register" className="transition-colors hover:text-night-fg text-night-muted">
                          Créer un compte
                        </Link>
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>
              <p className="mt-8 border-t border-night-border pt-4 text-xs text-night-muted">
                Fait à Lyon. © 2026 Sholive — marketplace de compétition vidéo locale.
              </p>
            </div>
          </footer>
        </div>

        <MobileNav isAuthenticated={authUser !== null} dashboardHref={dashboardHref} />
      </body>
    </html>
  );
}
