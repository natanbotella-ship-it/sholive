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
      className="btn-primary"
    >
      {pending ? "Création..." : "Créer mon compte"}
    </button>
  );
}

export function RegisterForm({
  initialRole = "creator",
}: {
  initialRole?: "creator" | "merchant";
}) {
  const [state, formAction] = useFormState(registerAction, initialState);
  const [role, setRole] = useState<"creator" | "merchant">(initialRole);

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
          className="input"
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
          className="input"
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
              className="accent-primary"
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
              className="accent-primary"
            />
            Pro (commerçant)
          </label>
        </div>
      </fieldset>

      {role === "creator" && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="ageConfirmed"
            className="mt-1 accent-primary"
          />
          Je certifie avoir 18 ans ou plus
        </label>
      )}

      {state.error && <p className="alert-error">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
