"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createChallengeAction, type CreateChallengeState } from "./actions";
import { PayButton } from "./pay-button";

const initialState: CreateChallengeState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
    >
      {pending ? "Création..." : "Créer le challenge (brouillon)"}
    </button>
  );
}

export function ChallengeForm() {
  const [state, formAction] = useFormState(createChallengeAction, initialState);
  // datetime-local produit une heure locale sans fuseau : convertie ici en instant
  // ISO dans le fuseau du navigateur (celui du merchant), sinon le serveur (UTC en
  // prod) l'interpréterait avec 1-2 h de décalage.
  const [deadlineIso, setDeadlineIso] = useState("");

  if (state.success && state.challengeId) {
    return (
      <div className="flex max-w-lg flex-col gap-4">
        <p className="text-sm">
          Challenge créé en brouillon (id : {state.challengeId}). Paie le
          prize pool pour l&apos;activer et le rendre visible aux créateurs.
        </p>
        <PayButton challengeId={state.challengeId} />
      </div>
    );
  }

  return (
    <form action={formAction} className="flex w-full max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium">
          Titre
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={3}
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="concept" className="text-sm font-medium">
          Concept du brief
        </label>
        <textarea
          id="concept"
          name="concept"
          required
          rows={2}
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="consignes" className="text-sm font-medium">
          Consignes (une par ligne)
        </label>
        <textarea
          id="consignes"
          name="consignes"
          required
          rows={3}
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="hashtagsObligatoires" className="text-sm font-medium">
          Hashtags obligatoires (un par ligne)
        </label>
        <textarea
          id="hashtagsObligatoires"
          name="hashtagsObligatoires"
          required
          rows={2}
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="exemplesInspiration" className="text-sm font-medium">
          Exemples d&apos;inspiration (optionnel, un lien par ligne)
        </label>
        <textarea
          id="exemplesInspiration"
          name="exemplesInspiration"
          rows={2}
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="prizePool" className="text-sm font-medium">
          Prize pool (€, minimum 200)
        </label>
        <input
          id="prizePool"
          name="prizePool"
          type="number"
          min={200}
          step="0.01"
          required
          defaultValue={200}
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">
          Répartition du prize pool net (%, doit sommer à 100)
        </legend>
        <div className="flex gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="rank1" className="text-xs">
              1er (40-60)
            </label>
            <input
              id="rank1"
              name="rank1"
              type="number"
              min={40}
              max={60}
              required
              defaultValue={50}
              className="w-20 rounded-md border px-2 py-1 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="rank2" className="text-xs">
              2e (20-35)
            </label>
            <input
              id="rank2"
              name="rank2"
              type="number"
              min={20}
              max={35}
              required
              defaultValue={30}
              className="w-20 rounded-md border px-2 py-1 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="rank3" className="text-xs">
              3e (10-25)
            </label>
            <input
              id="rank3"
              name="rank3"
              type="number"
              min={10}
              max={25}
              required
              defaultValue={20}
              className="w-20 rounded-md border px-2 py-1 text-sm"
            />
          </div>
        </div>
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor="submissionDeadline" className="text-sm font-medium">
          Date limite de soumission
        </label>
        <input
          id="submissionDeadline"
          name="submissionDeadline"
          type="datetime-local"
          required
          onChange={(e) =>
            setDeadlineIso(
              e.target.value ? new Date(e.target.value).toISOString() : "",
            )
          }
          className="rounded-md border px-3 py-2 text-sm"
        />
        <input type="hidden" name="submissionDeadlineIso" value={deadlineIso} />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
