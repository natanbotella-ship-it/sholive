import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export default async function CreatorProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: creatorProfile } = await supabase
    .from("creator_profiles")
    .select("username, avatar_url")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!creatorProfile) {
    redirect("/creator/onboarding");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              Mon profil
            </h1>
            <p className="text-sm text-muted">
              Ton nom et ton avatar apparaissent sur les classements et ta page
              publique.
            </p>
          </div>
          <ProfileForm
            currentUsername={creatorProfile.username}
            currentAvatarUrl={creatorProfile.avatar_url}
          />
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          <Link href="/creator/dashboard" className="link">
            Retour à mon espace
          </Link>
        </p>
      </div>
    </main>
  );
}
