"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  completeCreatorProfileAction,
  type CreatorOnboardingState,
} from "./actions";

const initialState: CreatorOnboardingState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
    >
      {pending ? "Enregistrement..." : "Valider"}
    </button>
  );
}

export function CreatorOnboardingForm() {
  const [state, formAction] = useFormState(
    completeCreatorProfileAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="username" className="text-sm font-medium">
          Nom d&apos;utilisateur
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          minLength={3}
          maxLength={20}
          pattern="[a-z0-9_]+"
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="avatar" className="text-sm font-medium">
          Avatar (optionnel)
        </label>
        <input
          id="avatar"
          name="avatar"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="text-sm"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
