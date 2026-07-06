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
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? "Enregistrement..." : "C'est parti"}
    </button>
  );
}

export function CreatorOnboardingForm() {
  const [state, formAction] = useFormState(
    completeCreatorProfileAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1.5">
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
          pattern="[a-zA-Z0-9_]+"
          placeholder="ex : lisa_lyon"
          className="input"
        />
        <p className="text-xs text-muted">
          3 à 20 caractères — lettres, chiffres et underscore. Les majuscules
          seront converties en minuscules.
        </p>
      </div>

      {state.error && <p className="alert-error">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
