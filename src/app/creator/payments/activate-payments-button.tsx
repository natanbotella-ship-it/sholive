"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  createConnectAccountAction,
  type ConnectAccountState,
} from "./actions";

const initialState: ConnectAccountState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
    >
      {pending ? "Redirection..." : "Activer mes paiements"}
    </button>
  );
}

export function ActivatePaymentsButton() {
  const [state, formAction] = useFormState(
    createConnectAccountAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
