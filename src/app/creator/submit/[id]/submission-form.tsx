"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { submitAction, type SubmissionState } from "./actions";

const initialState: SubmissionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? "Envoi..." : "Soumettre ma vidéo"}
    </button>
  );
}

export function SubmissionForm({ challengeId }: { challengeId: string }) {
  const [state, formAction] = useFormState(submitAction, initialState);

  if (state.success) {
    return (
      <div className="card flex flex-col items-center gap-3 p-6 text-center sm:p-8">
        <span
          aria-hidden
          className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-ink"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 13 4 4L19 7" />
          </svg>
        </span>
        <p className="font-display text-xl font-extrabold">Vidéo soumise !</p>
        <p className="text-sm text-muted">
          Tes <span className="font-semibold text-accent-ink">+10 XP</span> de
          participation seront crédités à la finalisation du challenge. Bonne
          chance pour le podium !
        </p>
        <Link href="/creator/dashboard" className="btn-primary">
          Retour à mon espace
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="challengeId" value={challengeId} />

      {/* Les liens */}
      <section className="card flex flex-col gap-4 p-5">
        <h2 className="font-display text-lg font-bold">Tes liens vidéo</h2>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tiktokUrl" className="text-sm font-medium">
            TikTok <span className="badge badge-primary ml-1">Obligatoire</span>
          </label>
          <input
            id="tiktokUrl"
            name="tiktokUrl"
            type="url"
            required
            placeholder="ex : https://www.tiktok.com/@toncompte/video/72…"
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reelsUrl" className="text-sm font-medium">
            Reels <span className="badge badge-primary ml-1">Obligatoire</span>
          </label>
          <input
            id="reelsUrl"
            name="reelsUrl"
            type="url"
            required
            placeholder="ex : https://www.instagram.com/reel/Cx…"
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="shortsUrl" className="text-sm font-medium">
            Shorts <span className="badge ml-1">Optionnel</span>
          </label>
          <input
            id="shortsUrl"
            name="shortsUrl"
            type="url"
            placeholder="ex : https://youtube.com/shorts/aB…"
            className="input"
          />
        </div>
        <p className="text-xs leading-relaxed text-muted">
          Les liens doivent être publics — le commerce les regardera avant le
          paiement des gagnants.
        </p>
      </section>

      {/* Les stats */}
      <section className="card flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-lg font-bold">Tes statistiques</h2>
          <p className="text-xs text-muted">
            Telles qu&apos;affichées sur ta vidéo au moment de la soumission.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="views" className="text-xs font-medium">
              Vues
            </label>
            <input
              id="views"
              name="views"
              type="number"
              min={0}
              required
              defaultValue={0}
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="saves" className="text-xs font-medium">
              Sauvegardes
            </label>
            <input
              id="saves"
              name="saves"
              type="number"
              min={0}
              required
              defaultValue={0}
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="likes" className="text-xs font-medium">
              J&apos;aime
            </label>
            <input
              id="likes"
              name="likes"
              type="number"
              min={0}
              required
              defaultValue={0}
              className="input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="shares" className="text-xs font-medium">
              Partages
            </label>
            <input
              id="shares"
              name="shares"
              type="number"
              min={0}
              required
              defaultValue={0}
              className="input"
            />
          </div>
        </div>
        <p className="text-xs leading-relaxed text-muted">
          Reste honnête : les classements sont vérifiés avant tout paiement, et
          un signalement du commerce bloque les gains.
        </p>
      </section>

      {state.error && <p className="alert-error">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
