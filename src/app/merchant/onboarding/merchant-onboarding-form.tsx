"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  completeMerchantProfileAction,
  type MerchantOnboardingState,
} from "./actions";

const initialState: MerchantOnboardingState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? "Enregistrement..." : "Créer mon espace pro"}
    </button>
  );
}

export function MerchantOnboardingForm() {
  const [state, formAction] = useFormState(
    completeMerchantProfileAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="businessName" className="text-sm font-medium">
          Nom du commerce
        </label>
        <input
          id="businessName"
          name="businessName"
          type="text"
          required
          placeholder="ex : Le Bouchon des Canuts"
          className="input"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="city" className="text-sm font-medium">
          Ville
        </label>
        <input
          id="city"
          name="city"
          type="text"
          required
          defaultValue="Lyon"
          className="input"
        />
        <p className="text-xs text-muted">
          Sholive est lancé en exclusivité à Lyon pour le moment.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className="text-sm font-medium">
          Téléphone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          placeholder="ex : 06 12 34 56 78"
          className="input"
        />
        <p className="text-xs text-muted">
          Jamais affiché publiquement — uniquement pour que l&apos;équipe
          Sholive puisse te joindre.
        </p>
      </div>

      {state.error && <p className="alert-error">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
