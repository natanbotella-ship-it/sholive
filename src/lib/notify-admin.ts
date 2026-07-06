// Alerte Natan par email sur les incidents argent (Transfer échoué, challenge
// remboursé, webhook en erreur) — pre-mortem 2026-07-06 : avant ce fichier, un
// `transfer.failed` ou une exception dans un webhook n'étaient visibles nulle
// part, CLAUDE.md exigeant pourtant de les "surfacer clairement à Natan".
//
// Appel HTTP direct à l'API Resend (fetch, pas de SDK) pour ne pas ajouter de
// dépendance npm à un projet qui n'en a pas besoin ailleurs. No-op silencieux
// (juste un console.error, capté par les logs Vercel) si RESEND_API_KEY /
// ADMIN_NOTIFICATION_EMAIL ne sont pas configurées — variables nouvelles,
// documentées dans .env.local.example, à renseigner avant le lancement.
export async function notifyAdmin(subject: string, body: string): Promise<void> {
  console.error(`[notify-admin] ${subject}: ${body}`);

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;

  if (!apiKey || !to) {
    return;
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.ADMIN_NOTIFICATION_FROM || "Sholive <onboarding@resend.dev>",
        to,
        subject: `[Sholive] ${subject}`,
        text: body,
      }),
    });
  } catch (error) {
    // Ne jamais laisser un échec d'envoi d'email faire échouer le flux appelant
    // (webhook Stripe, cron) — l'incident est déjà loggé ci-dessus.
    console.error("[notify-admin] échec de l'envoi de la notification", error);
  }
}
