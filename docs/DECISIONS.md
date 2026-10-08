# Décisions

Journal des réponses apportées quand la SPEC ou `CLAUDE.md` était muette, ambiguë ou dépassée.
Une entrée par décision, la plus récente en bas. Ne jamais réécrire une entrée : en ajouter une nouvelle
qui la remplace.

## Format d'une entrée

```md
## AAAA-MM-JJ — Titre court

- **Question** : ce qui était ambigu ou manquant.
- **Décision** : ce qui a été retenu.
- **Pourquoi** : la raison (contrainte technique, choix du porteur du projet…).
```

---

## 2026-10-07 — Tests de l'API avec Vitest

- **Question** : `CLAUDE.md` prévoyait Jest pour `apps/api`, mais NestJS 12 (dernière version stable) est
  uniquement ESM et son modèle officiel utilise Vitest. Le support ESM de Jest reste expérimental.
- **Décision** : Vitest pour `apps/api` et `packages/shared` ; Jest (via `jest-expo`) reste pour `apps/mobile`.
  `CLAUDE.md` §2 mis à jour.
- **Pourquoi** : suivre les idiomes de la version stable de NestJS, et un seul outil de test côté Node.

## 2026-10-07 — Versions de l'outillage

- **Question** : certaines « dernières versions » ne sont pas compatibles entre elles.
- **Décision** : Node 22 LTS (via nvm, `.nvmrc`) ; TypeScript 6.0 (TypeScript 7 n'est pas encore pris en charge
  par `typescript-eslint` ni `ts-jest`) ; Prisma 7.10 (l'étiquette npm `latest` pointe vers une 8.0 en release
  candidate) ; Expo SDK 57.
- **Pourquoi** : `CLAUDE.md` demande les dernières versions **stables** et compatibles.

## 2026-10-07 — Emplacement de la SPEC

- **Question** : `SPEC.md` était à la racine alors que `CLAUDE.md` et `ROADMAP.md` le référencent dans `docs/`.
- **Décision** : déplacé dans `docs/SPEC.md`.
- **Pourquoi** : choix du porteur du projet.

## 2026-10-07 — Nom et slogan de l'application

- **Question** : la SPEC ne nomme pas le produit.
- **Décision** : l'application s'appelle **Fama**, slogan « La rumeur, sourcée. » (`APP_NAME`, `APP_SLOGAN`
  dans `packages/shared/src/app.ts`).
- **Pourquoi** : choix du porteur du projet.

## 2026-10-07 — Port PostgreSQL local

- **Question** : le port 5432 est déjà utilisé sur la machine de développement.
- **Décision** : le conteneur PostgreSQL est exposé sur `127.0.0.1:5434`.
- **Pourquoi** : éviter le conflit sans toucher au PostgreSQL existant.

## 2026-10-07 — Permissions d'un compte suspendu ou banni

- **Question** : la SPEC (§6.3) retire à un compte suspendu publier, commenter, voter et signaler, sans
  dire ce qu'il advient des autres permissions de la matrice §2.5 (`support.open`, `user.block`,
  `post.toggleComments`, permissions de modération). Le bannissement est-il traité comme une suspension ?
