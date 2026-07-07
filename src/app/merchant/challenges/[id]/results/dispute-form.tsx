"use client";

import { useFormState, useFormStatus } from "react-dom";
import { reportResultsDisputeAction, type ReportDisputeState } from "./actions";

const initialState: ReportDisputeState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-danger/40 px-3 py-1.5 text-sm font-semibold text-danger transition hover:bg-danger/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger disabled:pointer-events-none disabled:opacity-50"
    >
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
