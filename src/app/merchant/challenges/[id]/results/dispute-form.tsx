"use client";

import { useFormState, useFormStatus } from "react-dom";
import { reportResultsDisputeAction, type ReportDisputeState } from "./actions";

const initialState: ReportDisputeState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-outline btn-sm">
      {pending ? "Envoi..." : "Signaler un problème sur ce classement"}
    </button>
  );
}

export function DisputeForm({ challengeId }: { challengeId: string }) {
  const [state, formAction] = useFormState(reportResultsDisputeAction, initialState);

  if (state.success) {
    return (
      <p className="text-sm text-muted">
        Signalement enregistré. Les paiements en attente sont bloqués jusqu&apos;à
        vérification par Natan.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="challengeId" value={challengeId} />
      {state.error && <p className="alert-error">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
