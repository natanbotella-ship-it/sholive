import Link from "next/link";

export const metadata = {
  title: "Comment ça marche — Sholive",
};

export default function CommentCaMarchePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-primary-ink">
          Comment ça marche ?
        </h1>
        <p className="text-muted">
          Le fonctionnement d&apos;un challenge Sholive, expliqué simplement —
          côté pro et côté créateur.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Pour les pros</h2>
        <ol className="flex flex-col gap-3 text-sm text-muted">
          <li className="card p-3">
            <span className="font-semibold text-foreground">
              1. Tu crées un challenge
            </span>{" "}
            — un brief, une cagnotte (200€ minimum) et une répartition entre
            le 1er, 2e et 3e.
          </li>
          <li className="card p-3">
            <span className="font-semibold text-foreground">
              2. Tu payes la cagnotte
            </span>{" "}
            pour lancer le challenge — l&apos;argent est réservé, rien n&apos;est
            versé avant la fin.
          </li>
          <li className="card p-3">
            <span className="font-semibold text-foreground">
              3. Les créateurs postent leurs vidéos
            </span>{" "}
            jusqu&apos;à la deadline de soumission.
          </li>
          <li className="card p-3">
            <span className="font-semibold text-foreground">
              4. Tu votes pour ton coup de cœur
            </span>{" "}
            parmi les 10 meilleures vidéos. Ce vote donne un vrai coup de
            pouce, mais ne garantit pas la victoire à lui seul — le score des
            statistiques compte aussi.
          </li>
          <li className="card p-3">
            <span className="font-semibold text-foreground">
              5. Tu déclenches les résultats
            </span>{" "}
            une fois la deadline de vote passée — le classement final et les
            paiements des 3 premiers sont calculés automatiquement.
          </li>
          <li className="card p-3">
            <span className="font-semibold text-foreground">
              6. Fenêtre de vérification de 72h
            </span>{" "}
            avant que l&apos;argent parte réellement : vérifie les liens vidéo
            du top 3 sur la page résultats, et signale un problème si quelque
            chose te semble anormal.
          </li>
        </ol>
      </section>

      <section id="scoring" className="flex flex-col gap-4 scroll-mt-20">
        <h2 className="text-xl font-semibold">Pour les créateurs</h2>

        <div className="card flex flex-col gap-2 p-4 text-sm">
          <h3 className="font-semibold text-foreground">Soumettre</h3>
          <p className="text-muted">
            Un lien TikTok et un lien Reels sont obligatoires (Shorts en
            option), avec tes vraies statistiques : vues, sauvegardes, likes,
            partages.
          </p>
        </div>

        <div className="card flex flex-col gap-2 p-4 text-sm">
          <h3 className="font-semibold text-foreground">
            Ce qui compte le plus dans le score
          </h3>
          <p className="text-muted">
            Les vues et les sauvegardes pèsent plus lourd que les likes et les
            partages dans le calcul — ce sont les signaux les plus fiables
            d&apos;un vrai engagement. Reste honnête sur tes chiffres : le
            système est pensé pour qu&apos;une seule vidéo aux stats
            exagérées ne puisse pas écraser le classement de tout le monde.
          </p>
        </div>

        <div className="card flex flex-col gap-2 p-4 text-sm">
          <h3 className="font-semibold text-foreground">Le vote du pro</h3>
          <p className="text-muted">
            En plus du score basé sur tes stats, le pro choisit un coup de
            cœur parmi le top 10 qui reçoit un bonus important. Ça peut faire
            basculer un classement serré, mais ne remplace pas de bonnes
            statistiques.
          </p>
        </div>

        <div className="card flex flex-col gap-2 p-4 text-sm">
          <h3 className="font-semibold text-foreground">XP et niveaux</h3>
          <p className="text-muted">
            Participer à un challenge qui va à son terme rapporte de
            l&apos;XP, être dans le top 3 en rapporte plus, et gagner encore
            plus (les deux se cumulent pour le vainqueur). Les niveaux vont
            de Débutant à Élite au fur et à mesure. Des badges récompensent
            aussi tes premières fois et tes victoires.
          </p>
        </div>

        <div className="card flex flex-col gap-2 p-4 text-sm">
          <h3 className="font-semibold text-foreground">Être payé</h3>
          <p className="text-muted">
            Pour recevoir l&apos;argent d&apos;une victoire, il faut activer
            tes paiements (identité + IBAN) depuis ton espace créateur — si
            ce n&apos;est pas encore fait au moment des résultats, le
            paiement t&apos;attend et part dès que c&apos;est activé.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/register?role=merchant" className="btn-primary">
          Je suis un pro
        </Link>
        <Link href="/register?role=creator" className="btn-outline">
          Je suis un créateur
        </Link>
      </div>
    </main>
  );
}
