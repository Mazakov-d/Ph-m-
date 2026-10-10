# Phémé

> **La rumeur, sourcée.**

Dans la mythologie grecque, Phémé est la déesse de la rumeur : celle qui fait courir les nouvelles
en mêlant le vrai et le faux. **Phémé, l'application, fait l'inverse** : elle rassemble
l'information des médias et donne à chacun les moyens de vérifier ce qu'il lit.

---

## Ce que l'application cherche à faire

**L'information des médias, sans le bruit des réseaux sociaux.**

- On n'y publie **que de l'information** : des articles et des opinions, avec un titre, un résumé,
  un texte et des sources. Pas de mèmes, pas de publications virales sans auteur.
- Seuls des **éditeurs vérifiés** publient : groupes de presse, journalistes, indépendants et médias
  nés sur les réseaux sociaux. Chacun montre ses justificatifs à l'équipe avant de pouvoir publier.
- Les **lecteurs** lisent, débattent dans les commentaires, votent sur les opinions et
  **signalent** ce qui leur paraît faux.
- **Transparence plutôt que censure** : on montre qui publie, à qui appartient le média et ce que
  la revue a constaté. On ne décrète pas la vérité. Un article signalé reste visible pendant qu'on
  l'examine.
- **Pluralisme** : aucune étiquette politique, aucun média ne juge un autre média, et « Voir les
  similaires » montre comment d'autres rédactions, de groupes différents, traitent le même sujet.
- **Le vote ne fait pas l'audience** : les votes sur les opinions n'influencent jamais l'ordre du
  fil.

À venir : **la synthèse de Phémé**, une IA qui lira tous les articles sur un même sujet et en
donnera l'essentiel, de façon neutre et sans prendre parti.

---

## Qui fait quoi

| Rôle           | Ce qu'il fait                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| Visiteur       | Lit le fil et les articles (liens partagés), sans compte.                                             |
| **Lecteur**    | Commente, vote, signale, s'abonne à des alertes, peut être tiré au sort comme juré, écrit à l'équipe. |
| **Éditeur**    | Un lecteur validé qui publie. Page profil publique : ligne éditoriale, propriétaire, fiabilité.       |
| **Modérateur** | Traite les signalements, les demandes d'éditeur, les tickets et les chats avec les éditeurs.          |
| **Dirigeant**  | Tout voir, certifier les éditeurs, créer les comptes modérateurs. Chacune de ses actions est auditée. |

Toutes les permissions sont dans une seule matrice (`packages/shared/src/permissions.ts`) : le
serveur s'en sert pour autoriser, l'application pour masquer les boutons. Seul le serveur fait foi.

---

## Les mécanismes

Toutes les règles ci-dessous sont des **fonctions pures**, testées une à une, dans
`packages/shared/src/domain/`. Leurs constantes sont réunies dans `packages/shared/src/rules.ts`.

### Signalements pondérés

Chaque signalement pèse selon la fiabilité passée de celui qui signale, calculée au moment du
signalement :

```
compte de moins de 30 jours               → 0,2
moins de 5 signalements déjà tranchés     → 1,0
sinon  poids = 0,1 + 1,9 × (signalements confirmés / signalements tranchés)   (entre 0,1 et 2)
```

Un signaleur qui a souvent raison pèse jusqu'à 2. Un compte qui signale à tort ou un compte tout
neuf pèse peu : une campagne de faux comptes ne suffit pas à faire tomber un article.

### Revue d'un article

- **Seuil** : un article passe « en cours d'examen » quand la somme des poids atteint
  `max(5, 1 % des lecteurs uniques)`. Plus un article est lu, plus il faut de signalements.
- **File de revue** : triée par `score × log10(lectures + 10)`. Un article très lu et très signalé
  passe en premier.
- **Verdict** : un modérateur tranche (exact, contexte manquant, trompeur, faux, invérifiable),
  avec une note publique et au moins une source. Les signaleurs sont crédités ou débités, ce qui
  fait évoluer leur poids futur.
- **Droit de réponse** : l'éditeur a 48 h pour répondre ou corriger, et peut faire appel une fois.
  L'appel est examiné par un autre modérateur.
- **Barre de fiabilité** sous chaque article : « Non examiné », « N signalements · en cours
  d'examen », « examiné : <verdict> » avec un bouton « Pourquoi ? » (note, sources, réponse de
  l'éditeur).

