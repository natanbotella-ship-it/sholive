import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // "/creator/" (avec le slash) evite de matcher par erreur "/creators/[username]"
  // (page publique du Bloc 16) : "/creators".startsWith("/creator") vaut aussi true.
  const isCreatorRoute = pathname.startsWith("/creator/");
  const isMerchantRoute = pathname.startsWith("/merchant/");

  if (isCreatorRoute || isMerchantRoute) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // user_metadata.role sert ici de simple aiguillage UX (vers quelle section
    // rediriger) : il est forgeable par l'utilisateur, mais un rôle falsifié ne
    // donne accès à aucune donnée (RLS) ni aucune mutation (les Server Actions
    // revérifient le rôle contre profiles.role, cf. src/lib/auth.ts).
    const role = user.user_metadata?.role;

    if (role !== "creator" && role !== "merchant") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (isCreatorRoute && role !== "creator") {
      return NextResponse.redirect(new URL("/merchant/dashboard", request.url));
    }
    if (isMerchantRoute && role !== "merchant") {
      return NextResponse.redirect(new URL("/creator/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
