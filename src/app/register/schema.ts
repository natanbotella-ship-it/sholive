import { z } from "zod";

export const registerSchema = z
  .object({
    email: z.string().email("Adresse email invalide"),
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    role: z.enum(["creator", "merchant"]),
    ageConfirmed: z.boolean(),
  })
  .refine((data) => data.role !== "creator" || data.ageConfirmed, {
    message: "Tu dois certifier avoir 18 ans ou plus pour t'inscrire comme créateur",
    path: ["ageConfirmed"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
