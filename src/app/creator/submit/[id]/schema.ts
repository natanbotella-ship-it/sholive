import { z } from "zod";

function hasHostname(url: URL, hostnames: string[]): boolean {
  const hostname = url.hostname.replace(/^www\./, "");
  return hostnames.includes(hostname);
}

function isValidTikTokUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return hasHostname(url, ["tiktok.com", "vm.tiktok.com", "vt.tiktok.com"]);
  } catch {
    return false;
  }
}

function isValidReelsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      hasHostname(url, ["instagram.com"]) &&
      (url.pathname.startsWith("/reel/") || url.pathname.startsWith("/p/"))
    );
  } catch {
    return false;
  }
}

function isValidShortsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (hasHostname(url, ["youtu.be"])) return true;
    return hasHostname(url, ["youtube.com"]) && url.pathname.startsWith("/shorts/");
  } catch {
    return false;
  }
}

export const submissionSchema = z.object({
  tiktokUrl: z
    .string()
    .url("URL invalide")
    .refine(
      isValidTikTokUrl,
      "Le lien doit pointer vers tiktok.com, vm.tiktok.com ou vt.tiktok.com",
    ),
  reelsUrl: z
    .string()
    .url("URL invalide")
    .refine(
      isValidReelsUrl,
      "Le lien doit pointer vers un reel/post Instagram (instagram.com/reel/ ou /p/)",
    ),
  shortsUrl: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : undefined))
    .refine(
      (v) => v === undefined || isValidShortsUrl(v),
      "Le lien doit pointer vers youtube.com/shorts/ ou youtu.be",
    ),
  views: z.coerce.number().int().min(0),
  saves: z.coerce.number().int().min(0),
  likes: z.coerce.number().int().min(0),
  shares: z.coerce.number().int().min(0),
});
