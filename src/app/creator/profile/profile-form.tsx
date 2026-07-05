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
    <button
      type="submit"
      disabled={pending}
      className="btn-primary"
    >
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
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      {currentAvatarUrl && (
        <Image
          src={currentAvatarUrl}
          alt={currentUsername}
          width={64}
          height={64}
          className="h-16 w-16 rounded-full object-cover"
        />
      )}

      <div className="flex flex-col gap-1">
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
          pattern="[a-z0-9_]+"
          defaultValue={currentUsername}
          className="input"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="avatar" className="text-sm font-medium">
          Nouvel avatar (optionnel)
        </label>
        <input
          id="avatar"
          name="avatar"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="text-sm"
        />
      </div>

      {state.error && <p className="alert-error">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
