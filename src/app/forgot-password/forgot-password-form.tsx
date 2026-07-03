"use client";

import { useFormState, useFormStatus } from "react-dom";
import { forgotPasswordAction, type ForgotPasswordState } from "./actions";

const initialState: ForgotPasswordState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
    >
      {pending ? "Envoi..." : "Envoyer le lien de réinitialisation"}
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
      <p className="max-w-sm text-sm">
        Si un compte existe avec cette adresse, un email vient d&apos;être
        envoyé avec un lien pour réinitialiser ton mot de passe.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
