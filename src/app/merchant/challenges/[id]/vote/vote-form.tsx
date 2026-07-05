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
    <button
      type="submit"
      disabled={pending}
      className="btn-primary w-fit"
    >
      {pending ? "Enregistrement..." : "Valider le vote"}
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
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="challengeId" value={challengeId} />

      <ul className="flex flex-col gap-2">
        {candidates.map((candidate, index) => (
          <li key={candidate.id}>
            <label className="flex cursor-pointer items-center gap-3 card card-hover p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft/40">
              <input
                type="radio"
                name="submissionId"
                value={candidate.id}
                required
                className="accent-primary"
              />
              <span>
                #{index + 1} @{candidate.username} — score métriques{" "}
                {candidate.metricScore.toFixed(1)}/50
              </span>
            </label>
          </li>
        ))}
      </ul>

      {state.error && <p className="alert-error">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
