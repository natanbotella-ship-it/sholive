import type { Config } from "tailwindcss";

// Palette "Nuit des Lumières" (refonte design 2026-07-07) : tokens exposés en
// canaux RGB (var CSS) pour conserver les modificateurs d'opacité Tailwind.
// Les valeurs vivent dans globals.css (mode clair + sombre), tous les couples
// texte/fond sont validés WCAG AA (script contrast-check de la refonte).
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          hover: "rgb(var(--primary-hover) / <alpha-value>)",
          ink: "rgb(var(--primary-ink) / <alpha-value>)",
          soft: "rgb(var(--primary-soft) / <alpha-value>)",
          contrast: "rgb(var(--primary-contrast) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          hover: "rgb(var(--accent-hover) / <alpha-value>)",
          ink: "rgb(var(--accent-ink) / <alpha-value>)",
          soft: "rgb(var(--accent-soft) / <alpha-value>)",
          contrast: "rgb(var(--accent-contrast) / <alpha-value>)",
        },
        secondary: {
          ink: "rgb(var(--secondary-ink) / <alpha-value>)",
          soft: "rgb(var(--secondary-soft) / <alpha-value>)",
        },
        night: {
          DEFAULT: "rgb(var(--night) / <alpha-value>)",
          surface: "rgb(var(--night-surface) / <alpha-value>)",
          fg: "rgb(var(--night-fg) / <alpha-value>)",
          muted: "rgb(var(--night-muted) / <alpha-value>)",
          border: "rgb(var(--night-border) / <alpha-value>)",
        },
      },
      borderColor: {
        // Couleur par défaut de la classe `border` (remplace le gris Tailwind).
        DEFAULT: "rgb(var(--border) / 1)",
      },
      fontFamily: {
        sans: ["var(--font-inter)"],
        display: ["var(--font-archivo)", "var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
