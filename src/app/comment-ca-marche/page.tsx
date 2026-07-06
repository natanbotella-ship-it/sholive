import Link from "next/link";

export const metadata = {
  title: "Comment ça marche — Sholive",
};

// Guide public (refonte Nuit des Lumières 2026-07-07) — même contenu qu'avant
// (volontairement sans formule exacte de scoring, cf. décision anti-fraude du
// 2026-07-06), restylé : chips d'ancrage par audience, cartes à icônes côté
// créateur, timeline numérotée côté pro. L'ancre #scoring reste sur la section
// créateurs (liée depuis la page résultats).

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const creatorCards = [
  {
    title: "Soumettre",
    icon: (
      <svg {...iconProps} aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="m10 9 5 3-5 3V9Z" />
      </svg>
    ),
    text: "Un lien TikTok et un lien Reels sont obligatoires (Shorts en option), avec tes vraies statistiques : vues, sauvegardes, likes, partages.",
  },
  {
    title: "Ce qui compte le plus dans le score",
    icon: (
      <svg {...iconProps} aria-hidden>
        <path d="M4 20V10" />
        <path d="M10 20V4" />
        <path d="M16 20v-7" />
        <path d="M22 20H2" />
      </svg>
    ),
    text: "Les vues et les sauvegardes pèsent plus lourd que les likes et les partages dans le calcul — ce sont les signaux les plus fiables d'un vrai engagement. Reste honnête sur tes chiffres : le système est pensé pour qu'une seule vidéo aux stats exagérées ne puisse pas écraser le classement de tout le monde.",
  },
  {
    title: "Le vote du pro",
    icon: (
      <svg {...iconProps} aria-hidden>
        <path d="M20.8 8.6a5 5 0 0 0-8.1-1.5L12 7.8l-.7-.7a5 5 0 1 0-7 7l7.7 7.6 7.7-7.6a5 5 0 0 0 1.1-5.5Z" />
      </svg>
    ),
    text: "En plus du score basé sur tes stats, le pro choisit un coup de cœur parmi le top 10 qui reçoit un bonus important. Ça peut faire basculer un classement serré, mais ne remplace pas de bonnes statistiques.",
  },
  {
    title: "XP et niveaux",
    icon: (
      <svg {...iconProps} aria-hidden>
        <path d="m12 2 2.9 6.3 6.6.7-5 4.6 1.4 6.6L12 16.9l-5.9 3.3 1.4-6.6-5-4.6 6.6-.7L12 2Z" />
      </svg>
    ),
    text: "Participer à un challenge qui va à son terme rapporte de l'XP, être dans le top 3 en rapporte plus, et gagner encore plus (les deux se cumulent pour le vainqueur). Les niveaux vont de Débutant à Élite au fur et à mesure. Des badges récompensent aussi tes premières fois et tes victoires.",
  },
  {
    title: "Être payé",
    icon: (
      <svg {...iconProps} aria-hidden>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h4" />
      </svg>
    ),
    text: "Pour recevoir l'argent d'une victoire, il faut activer tes paiements (identité + IBAN) depuis ton espace créateur — si ce n'est pas encore fait au moment des résultats, le paiement t'attend et part dès que c'est activé.",
  },
];

const merchantSteps = [
  {
    title: "Tu crées un challenge",
    text: "Un brief, une cagnotte (200 € minimum) et une répartition entre le 1er, 2e et 3e.",
  },
  {
    title: "Tu payes la cagnotte",
    text: "Pour lancer le challenge — l'argent est réservé, rien n'est versé avant la fin.",
  },
  {
    title: "Les créateurs postent leurs vidéos",
    text: "Jusqu'à la deadline de soumission.",
  },
  {
    title: "Tu votes pour ton coup de cœur",
    text: "Parmi les 10 meilleures vidéos. Ce vote donne un vrai coup de pouce, mais ne garantit pas la victoire à lui seul — le score des statistiques compte aussi.",
  },
  {
    title: "Tu déclenches les résultats",
    text: "Une fois la deadline de vote passée — le classement final et les paiements des 3 premiers sont calculés automatiquement.",
  },
  {
    title: "Fenêtre de vérification de 72 h",
    text: "Avant que l'argent parte réellement : vérifie les liens vidéo du top 3 sur la page résultats, et signale un problème si quelque chose te semble anormal.",
  },
];

export default function CommentCaMarchePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Comment ça marche ?
        </h1>
        <p className="text-muted">
          Le fonctionnement d&apos;un challenge Sholive, expliqué simplement —
          côté créateur et côté commerçant.
        </p>
        <nav aria-label="Aller à la section" className="flex flex-wrap gap-2 pt-1">
          <a href="#scoring" className="chip">
            Je suis créateur
          </a>
          <a href="#pros" className="chip">
            Je suis commerçant
          </a>
        </nav>
      </div>

      <section id="scoring" className="flex scroll-mt-20 flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="badge badge-primary">Créateurs</span>
          <h2 className="font-display text-xl font-bold">
            Filmer, scorer, être payé
          </h2>
        </div>
        <div className="flex flex-col gap-3">
          {creatorCards.map((card) => (
            <div key={card.title} className="card flex gap-4 p-4 sm:p-5">
              <span
                aria-hidden
                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink"
              >
                {card.icon}
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold">{card.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{card.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="pros" className="flex scroll-mt-20 flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="badge">Commerçants</span>
          <h2 className="font-display text-xl font-bold">
            Du brief au paiement des gagnants
          </h2>
        </div>
        <ol className="flex flex-col">
          {merchantSteps.map((step, i) => (
            <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
              {/* trait vertical reliant les étapes */}
              {i < merchantSteps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-[15px] top-8 h-full w-px bg-border"
                />
              )}
              <span
                aria-hidden
                className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-soft font-display text-sm font-bold text-secondary-ink"
              >
                {i + 1}
              </span>
              <div className="flex flex-col gap-1 pt-1">
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="card flex flex-col items-start gap-3 p-6">
        <p className="font-display text-lg font-bold">Prêt à te lancer ?</p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/register?role=creator" className="btn-primary">
            Créer mon compte créateur
          </Link>
          <Link href="/register?role=merchant" className="link text-sm">
            Je suis commerçant
          </Link>
        </div>
      </div>
    </main>
  );
}
