import { z } from "zod";

const ALLOWED_AVATAR_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

export const creatorProfileSchema = z.object({
  username: z
    .string()
    .toLowerCase()
    .regex(
      /^[a-z0-9_]{3,20}$/,
      "3-20 caractères, minuscules, chiffres et underscore uniquement",
    ),
  avatar: z
    .instanceof(File)
    .refine(
      (f) => f.size === 0 || f.size <= MAX_AVATAR_SIZE,
      "Image trop lourde (max 5 Mo)",
    )
    .refine(
      (f) => f.size === 0 || ALLOWED_AVATAR_TYPES.includes(f.type),
      "Format d'image non supporté (png, jpeg, webp ou gif)",
    )
    .optional(),
});
