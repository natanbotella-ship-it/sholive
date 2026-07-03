"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { registerAction, type RegisterState } from "./actions";

const initialState: RegisterState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
    >
      {pending ? "Création..." : "Créer mon compte"}
    </button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useFormState(registerAction, initialState);
  const [role, setRole] = useState<"creator" | "merchant">("creator");

  if (state.success) {
    return (
      <p className="max-w-sm text-sm">
        {state.emailConfirmationRequired
          ? "Compte créé. Vérifie tes emails pour confirmer ton inscription avant de te connecter."
          : "Compte créé avec succès."}
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

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-medium">Je suis</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="role"
              value="creator"
              checked={role === "creator"}
              onChange={() => setRole("creator")}
            />
            Créateur
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="role"
              value="merchant"
              checked={role === "merchant"}
              onChange={() => setRole("merchant")}
            />
            Pro (commerçant)
          </label>
        </div>
      </fieldset>

      {role === "creator" && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="ageConfirmed" className="mt-1" />
          Je certifie avoir 18 ans ou plus
        </label>
      )}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
