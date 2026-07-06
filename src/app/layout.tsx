import type { Metadata } from "next";
import Link from "next/link";
import { Archivo, Inter } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { signOutAction } from "./actions";

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
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authUser = await getAuthenticatedUser(createClient());

  return (
    <html lang="fr">
      <body className={`${inter.variable} ${archivo.variable} font-sans antialiased`}>
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
            <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
              <Link
                href="/"
                className="flex items-center gap-2 text-lg font-extrabold tracking-tight"
              >
                <span>
                  Sholive<span className="text-primary-ink">.</span>
                </span>
                <span className="badge hidden sm:inline-flex">Lyon</span>
              </Link>
              <nav className="flex items-center gap-3 text-sm sm:gap-5">
                <Link
                  href="/challenges"
                  className="font-medium text-muted transition-colors hover:text-foreground"
                >
                  Challenges
                </Link>
                {authUser ? (
                  <>
                    <span className="badge">
                      {authUser.role === "merchant" ? "Compte pro" : "Compte créateur"}
                    </span>
                    <Link
                      href={
                        authUser.role === "merchant"
                          ? "/merchant/dashboard"
                          : "/creator/dashboard"
                      }
                      className="font-medium text-muted transition-colors hover:text-foreground"
                    >
                      Mon espace
                    </Link>
                    <form action={signOutAction}>
                      <button type="submit" className="btn-outline btn-sm">
                        Déconnexion
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="font-medium text-muted transition-colors hover:text-foreground"
                    >
                      Connexion
                    </Link>
                    <Link href="/register" className="btn-primary btn-sm">
                      Créer un compte
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </header>

          <div className="flex flex-1 flex-col">{children}</div>

          <footer className="border-t">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p>
                <span className="font-semibold text-foreground">Sholive</span>{" "}
                — Marketplace de compétition vidéo locale, Lyon.
              </p>
              <nav className="flex gap-4">
                <Link
                  href="/challenges"
                  className="transition-colors hover:text-foreground"
                >
                  Challenges
                </Link>
                <Link
                  href="/comment-ca-marche"
                  className="transition-colors hover:text-foreground"
                >
                  Comment ça marche
                </Link>
                <Link
                  href="/login"
                  className="transition-colors hover:text-foreground"
                >
                  Connexion
                </Link>
                <Link
                  href="/register"
                  className="transition-colors hover:text-foreground"
                >
                  Inscription
                </Link>
              </nav>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
