"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updatePasswordAction, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary"
    >
      {pending ? "Mise à jour..." : "Mettre à jour le mot de passe"}
    </button>
  );
}

export function ResetPasswordForm() {
  const [state, formAction] = useFormState(updatePasswordAction, initialState);

  if (state.success) {
    return (
      <p className="max-w-sm text-sm">
        Mot de passe mis à jour. Tu peux maintenant{" "}
        <a href="/login" className="link">
          te connecter
        </a>
        .
      </p>
    );
  }

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Nouveau mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="input"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirmer le mot de passe
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          className="input"
        />
      </div>

      {state.error && <p className="alert-error">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