### Jury citoyen

Pour chaque article en examen, **7 lecteurs volontaires** sont tirés au sort :

- comptes inscrits depuis 6 mois, sans sanction depuis 12 mois, sans lien avec un média ;
- ils votent sous 48 h, une source obligatoire, de façon anonyme (un juré absent est remplacé une fois) ;
- la majorité du jury éclaire la décision finale du modérateur.

### Jauge de fiabilité des éditeurs

Le score part de **50/100**, puis chaque verdict des 12 derniers mois l'ajuste : exact +2,
contexte manquant −1, trompeur −5, faux −10.

- Un verdict compte de moins en moins avec le temps (de 100 % à 25 %).
- Une pénalité est divisée par deux si l'éditeur avait déjà corrigé l'article.
- Les lecteurs ne voient qu'un palier, jamais le chiffre : « Très fiable » (≥ 60), « Fiable »
  (≥ 45), « Vigilance », ou « Historique insuffisant » (moins de 3 verdicts).

### Le fil

- **Récent** : les publications des 48 dernières heures, les plus récentes d'abord.
- **À la une** (fil pondéré) :
  - poids = `fraîcheur × fiabilité / √n` ;
  - la fraîcheur est divisée par deux toutes les 12 heures ;
  - un article jugé exact pèse plus, un article faux presque plus rien ;
  - `n` est le nombre d'articles du même éditeur, pour qu'un média prolifique n'envahisse pas le
    fil ;
  - un éditeur n'apparaît jamais deux fois en 4 articles consécutifs ;
  - le tirage est propre à chaque session.
- **Filtres combinables** : aujourd'hui (24 h glissantes), lieu (international, Europe, France,
  18 régions, 20 grandes villes) et thème.

### Voir les similaires

Ce sont les articles de même zone et de même thème, publiés à 7 jours d'écart et partageant au
moins deux mots significatifs dans leur titre ou leur résumé. Pour garantir le pluralisme :

- un seul article par groupe propriétaire ;
- éditeurs certifiés et indépendants en alternance ;
- 5 articles au plus.

### Recherche

Recherche plein texte de PostgreSQL en français, sans tenir compte des accents :

- les articles sont pondérés titre > résumé > texte ;
- les médias sont trouvés par leur nom, même mal orthographié (trigrammes).

### Commentaires et sanctions

1. **Filtre automatique** avant publication. Il repère une liste de termes, même déguisés
   (`c0nnard`, `c.o.n.n.a.r.d`…). Un commentaire bloqué n'est pas publié et son auteur voit
   pourquoi.
2. **Signalements pondérés** : à partir d'un poids de 3, le commentaire est masqué en attendant une
   décision humaine.
3. **Décision** : « conforme » (réaffiché avec un badge, plus jamais signalable) ou « retiré ».
4. **Sanctions progressives**, comptées sur les retraits des 6 derniers mois : avertissement →
   suspension 24 h → suspension 7 jours → bannissement. Le bannissement est immédiat en cas de
   discrimination confirmée. Chaque sanction est contestable une fois.

### Votes sur les opinions

- L'éditeur propose 2 à 4 choix. Le vote est **définitif**.
- « Voir sans voter » est aussi définitif : qui a vu les résultats ne peut plus voter, pour qu'aucun
  vote ne soit influencé par celui des autres.
- L'API ne renvoie même pas les totaux à qui n'a ni voté ni demandé à les voir.

### Devenir éditeur

Le candidat choisit son profil et fournit les justificatifs correspondants :

| Profil                    | Obligatoire                                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Groupe média              | Kbis/SIRET (vérifié par algorithme de Luhn), mentions légales, directeur de publication, e-mail sur le domaine du média |
| Journaliste               | Pièce d'identité, au moins 3 travaux publiés et signés                                                                  |
| Indépendant               | Pièce d'identité, au moins 3 travaux publiés                                                                            |
| Média des réseaux sociaux | Pièce d'identité, code `PHEME-XXXXXX` placé dans la bio du compte, liens vers des publications                          |

Le modérateur coche chaque justificatif vérifié. Valider est impossible tant qu'un justificatif
obligatoire manque. Les pièces d'identité restent dans un stockage privé, jamais public.

