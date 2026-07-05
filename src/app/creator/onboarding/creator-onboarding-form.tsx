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
      className="btn-primary"
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
          className="input"
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

      {state.error && <p className="alert-error">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
