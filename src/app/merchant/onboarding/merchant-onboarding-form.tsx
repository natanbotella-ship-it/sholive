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
    <button
      type="submit"
      disabled={pending}
      className="btn-primary"
    >
      {pending ? "Enregistrement..." : "Valider"}
    </button>
  );
}

export function MerchantOnboardingForm() {
  const [state, formAction] = useFormState(
    completeMerchantProfileAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="businessName" className="text-sm font-medium">
          Nom du commerce
        </label>
        <input
          id="businessName"
          name="businessName"
          type="text"
          required
          className="input"
        />
      </div>

      <div className="flex flex-col gap-1">
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
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="phone" className="text-sm font-medium">
          Téléphone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          className="input"
        />
      </div>

      {state.error && <p className="alert-error">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
