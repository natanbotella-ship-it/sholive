"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { registerAction, type RegisterState } from "./actions";

const initialState: RegisterState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? "Création..." : "Créer mon compte"}
    </button>
  );
}

export function RegisterForm({
  initialRole = "creator",
}: {
  initialRole?: "creator" | "merchant";
}) {
  const [state, formAction] = useFormState(registerAction, initialState);
  const [role, setRole] = useState<"creator" | "merchant">(initialRole);

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
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
        <p className="font-display text-lg font-bold">Compte créé !</p>
        <p className="text-sm text-muted">
          {state.emailConfirmationRequired
            ? "Vérifie tes emails pour confirmer ton inscription avant de te connecter."
            : "Tu peux maintenant te connecter."}
        </p>
        {!state.emailConfirmationRequired && (
          <Link href="/login" className="btn-primary">
            Se connecter
          </Link>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      {/* Choix du rôle en cartes tapables (le radio reste le vrai input) */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Je suis…</legend>
        <div className="grid grid-cols-2 gap-2">
          <label
            className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition focus-within:ring-2 focus-within:ring-primary/40 ${
              role === "creator"
                ? "border-primary bg-primary-soft/50"
                : "hover:border-foreground/30"
            }`}
          >
            <input
              type="radio"
              name="role"
              value="creator"
              checked={role === "creator"}
              onChange={() => setRole("creator")}
              className="sr-only"
            />
            <span className="text-sm font-semibold">Créateur</span>
            <span className="text-xs leading-snug text-muted">
              Je filme et je remporte des cagnottes
            </span>
          </label>
          <label
            className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition focus-within:ring-2 focus-within:ring-primary/40 ${
              role === "merchant"
                ? "border-primary bg-primary-soft/50"
                : "hover:border-foreground/30"
            }`}
          >
            <input
              type="radio"
              name="role"
              value="merchant"
              checked={role === "merchant"}
              onChange={() => setRole("merchant")}
              className="sr-only"
            />
            <span className="text-sm font-semibold">Commerçant</span>
            <span className="text-xs leading-snug text-muted">
              Je lance des challenges pour mon commerce
            </span>
          </label>
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={
            role === "merchant" ? "contact@moncommerce.fr" : "camille@exemple.fr"
          }
          className="input"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="8 caractères minimum"
          className="input"
        />
      </div>

      {role === "creator" && (
        <label className="flex items-start gap-3 rounded-xl border p-3 text-sm">
          <input
            type="checkbox"
            name="ageConfirmed"
            className="mt-0.5 h-4 w-4 accent-primary"
          />
          <span>
            Je certifie avoir 18 ans ou plus
            <span className="block text-xs text-muted">
              Obligatoire pour recevoir les gains d&apos;un challenge.
            </span>
          </span>
        </label>
      )}

      {state.error && <p className="alert-error">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
