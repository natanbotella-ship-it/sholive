import { RegisterForm } from "./register-form";

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { role?: string };
}) {
  const initialRole = searchParams.role === "merchant" ? "merchant" : "creator";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold text-primary">Créer un compte</h1>
      <RegisterForm initialRole={initialRole} />
    </main>
  );
}
