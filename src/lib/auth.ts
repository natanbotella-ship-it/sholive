import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";

export type AuthenticatedUser = {
  user: User;
  role: "creator" | "merchant";
};

// Le rôle qui fait autorité est profiles.role, écrit par le trigger DB
// handle_new_user à l'inscription et plus jamais modifiable (aucune policy
// UPDATE sur profiles). user_metadata est modifiable par l'utilisateur
// lui-même via supabase.auth.updateUser({ data: { role: ... } }) : il ne doit
// JAMAIS servir de contrôle d'autorisation côté serveur — tout au plus
// d'indice de routing UI (middleware, redirections post-login).
export async function getAuthenticatedUser(
  supabase: ReturnType<typeof createClient>,
): Promise<AuthenticatedUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "creator" && profile?.role !== "merchant") {
    return null;
  }

  return { user, role: profile.role };
}
