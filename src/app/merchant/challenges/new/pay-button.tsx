"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  createCheckoutSessionAction,
  type CheckoutState,
} from "./checkout-actions";

const initialState: CheckoutState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-accent w-full"
    >
      {pending ? "Redirection vers Stripe..." : "Payer la cagnotte et lancer"}
    </button>
  );
}

export function PayButton({ challengeId }: { challengeId: string }) {
  const [state, formAction] = useFormState(
    createCheckoutSessionAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex w-full flex-col gap-2">
      <input type="hidden" name="challengeId" value={challengeId} />
      {state.error && <p className="alert-error">{state.error}</p>}
      <SubmitButton />
      <p className="text-xs text-muted">
        Paiement sécurisé par Stripe — remboursé intégralement s&apos;il y a
        moins de 10 vidéos.
      </p>
    </form>
  );
}
