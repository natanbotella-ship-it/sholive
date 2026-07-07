"use client";

import { useFormState, useFormStatus } from "react-dom";
import { castVoteAction, type VoteState } from "./actions";

const initialState: VoteState = {};

type Candidate = {
  id: string;
  username: string;
  metricScore: number;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? "Enregistrement..." : "Valider mon coup de cœur"}
    </button>
  );
}

export function VoteForm({
  challengeId,
  candidates,
}: {
  challengeId: string;
  candidates: Candidate[];
}) {
  const [state, formAction] = useFormState(castVoteAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="challengeId" value={challengeId} />

      <ul className="flex flex-col gap-2">
        {candidates.map((candidate, index) => (
          <li key={candidate.id}>
            <label className="card card-hover flex cursor-pointer items-center gap-3 p-4 text-sm transition has-[:checked]:border-primary has-[:checked]:bg-primary-soft/40">
              <input
                type="radio"
                name="submissionId"
                value={candidate.id}
                required
                className="h-4 w-4 accent-primary"
              />
              <span
                aria-hidden
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-soft font-display text-sm font-bold text-secondary-ink"
              >
                {index + 1}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-display text-base font-bold">
                  @{candidate.username}
                </span>
                <span className="text-xs text-muted">
                  Score statistiques : {candidate.metricScore.toFixed(1)}/50
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      {state.error && <p className="alert-error">{state.error}</p>}

      <SubmitButton />
      <p className="text-xs text-muted">
        Un seul vote possible, définitif une fois validé.
      </p>
    </form>
  );
}
