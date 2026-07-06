"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitAction, type SubmissionState } from "./actions";

const initialState: SubmissionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary"
    >
      {pending ? "Envoi..." : "Soumettre ma vidéo"}
    </button>
  );
}

export function SubmissionForm({ challengeId }: { challengeId: string }) {
  const [state, formAction] = useFormState(submitAction, initialState);

  if (state.success) {
    return (
      <p className="text-sm">
        Soumission envoyée ! Tes +10 XP de participation seront crédités
        lorsque le challenge sera finalisé.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="challengeId" value={challengeId} />

      <div className="flex flex-col gap-1">
        <label htmlFor="tiktokUrl" className="text-sm font-medium">
          Lien TikTok
        </label>
        <input
          id="tiktokUrl"
          name="tiktokUrl"
          type="url"
          required
          placeholder="https://www.tiktok.com/@..."
          className="input"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="reelsUrl" className="text-sm font-medium">
          Lien Reels
        </label>
        <input
          id="reelsUrl"
          name="reelsUrl"
          type="url"
          required
          placeholder="https://www.instagram.com/reel/..."
          className="input"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="shortsUrl" className="text-sm font-medium">
          Lien Shorts (optionnel)
        </label>
        <input
          id="shortsUrl"
          name="shortsUrl"
          type="url"
          placeholder="https://youtube.com/shorts/..."
          className="input"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Stats déclarées</legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="views" className="text-xs">
              Vues
            </label>
            <input
              id="views"
              name="views"
              type="number"
              min={0}
              required
              defaultValue={0}
              className="input px-2 py-1"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="saves" className="text-xs">
              Saves
            </label>
            <input
              id="saves"
              name="saves"
              type="number"
              min={0}
              required
              defaultValue={0}
              className="input px-2 py-1"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="likes" className="text-xs">
              Likes
            </label>
            <input
              id="likes"
              name="likes"
              type="number"
              min={0}
              required
              defaultValue={0}
              className="input px-2 py-1"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="shares" className="text-xs">
              Partages
            </label>
            <input
              id="shares"
              name="shares"
              type="number"
              min={0}
              required
              defaultValue={0}
              className="input px-2 py-1"
            />
          </div>
        </div>
      </fieldset>

      {state.error && <p className="alert-error">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
