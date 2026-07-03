import { z } from "zod";

export const merchantProfileSchema = z.object({
  businessName: z
    .string()
    .min(2, "Le nom du commerce doit contenir au moins 2 caractères")
    .max(100),
  city: z.string().min(2, "Ville requise").max(100),
  phone: z
    .string()
    .min(6, "Numéro de téléphone invalide")
    .max(20, "Numéro de téléphone invalide"),
});
