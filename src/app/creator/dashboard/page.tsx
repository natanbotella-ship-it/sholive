import Link from "next/link";

export default function CreatorDashboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2">
      <h1 className="text-2xl font-bold text-primary">Espace créateur</h1>
      <p className="text-sm text-foreground/60">
        Placeholder — vrai dashboard au Bloc 17
      </p>
      <Link href="/creator/onboarding" className="text-sm text-primary underline">
        Compléter mon profil créateur
      </Link>
    </main>
  );
}