- **Décision** : un compte suspendu ne garde que la lecture (`post.read`) et `support.open` (si son rôle
  l'a), notamment pour contester sa sanction. Toutes les autres permissions sont retirées, y compris
  celles de modération. Un compte banni (`PERMANENT_BAN`) est traité comme suspendu sans date de fin.
- **Pourquoi** : choix du porteur du projet.

## 2026-10-07 — Libellés français des verdicts

- **Question** : la barre de fiabilité (SPEC §5.6) affiche « examiné : <verdict> » sans donner le libellé
  français de chaque `Verdict`.
- **Décision** : `ACCURATE` → « exact », `MISSING_CONTEXT` → « contexte manquant », `MISLEADING` →
  « trompeur », `FALSE` → « faux », `UNVERIFIABLE` → « invérifiable ».
- **Pourquoi** : choix du porteur du projet.

## 2026-10-07 — Limites provisoires des schémas

- **Question** : les schémas Zod ont besoin de limites que la SPEC ne fixe pas (seules les longueurs
  de commentaire, titre et résumé figurent au §11).
- **Décision** (valeurs provisoires dans `rules.ts`) : pseudo de 3 à 30 caractères (lettres accentuées,
  chiffres, `_`, `-`, `.`), unique **sans tenir compte de la casse** ; mot de passe de 12 à 128 caractères
  (recommandation CNIL) ; corps d'un post 50 000 max ; 1 à 20 sources par post, 500 caractères chacune ;
  région obligatoire si `zone = LOCAL`, 100 max ; texte d'un signalement obligatoire si `OTHER`, 1 000 max ;
  note de revue et réponse de l'éditeur 5 000 max ; appel 2 000 max ; message de chat 4 000 max ;
  ligne éditoriale 2 000 max ; noms (propriétaire, groupe, identité) 200 max ; motif de refus 1 000 max ;
  pagination de 20 éléments par défaut, 50 max.
- **Pourquoi** : valeurs proposées et acceptées par le porteur du projet, modifiables à tout moment.

## 2026-10-07 — Choix de modélisation de la base

- **Question** : plusieurs détails de stockage ne sont pas fixés par la SPEC.
- **Décision** :
  - pseudo stocké en `citext` (unicité sans tenir compte de la casse) ;
  - « Voir sans voter » : ligne `Vote` avec `value = null` et `revealedResults = true` (une seule ligne par
    compte et opinion) ;
  - poids de signalement en `Float`, comparés aux seuils avec la tolérance `SCORE_EPSILON` ;
  - un `Appeal` vise exactement une revue **ou** une sanction (contrainte `CHECK` en base) ;
  - restrictions en cours recopiées sur `User` (`suspendedUntil`, `bannedAt`) pour vérifier `can()` sans
    relire l'historique des sanctions ;
  - documents d'identité : clés de stockage privé dans `EditorIdentity.documentKeys`.
- **Pourquoi** : choix techniques simples, sans effet sur les règles métier.

## 2026-10-07 — Espaces dans les pseudos

- **Question** : la règle des pseudos (entrée « Limites provisoires des schémas ») interdisait les espaces,
  alors que la ROADMAP (phase 10) attend un éditeur « Le Monde » dans le seed.
- **Décision** : les pseudos acceptent des espaces simples entre les mots (jamais au début, à la fin, ni
  doublés). Remplace la partie « caractères autorisés » de l'entrée précédente.
- **Pourquoi** : les noms de médias contiennent souvent des espaces ; choix du porteur du projet.

## 2026-10-07 — Stockage des jetons et durées de session

- **Question** : `CLAUDE.md` §6.4 demande de décider en phase 2 où vivent les jetons sur le web ; la SPEC
  ne fixe pas la durée des sessions.
- **Décision** :
  - jeton d'accès (JWT) valable **15 minutes**, gardé en mémoire dans l'app ;
  - jeton de rafraîchissement valable **30 jours**, renouvelé à chaque usage (rotation), stocké haché en
    base et révoqué à la déconnexion ;
  - iOS / Android : jeton de rafraîchissement dans `expo-secure-store` ;
  - web : jeton de rafraîchissement dans un cookie `httpOnly`, `Secure`, `SameSite=Strict`, jamais
    lisible par JavaScript.
- **Pourquoi** : choix du porteur du projet ; le cookie `httpOnly` empêche une faille XSS de voler la session.

## 2026-10-07 — Parcours éditeur

- **Question** : la SPEC (§2.2) ne précise pas quand un compte devient `EDITOR`, si un refus est définitif,
  quels documents sont acceptés, ni si la consultation des documents est tracée.
- **Décision** :
  - seul un `READER` peut demander le statut éditeur (nouvelle permission `editor.apply`, réservée au
    rôle `READER`, donc refusée à un compte suspendu) ; il reste `READER` tant que la demande est
    `PENDING` ou `REJECTED`, et devient `EDITOR` à la validation (`INDEPENDENT` ou `CERTIFIED`) ;
    un modérateur ou un dirigeant ne peut pas demander (un compte n'a qu'un rôle) ;
  - après un refus, une nouvelle demande remplace l'ancienne et repasse en `PENDING` (les anciens
    documents sont supprimés du stockage ; la décision reste dans le journal d'audit) ;
  - documents : 1 à 5 fichiers PDF, JPEG ou PNG de 10 Mo maximum chacun ; le type est vérifié sur le
    contenu du fichier, pas seulement sur le type déclaré ;
  - les documents ne sont jamais exposés par une URL : l'API les transmet à un modérateur ou dirigeant
    authentifié, et **chaque consultation crée une entrée `AuditLog`** ;
  - un dirigeant peut certifier une demande `PENDING` ou un éditeur déjà `INDEPENDENT`.
- **Pourquoi** : choix du porteur du projet ; l'identité des éditeurs est la donnée la plus sensible.

## 2026-10-07 — Stockage S3 local : RustFS au lieu de MinIO

- **Question** : la ROADMAP (phase 3) prévoit MinIO en local, mais MinIO ne publie plus d'images Docker
  gratuites (dépôt Docker Hub supprimé, quay.io sur authentification).
- **Décision** : RustFS (`rustfs/rustfs`, Apache 2.0), compatible S3 et conçu comme remplaçant de MinIO,
  dans `docker-compose.yml` (API S3 sur `127.0.0.1:9000`, console sur `127.0.0.1:9001`). Le code de
  l'API utilise le client S3 standard et ne dépend pas de ce choix.
- **Pourquoi** : choix du porteur du projet.

## 2026-10-07 — Publications et fil

- **Question** : la SPEC (§3, §4) ne fixe ni les limites des images, ni leur traitement, ni plusieurs
  détails de comptage et d'affichage.
- **Décision** :
  - images : 0 à 4 par post, JPEG, PNG ou WebP de 5 Mo maximum, envoyées **avec** le post (un post
    publié n'est pas modifiable) ; la première sert de couverture sur la carte du fil ;
  - l'API ré-encode chaque image (bibliothèque `sharp`) : **toutes les métadonnées sont supprimées**
    (position GPS, appareil) et les images de plus de 2000 px de large sont réduites ;
  - les images sont du contenu public, servies par l'API (`/posts/:id/images/:imageId`), jamais par une
    URL du stockage, qui reste privé ; l'API renvoie ce chemin et l'app y ajoute son adresse d'API ;
  - vues uniques (§3) : un compte = une vue ; un visiteur anonyme est dédupliqué par un identifiant de
    session aléatoire généré par l'app à son lancement ; les vues de l'auteur ne comptent pas ;
  - compteur de commentaires : seuls les commentaires affichés à tous (`VISIBLE`, `VERIFIED`) ;
  - le profil public d'un éditeur liste toutes ses publications (§2.2), sans limite des 48 h ;
  - un post reste accessible par lien direct, même au-delà de 48 h ou si son auteur est bloqué ;
  - libellés : zones « France », « Europe », « International », « Local » ; thèmes « Politique »,
    « Économie », « Mouvements sociaux », « Environnement », « Sciences et santé », « Tech »,
    « Culture », « Sport ».
- **Pourquoi** : limites et traitement des images choisis par le porteur du projet ; le reste découle de
  la SPEC ou relève de choix techniques simples.

## 2026-10-08 — Commentaires

- **Question** : la SPEC (§6) ne fixe ni la liste des termes du filtre automatique, ni ce que voit
  l'auteur bloqué, ni plusieurs détails des réponses et de la suppression.
- **Décision** :
  - filtre automatique (`ToxicityChecker`) : liste initiale de termes rédigée par l'équipe technique,
    **à relire et compléter par le porteur du projet avant le lancement**
    (`apps/api/src/comments/toxicity/forbidden-terms.ts`) ; comparaison sur des mots entiers après
    normalisation (casse, accents, chiffres et symboles de substitution, lettres répétées, lettres
    séparées par des espaces ou des points), pour ne jamais bloquer « contexte » à cause de « con » ;
  - un commentaire bloqué n'est pas enregistré ; l'auteur voit un message **générique** (« terme
    interdit par les règles de la communauté »), sans le terme trouvé, pour ne pas dévoiler la liste ;
  - réponses : un seul niveau ; le parent doit être un commentaire racine du même post, `VISIBLE` ou
    `VERIFIED` ; dans l'app, « Répondre » sous une réponse répond au fil (au commentaire racine) ;
  - liste : les commentaires racines par date croissante, page par page, chacun avec toutes ses
    réponses (date croissante) ;
  - suppression : par l'auteur seulement, d'un commentaire `VISIBLE` ou `VERIFIED` ; refusée s'il est
    `UNDER_REVIEW` (SPEC) ou déjà `REMOVED` / `DELETED` ; **permise à un compte suspendu ou banni**
    (supprimer ses propres propos n'est pas publier) ;
  - un commentaire supprimé garde ses réponses ; il s'affiche « Commentaire supprimé ».
- **Pourquoi** : liste, message et suppression par un compte suspendu choisis par le porteur du projet ;
  le reste découle de la SPEC.

## 2026-10-08 — Choix de réponse des opinions personnalisables

- **Question** : la SPEC (§7) fixait le vote à `AGREE` / `DISAGREE`.
- **Décision** (SPEC §3, §7 et §11 mises à jour) :
  - l'éditeur définit 2 à 4 choix de réponse en publiant une opinion ; « D'accord » et « Pas d'accord »
    par défaut, renommables ; 1 à 50 caractères chacun, distincts sans tenir compte de la casse ;
    figés après publication ;
  - résultats : pourcentage et barre par choix, nombre total de votes, choix de l'utilisateur mis en
    évidence ; les pourcentages affichés totalisent toujours 100 % ;
  - l'énumération `VoteValue` disparaît : un vote désigne un choix (`VoteOption`) ; les votes existants
    sont repris sur les choix par défaut ;
  - « Voir sans voter » est réservé aux comptes connectés (l'API le mémorise par compte) ; un visiteur
    anonyme est invité à se connecter pour voter ou voir les résultats ; un compte suspendu peut voir
    les résultats sans voter (c'est de la lecture) mais ne peut pas voter.
- **Pourquoi** : demande du porteur du projet ; libellés et affichage choisis par lui.

## 2026-10-08 — Sources facultatives pour les opinions ; vote et « Voir sans voter » définitifs

- **Question** : retours du porteur du projet après la phase 6.
- **Décision** (SPEC §1, §3 et §7 mises à jour ; remplace « modifiable » de l'entrée précédente) :
  - une opinion peut être publiée sans source ; un article en garde au moins une ;
  - le vote est **définitif** : le lecteur sélectionne un choix puis le confirme ; il ne peut plus le
    changer ;
  - « Voir sans voter » est **définitif** aussi et demande une confirmation : après avoir vu les
    résultats, le lecteur ne peut plus voter ; voter ou voir les résultats : une seule action par
    opinion ;
  - les votes déjà enregistrés deviennent définitifs.
- **Pourquoi** : un vote ne doit jamais être influencé par celui des autres, ni par un clic involontaire.

## 2026-10-08 — Phase de refonte de l'interface

- **Question** : quand reprendre l'interface (UI) que le porteur du projet souhaite refaire ?
- **Décision** : une phase dédiée (« 10 bis ») avant la phase 11 ; une direction visuelle pourra être
  fixée plus tôt pour que les nouveaux écrans la suivent.
- **Pourquoi** : chaque phase ajoute des écrans ; une refonte immédiate serait à refaire.

## 2026-10-08 — Signalements et revue des articles

- **Question** : la SPEC (§5) ne dit pas ce que devient un signalement d'opinion, si un article examiné
  peut encore être signalé, ni le délai et les effets d'un appel.
- **Décision** :
  - une opinion peut être signalée, mais n'a **jamais de verdict de fiabilité** : ses signalements sont
    enregistrés (avec leur poids) et n'ouvrent pas de revue ; **leur traitement (retrait, sanction de
    l'éditeur) reste à définir** avec la modération des posts, qu'aucune phase ne couvre encore ;
  - un article `REVIEWED` ne peut plus être signalé (`ALREADY_REVIEWED`) ; seul l'éditeur peut contester,
    par l'appel ;
  - dans les **48 h** après le verdict (`EDITOR_REPLY_HOURS`, `EDITOR_APPEAL_HOURS`), l'éditeur peut
    publier **une** réponse (affichée sous la note), des corrections (publiques sous l'article) et faire
    **un seul** appel ;
  - l'appel est traité par un autre modérateur (ni l'auteur du premier verdict, ni un modérateur en
    conflit d'intérêts), qui rend un nouveau verdict, définitif ; si ce verdict fait passer l'article de
    « exact » à « non exact » (ou l'inverse), les signalements passent de `DISMISSED` à `UPHELD` (ou
    l'inverse) et les compteurs des signaleurs sont corrigés ;
  - le verdict d'une revue est rendu par update conditionnel (`UNDER_REVIEW` → `REVIEWED`) : deux
    modérateurs ne peuvent pas juger le même article ; chaque verdict écrit un `AuditLog` ;
  - la file de revue n'est pas paginée au MVP (elle reste courte) ; elle est triée par priorité.
- **Pourquoi** : choix du porteur du projet pour les opinions, l'après-revue et le délai d'appel ; le
  reste découle de la SPEC.
