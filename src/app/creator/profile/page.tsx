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
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold text-primary">Mon profil</h1>
      <ProfileForm
        currentUsername={creatorProfile.username}
        currentAvatarUrl={creatorProfile.avatar_url}
      />
    </main>
  );
}
