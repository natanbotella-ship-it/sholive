import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Sholive",
  description: "Marketplace de compétition vidéo locale — Lyon",
};

// Header/footer volontairement statiques (aucune lecture de session ni requête DB) :
// "Mon espace" pointe vers /creator/dashboard et laisse le middleware router — un
// merchant y est redirigé vers /merchant/dashboard, un visiteur vers /login.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} font-sans antialiased`}>
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
                <Link
                  href="/creator/dashboard"
                  className="font-medium text-muted transition-colors hover:text-foreground"
                >
                  Mon espace
                </Link>
                <Link href="/register" className="btn-primary btn-sm">
                  Créer un compte
                </Link>
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
