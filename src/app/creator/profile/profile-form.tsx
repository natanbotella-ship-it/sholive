"use client";

import Image from "next/image";
import { useFormState, useFormStatus } from "react-dom";
import {
  updateCreatorProfileAction,
  type UpdateCreatorProfileState,
} from "./actions";

const initialState: UpdateCreatorProfileState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? "Enregistrement..." : "Enregistrer"}
    </button>
  );
}

export function ProfileForm({
  currentUsername,
  currentAvatarUrl,
}: {
  currentUsername: string;
  currentAvatarUrl: string | null;
}) {
  const [state, formAction] = useFormState(
    updateCreatorProfileAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <div className="flex items-center gap-3">
        {currentAvatarUrl ? (
          <Image
            src={currentAvatarUrl}
            alt={currentUsername}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary-soft font-display text-2xl font-extrabold text-secondary-ink"
          >
            {currentUsername.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="flex flex-col">
          <span className="font-display text-lg font-bold">
            @{currentUsername}
          </span>
          <span className="text-xs text-muted">Ton profil public</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="text-sm font-medium">
          Nom d&apos;utilisateur
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          minLength={3}
          maxLength={20}
          pattern="[a-zA-Z0-9_]+"
          defaultValue={currentUsername}
          placeholder="ex : lisa_lyon"
          className="input"
        />
        <p className="text-xs text-muted">
          3 à 20 caractères — lettres, chiffres et underscore. Les majuscules
          seront converties en minuscules.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="avatar" className="text-sm font-medium">
          Nouvel avatar{" "}
          <span className="font-normal text-muted">(optionnel)</span>
        </label>
        <input
          id="avatar"
          name="avatar"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-secondary-soft file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-secondary-ink hover:file:opacity-90"
        />
      </div>

      {state.error && <p className="alert-error">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
