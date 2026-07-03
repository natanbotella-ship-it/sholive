import Link from "next/link";

export default function MerchantDashboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2">
      <h1 className="text-2xl font-bold text-primary">Espace pro</h1>
      <p className="text-sm text-foreground/60">
        Placeholder — vrai dashboard au Bloc 12
      </p>
      <Link href="/merchant/onboarding" className="text-sm text-primary underline">
        Compléter mon profil pro
      </Link>
      <Link href="/merchant/challenges/new" className="text-sm text-primary underline">
        Créer un challenge
      </Link>
    </main>
  );
}
