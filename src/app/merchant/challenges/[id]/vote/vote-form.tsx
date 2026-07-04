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
      className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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
            <label className="flex items-center gap-3 rounded-md border p-3 text-sm has-[:checked]:border-primary">
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

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
