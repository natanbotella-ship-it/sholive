"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createChallengeAction, type CreateChallengeState } from "./actions";
import { PayButton } from "./pay-button";

// Formulaire de création (refonte Nuit des Lumières 2026-07-07) — un seul
// formulaire (même action, mêmes champs), regroupé en 4 sections numérotées
// façon flow hôte Airbnb, avec des placeholders exemples métier dans chaque
// champ (demande explicite de Natan). Aucune logique modifiée.

const initialState: CreateChallengeState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto">
      {pending ? "Création..." : "Créer le challenge (brouillon)"}
    </button>
  );
}

function SectionHeading({ step, title, sub }: { step: number; title: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary-soft font-display text-sm font-bold text-secondary-ink"
      >
        {step}
      </span>
      <div className="flex flex-col gap-0.5">
        <h2 className="font-display text-lg font-bold leading-tight">{title}</h2>
        {sub && <p className="text-xs text-muted">{sub}</p>}
      </div>
    </div>
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
      <div className="card flex flex-col items-center gap-4 p-6 text-center sm:p-8">
        <span
          aria-hidden
          className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-ink"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 13 4 4L19 7" />
          </svg>
        </span>
        <div className="flex flex-col gap-1">
          <p className="font-display text-xl font-extrabold">Challenge créé !</p>
          <p className="text-sm text-muted">
            Il est en brouillon, encore invisible des créateurs. Dernière
            étape : paie la cagnotte pour le lancer.
          </p>
        </div>
        <PayButton challengeId={state.challengeId} />
      </div>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-6">
      {/* 1. Le challenge */}
      <section className="card flex flex-col gap-4 p-5">
        <SectionHeading
          step={1}
          title="Ton challenge"
          sub="Ce que les créateurs verront en premier dans la liste."
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-sm font-medium">
            Titre
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="ex : Faites découvrir notre nouvelle carte d'automne"
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={3}
            placeholder="ex : Nous sommes un bouchon lyonnais du Vieux Lyon. On vient de lancer une nouvelle carte et on veut la faire connaître aux Lyonnais avant l'hiver."
            className="input"
          />
        </div>
      </section>

      {/* 2. Le brief */}
      <section className="card flex flex-col gap-4 p-5">
        <SectionHeading
          step={2}
          title="Le brief pour les créateurs"
          sub="Sois concret : angle, plats, ambiance, ce qu'il faut dire ou montrer."
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="concept" className="text-sm font-medium">
            Concept
          </label>
          <textarea
            id="concept"
            name="concept"
            required
            rows={3}
            placeholder="ex : Je veux que mon restau soit filmé en fin de service, ambiance chaleureuse, avec le plat signature en gros plan. Il faut présenter la nouvelle carte et donner envie de réserver."
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="consignes" className="text-sm font-medium">
            Consignes <span className="font-normal text-muted">(une par ligne)</span>
          </label>
          <textarea
            id="consignes"
            name="consignes"
            required
            rows={4}
            placeholder={
              "ex :\nMontrer le plat signature en gros plan\nCiter le nom du restaurant à l'oral\nFilmer la salle et la façade\nVidéo verticale, moins de 60 secondes"
            }
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="hashtagsObligatoires" className="text-sm font-medium">
            Hashtags obligatoires{" "}
            <span className="font-normal text-muted">(un par ligne)</span>
          </label>
          <textarea
            id="hashtagsObligatoires"
            name="hashtagsObligatoires"
            required
            rows={2}
            placeholder={"ex :\n#bouchonlyonnais\n#lyonfood"}
            className="input"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="exemplesInspiration" className="text-sm font-medium">
            Exemples d&apos;inspiration{" "}
            <span className="font-normal text-muted">
              (optionnel, un lien par ligne)
            </span>
          </label>
          <textarea
            id="exemplesInspiration"
            name="exemplesInspiration"
            rows={2}
            placeholder={"ex :\nhttps://www.tiktok.com/@creatorfood/video/72..."}
            className="input"
          />
        </div>
      </section>

      {/* 3. La cagnotte */}
      <section className="card flex flex-col gap-4 border-accent/60 p-5">
        <SectionHeading
          step={3}
          title="La cagnotte"
          sub="Payée en une fois via Stripe. Sholive prélève 20 % de commission, le reste est réparti entre les 3 gagnants."
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="prizePool" className="text-sm font-medium">
            Montant (€)
          </label>
          <input
            id="prizePool"
            name="prizePool"
            type="number"
            min={200}
            step="0.01"
            required
            defaultValue={200}
            className="input sm:max-w-[200px]"
          />
          <p className="text-xs text-muted">
            200 € minimum. Intégralement remboursée s&apos;il y a moins de 10
            vidéos à la deadline.
          </p>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">
            Répartition entre les gagnants{" "}
            <span className="font-normal text-muted">
              (% du net, total = 100)
            </span>
          </legend>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="rank1" className="text-xs font-medium">
                🥇 1ᵉʳ <span className="text-muted">(40-60)</span>
              </label>
              <input
                id="rank1"
                name="rank1"
                type="number"
                min={40}
                max={60}
                required
                defaultValue={50}
                className="input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="rank2" className="text-xs font-medium">
                🥈 2ᵉ <span className="text-muted">(20-35)</span>
              </label>
              <input
                id="rank2"
                name="rank2"
                type="number"
                min={20}
                max={35}
                required
                defaultValue={30}
                className="input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="rank3" className="text-xs font-medium">
                🥉 3ᵉ <span className="text-muted">(10-25)</span>
              </label>
              <input
                id="rank3"
                name="rank3"
                type="number"
                min={10}
                max={25}
                required
                defaultValue={20}
                className="input"
              />
            </div>
          </div>
        </fieldset>
      </section>

      {/* 4. La deadline */}
      <section className="card flex flex-col gap-4 p-5">
        <SectionHeading
          step={4}
          title="La deadline"
          sub="Après cette date, plus aucune vidéo ne peut être soumise."
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="submissionDeadline" className="text-sm font-medium">
            Fin des soumissions
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
            className="input sm:max-w-[280px]"
          />
          <input type="hidden" name="submissionDeadlineIso" value={deadlineIso} />
          <p className="text-xs text-muted">
            Tu auras ensuite 7 jours pour choisir ton coup de cœur dans le top
            10 avant la publication des résultats.
          </p>
        </div>
      </section>

      {state.error && <p className="alert-error">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