---

## La gestion au quotidien

- **Tableau de bord** : même interface pour tous. Les outils de l'équipe s'y déplient :
  - conversations : tickets non pris en charge, les miens, et tous les tickets pour le dirigeant ;
  - modération : demandes d'éditeur, commentaires et articles signalés ;
  - administration : modérateurs, journal d'audit.
- **« Contacter Phémé »** : un lecteur ou un éditeur ouvre un ticket avec un motif (problème, idée,
  compte éditeur…). Les tickets d'éditeurs et de lecteurs sont séparés.
- **Prise en charge atomique** : deux modérateurs qui cliquent en même temps, un seul gagne (mise à
  jour conditionnelle en base). Un ticket sans réponse depuis 24 h retourne dans la file commune.
- **Chats avec les éditeurs** : en temps réel (WebSocket). Un chat appartient à un modérateur au
  plus, et au dirigeant.
- **Journal d'audit** : chaque action de modération et chaque lecture d'un chat par le dirigeant est
  enregistrée, dans la même transaction que l'action.
- **Notifications** : alertes par thème et/ou lieu (10 par jour au plus), réponses de l'équipe,
  verdicts.
- **RGPD et stores** : blocage d'utilisateurs, suppression de compte depuis l'application (les
  contenus restent signés « Compte supprimé »), suppressions logiques et purge planifiée, photos
  débarrassées de leurs métadonnées, vidéos nettoyées par ffmpeg.

---

## La stack

| Rôle                     | Outil                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------- |
| Langage                  | TypeScript strict, partout                                                            |
| Monorepo                 | pnpm workspaces                                                                       |
| Application              | Expo + Expo Router : **une seule base de code pour iOS, Android et le web**           |
| Données côté application | TanStack Query ; formulaires : react-hook-form                                        |
| API                      | NestJS, WebSocket pour les chats, tâches planifiées                                   |
| Base de données          | PostgreSQL + Prisma (recherche plein texte, trigrammes, `unaccent`)                   |
| Stockage privé           | Compatible S3 (RustFS)                                                                |
| Médias                   | ffmpeg (vidéos), nettoyage des métadonnées des images                                 |
| Validation et types      | **Zod**, partagé entre l'application et l'API                                         |
| Mise en ligne            | Docker Compose + Caddy (HTTPS automatique)                                            |
| Tests                    | Vitest (API, règles métier), Jest (application), supertest (parcours de bout en bout) |

### Organisation

```
apps/
  api/        NestJS : un dossier par domaine (posts, comments, reports, reviews, jury, tickets…)
  mobile/     Expo : écrans (app/), fonctionnalités (features/), composants (components/ui/)
packages/
  shared/     la source de vérité : schémas Zod, enums, constantes, permissions, règles métier
docs/
  SPEC.md       les règles métier
  DECISIONS.md  chaque choix fait en route, avec sa raison
deploy/       la pile de production
```

### Principes de code

- **Une seule source de vérité** : tout ce qui circule entre l'application et l'API est un schéma
  Zod de `packages/shared`. Les types en sont dérivés, jamais réécrits.
- **Règles métier pures et testées** : aucun nombre magique, aucune règle cachée dans un écran ou un
  contrôleur.
- **Pas de condition de course** : tout « vérifier puis modifier » se fait en une transaction ou par
  une mise à jour conditionnelle.
- **Rien n'est vraiment effacé** quand la loi impose de le conserver : suppression logique, puis
  purge planifiée.
- **Près de 900 tests** : règles métier, permissions (chaque rôle × chaque permission), API,
  écrans, et un test de bout en bout par parcours critique.

---

## Lancer en local

Il faut Node 22, pnpm et Docker.

```bash
cp apps/api/.env.example apps/api/.env
pnpm install
docker compose up -d                    # PostgreSQL + stockage
pnpm --filter api prisma migrate dev
pnpm --filter api prisma db seed        # données de démonstration
pnpm dev                                # API (:3000) + application (Expo, :8081)
pnpm check                              # lint + types + tous les tests
```

Pour aller plus loin : [`docs/SPEC.md`](docs/SPEC.md) (les règles),
[`docs/DECISIONS.md`](docs/DECISIONS.md) (les choix),
[`deploy/README.md`](deploy/README.md) (la mise en ligne).
