"use client";

import { useFormState, useFormStatus } from "react-dom";
import { forgotPasswordAction, type ForgotPasswordState } from "./actions";

const initialState: ForgotPasswordState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? "Envoi..." : "Envoyer le lien"}
    </button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useFormState(
    forgotPasswordAction,
    initialState,
  );

  if (state.success) {
    return (
      <p className="text-sm leading-relaxed text-muted">
        Si un compte existe avec cette adresse, un email vient d&apos;être
        envoyé avec un lien pour réinitialiser ton mot de passe. Pense à
        vérifier tes spams.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="camille@exemple.fr"
          className="input"
        />
      </div>

      {state.error && <p className="alert-error">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
