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
