import { z } from "zod";

const linesToArray = (val: string) =>
  val
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

export const challengeSchema = z
  .object({
    title: z.string().min(3, "Titre trop court").max(150),
    description: z.string().min(10, "Description trop courte").max(2000),
    concept: z.string().min(5, "Concept requis").max(500),
    consignes: z
      .string()
      .transform(linesToArray)
      .refine((arr) => arr.length > 0, "Au moins une consigne requise"),
    hashtagsObligatoires: z
      .string()
      .transform(linesToArray)
      .refine((arr) => arr.length > 0, "Au moins un hashtag obligatoire"),
    exemplesInspiration: z
      .string()
      .optional()
      .transform((v) => (v ? linesToArray(v) : [])),
    prizePool: z.coerce.number().min(200, "Le prize pool minimum est 200€"),
    rank1: z.coerce
      .number()
      .min(40, "Entre 40 et 60%")
      .max(60, "Entre 40 et 60%"),
    rank2: z.coerce
      .number()
      .min(20, "Entre 20 et 35%")
      .max(35, "Entre 20 et 35%"),
    rank3: z.coerce
      .number()
      .min(10, "Entre 10 et 25%")
      .max(25, "Entre 10 et 25%"),
    submissionDeadline: z.string().min(1, "Deadline requise"),
    // Rempli côté client (JS) : la saisie datetime-local est une heure locale SANS
    // fuseau, que le serveur (UTC sur Vercel) interpréterait décalée de 1-2 h. Le
    // navigateur la convertit en instant ISO dans le fuseau du merchant. Optionnel :
    // sans JS, fallback sur l'interprétation serveur de submissionDeadline.
    submissionDeadlineIso: z.string().optional(),
  })
  .refine((data) => data.rank1 + data.rank2 + data.rank3 === 100, {
    message: "La répartition doit sommer à exactement 100%",
    path: ["rank3"],
  })
  .refine(
    (data) =>
      new Date(data.submissionDeadlineIso || data.submissionDeadline) > new Date(),
    {
      message: "La deadline de soumission doit être dans le futur",
      path: ["submissionDeadline"],
    },
  );
