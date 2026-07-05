"use client";

import { useFormState, useFormStatus } from "react-dom";
import { viewResultsAction, type ViewResultsState } from "./actions";

const initialState: ViewResultsState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary w-fit"
    >
      {pending ? "Calcul en cours..." : "Voir les résultats"}
    </button>
  );
}

export function ResultsForm({ challengeId }: { challengeId: string }) {
  const [state, formAction] = useFormState(viewResultsAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="challengeId" value={challengeId} />
      {state.error && <p className="alert-error">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
