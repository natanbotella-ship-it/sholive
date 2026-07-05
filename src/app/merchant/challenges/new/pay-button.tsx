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
      className="btn-primary"
    >
      {pending ? "Redirection..." : "Payer et lancer le challenge"}
    </button>
  );
}

export function PayButton({ challengeId }: { challengeId: string }) {
  const [state, formAction] = useFormState(
    createCheckoutSessionAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="challengeId" value={challengeId} />
      {state.error && <p className="alert-error">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
