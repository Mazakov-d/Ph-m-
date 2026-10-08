# ROADMAP

Feuille de route de développement. Lire `CLAUDE.md` (comment travailler) et `docs/SPEC.md` (règles) avant de commencer.

**Mode d'emploi pour Claude Code**

- Les phases se font **dans l'ordre**. Dans une phase, les tâches aussi.
- Une tâche est cochée quand son code, ses tests et `pnpm check` sont verts.
- Chaque phase se termine par ses **critères de validation**. Les vérifier, puis **s'arrêter** pour validation humaine.
- Les références `§` renvoient à `docs/SPEC.md`.

---

## Phase 0 — Fondations du monorepo

- [x] Initialiser le monorepo pnpm (`apps/api`, `apps/mobile`, `packages/shared`) et un `tsconfig.base.json` strict (`strict`, `noUncheckedIndexedAccess`).
- [x] ESLint + Prettier communs, avec règles interdisant `any`, `@ts-ignore` et les non-null assertions.
- [x] `packages/shared` : package TypeScript consommable par les deux apps (export depuis `src/index.ts`), dépendance unique : Zod.
- [x] `apps/api` : projet NestJS minimal avec une route `GET /health` → `{ status: "ok" }`.
- [x] `apps/mobile` : projet Expo + Expo Router avec un écran d'accueil qui affiche une constante importée de `shared` (preuve que le partage fonctionne).
- [x] `docker-compose.yml` avec PostgreSQL ; `apps/api/.env.example`.
- [x] Prisma installé dans `apps/api`, `PrismaService` injectable.
- [x] Scripts racine : `pnpm dev`, `pnpm check` (lint + typecheck + tests de tous les packages).
- [x] `docs/DECISIONS.md` créé (vide, avec le format d'une entrée).

**Critères de validation**

- `pnpm check` passe sur un dépôt neuf après `pnpm install`.
- L'app Expo affiche la constante de `shared` sur le web et dans Expo Go.
- Modifier la constante dans `shared` casse le typecheck si son type change.

---

## Phase 1 — Domaine partagé et modèle de données

- [x] `shared/src/rules.ts` : toutes les constantes de §11.
- [x] `shared/src/enums.ts` : `UserRole`, `EditorStatus`, `PostKind`, `Zone`, `Theme`, `PostReviewStatus` (`NOT_REVIEWED`, `UNDER_REVIEW`, `REVIEWED`), `Verdict`, `PostReportReason`, `CommentReportReason`, `ReportStatus` (`PENDING`, `UPHELD`, `DISMISSED`), `CommentStatus`, `DeletedBy`, `VoteValue`, `SanctionType`, `TicketKind`, `TicketStatus`.
- [x] `shared/src/permissions.ts` : matrice §2.5 et `can(user, permission)` (tient compte de `EditorStatus` et des suspensions). Tests : chaque rôle × chaque permission.
- [x] `shared/src/domain/` + tests :
  - [x] `computeReportWeight(reporter, now)` (§5.2) ;
  - [x] `computePostReviewThreshold(viewCount)` et `shouldOpenPostReview(score, viewCount)` (§5.3) ;
  - [x] `computeReviewPriority(score, viewCount)` (§5.4) ;
  - [x] `shouldHideComment(totalWeight)` (§6.2) ;
  - [x] `nextSanction(removedCountLast6Months, isDiscrimination)` (§6.3) ;
  - [x] `canSeeVoteResults(hasVoted, revealedResults)` (§7) ;
  - [x] `reliabilityLabel(post)` → texte de la barre (§5.6).
- [x] `shared/src/schemas/` : schémas d'entrée et publics pour `auth`, `user`, `editor`, `post`, `comment`, `vote`, `report`, `review`, `sanction`, `ticket`, `message`, plus `paginated()` et `cursorQuerySchema`.
- [x] `shared/src/errors.ts` : codes d'erreur API.
- [x] `schema.prisma` : modèles `User`, `EditorProfile`, `EditorIdentity` (table séparée, accès restreint), `Post`, `PostImage`, `PostSource`, `PostView`, `PostCorrection`, `Comment`, `Vote`, `PostReport`, `CommentReport`, `Review`, `EditorReply`, `Appeal`, `Sanction`, `Block`, `Ticket`, `Message`, `AuditLog`. Index sur `Post.createdAt`, clés uniques (un vote par compte et opinion, un signalement par compte et cible).
- [x] Test `enums.consistency.spec.ts` : chaque enum Prisma = enum Zod correspondant.
- [x] Seed : 1 `ADMIN`, 2 `MODERATOR`, 3 éditeurs (`PENDING`, `INDEPENDENT`, `CERTIFIED`), 5 lecteurs, 20 posts répartis sur 3 jours, des commentaires et votes.

**Critères de validation**

- Toutes les fonctions de `domain/` testées, y compris aux bornes (score égal au seuil, compte de 29 et 30 jours, 5e signalement…).
- `prisma migrate dev` puis `db seed` fonctionnent sur une base vide.
- Aucun nombre magique hors de `rules.ts`.

---

## Phase 2 — Authentification et rôles

- [x] API : inscription (e-mail, mot de passe, pseudo unique), connexion, rafraîchissement de jeton, déconnexion. Mots de passe hachés avec argon2.
- [x] `JwtAuthGuard` global, décorateurs `@Public()`, `@CurrentUser()`, `@RequirePermission()` + `PermissionGuard` basé sur `can()`.
- [x] `ZodValidationPipe` et filtre d'erreurs au format `{ code, message }`.
- [x] Refus des actions d'écriture pour un compte suspendu ou banni.
- [x] App : `tokenStorage` (SecureStore sur mobile ; stratégie web décidée et consignée dans `DECISIONS.md`).
- [x] App : `apiClient` typé (valide chaque réponse avec un schéma Zod, rafraîchit le jeton si expiré).
- [x] App : `AuthProvider` + `useAuth()` (modèle de `CLAUDE.md` §6.3), `QueryProvider`.
- [x] App : écrans Inscription et Connexion (react-hook-form + schémas partagés), messages d'erreur en français.
- [x] Tests e2e : inscription, connexion, accès refusé sans jeton, accès refusé sans permission.

**Critères de validation**

- Un lecteur ne peut pas appeler une route `post.create` (403).
- Un pseudo déjà pris renvoie une erreur claire affichée dans le formulaire.
- Fermer et rouvrir l'app conserve la session.

---

## Phase 3 — Parcours éditeur

- [x] API : demande de statut éditeur (identité légale, documents, ligne éditoriale, propriétaire, `showIdentityPublicly`) → `PENDING`.
- [x] Stockage des documents dans un espace privé (S3 compatible ; MinIO en local via docker-compose). Aucune URL publique.
- [x] API modération : liste des demandes, validation `INDEPENDENT` (modérateur ou admin), `CERTIFIED` (admin seulement), refus avec motif. Chaque décision → `AuditLog`.
- [x] API : profil public d'un éditeur (§2.2), sans identité si `showIdentityPublicly = false`.
- [x] App : écran « Devenir éditeur », écran profil éditeur public, réglage de visibilité de l'identité.
- [x] App : écran modérateur « Demandes éditeurs ».
- [x] Tests e2e : un modérateur ne peut pas valider `CERTIFIED` ; l'identité masquée n'apparaît jamais dans la réponse publique.

**Critères de validation**

- Un éditeur `PENDING` ne peut pas publier ; `INDEPENDENT` et `CERTIFIED` le peuvent.
- La réponse JSON du profil public ne contient aucun champ d'identité quand l'éditeur l'a masquée.

---

## Phase 4 — Publications et fil

- [x] API : création d'un post (§3) avec validation Zod de tous les champs obligatoires et des sources.
- [x] API : envoi d'images (taille et format limités), rattachées au post.
- [x] API : `commentsEnabled` modifiable par l'éditeur sur ses articles ; forcé à `true` pour les opinions.
- [x] API : fil public (§4.1) — 48 h, tri chronologique, pagination par curseur, filtres `today` / `zone` / `theme` combinables (§4.3), exclusion des comptes bloqués.
- [x] API : détail d'un post + comptage des vues uniques (`PostView`).
- [x] App : écran Fil (scroll infini via `useInfiniteQuery`), barre de filtres en haut (Aujourd'hui, zones, thèmes).
- [x] App : carte de post (éditeur + badge, date, titre, image, barre de fiabilité ou étiquette « Opinion », compteur de commentaires).
- [x] App : écran détail d'un post ; écran « Publier » réservé aux éditeurs validés (bouton masqué via `can()`).
- [x] Lecture du fil et des posts possible **sans compte** (§2).

**Critères de validation**

- Un post publié il y a 49 h n'apparaît plus dans le fil ; il reste accessible par lien direct.
- Les filtres `today` + `zone` + `theme` combinés renvoient exactement les bons posts (test e2e avec le seed).
- Un visiteur non connecté lit le fil sur le web.

---

## Phase 5 — Commentaires

- [x] API : créer un commentaire (connecté, non suspendu, post avec commentaires activés), réponses sur un niveau (§6).
- [x] API : interface `ToxicityChecker` + implémentation MVP (liste de mots + normalisation) appelée avant enregistrement.
- [x] API : liste des commentaires d'un post, tri par date croissante, contenu masqué (`content: null`) si `UNDER_REVIEW`, `REMOVED` ou `DELETED`.
- [x] API : suppression par l'auteur — **logique** et **refusée si `UNDER_REVIEW`**, en une transaction (test de concurrence).
- [x] Aucune route de modification de commentaire n'existe.
- [x] App : section commentaires (fils de réponses), formulaire, suppression avec confirmation, affichage « Commentaire supprimé ».

**Critères de validation**

- Tenter de supprimer un commentaire en revue renvoie une erreur explicite.
- Un commentaire supprimé reste en base avec `deletedAt` renseigné.

---

## Phase 6 — Votes sur les opinions

- [x] Choix de réponse personnalisables (§7) : 2 à 4 choix définis par l'éditeur à la publication d'une opinion (« D'accord » / « Pas d'accord » par défaut) — modèle, API de publication, formulaire « Publier », seed.
- [x] API : voter / changer son vote (§7), un vote par compte et opinion.
- [x] API : action « Voir sans voter » (`revealedResults`).
- [x] API : les totaux ne sont renvoyés que si `canSeeVoteResults` est vrai.
- [x] App : barre de vote avec les choix de l'opinion ; résultats (pourcentages, total) affichés seulement après vote ou « Voir sans voter ».

**Critères de validation**

- La réponse JSON d'une opinion ne contient pas les totaux pour un utilisateur qui n'a pas voté.
- Le vote ne modifie pas l'ordre du fil (test).

---

## Phase 7 — Signalements et fiabilité des articles

- [x] API : signaler un post (§5.1) avec poids calculé et stocké (§5.2) ; un signalement par compte et par post ; pas d'auto-signalement.
- [x] API : ouverture automatique de la revue au seuil (§5.3).
- [ ] API : file de revue triée par priorité (§5.4), réservée aux modérateurs, sans les dossiers en conflit d'intérêts.
- [ ] API : verdict + note publique + sources (§5.5) ; mise à jour des signalements (`UPHELD` / `DISMISSED`) et des compteurs des signaleurs.
- [ ] API : réponse ou correction de l'éditeur sous 48 h ; appel unique traité par un autre modérateur.
- [ ] App : bouton « Signaler » avec choix du motif.
- [ ] App : barre de fiabilité (§5.6) et feuille « Pourquoi ? » (verdict, note, sources, réponse de l'éditeur).
- [ ] App : écran modérateur « Articles signalés » et écran de verdict.

**Critères de validation**

- 5 signalements de comptes de moins de 30 jours (poids 0,2 chacun) n'ouvrent pas de revue ; 5 signalements de lecteurs normaux en ouvrent une (sur un post peu lu).
- Le modérateur qui a rendu le verdict ne peut pas traiter l'appel.

---

## Phase 8 — Modération des commentaires et sanctions

- [ ] API : signaler un commentaire (§6.2), un signalement par compte, impossible si `VERIFIED`.
- [ ] API : passage automatique en `UNDER_REVIEW` au seuil pondéré.
- [ ] API : décision modérateur : `VERIFIED` (badge) ou `REMOVED` + sanction calculée par `nextSanction` (§6.3), case « À signaler sur PHAROS ».
- [ ] API : application des sanctions (suspensions avec date de fin, bannissement), appel unique.
- [ ] API : blocage d'un utilisateur (§10) et exclusion de ses contenus pour le bloqueur.
- [ ] Toutes les décisions écrivent un `AuditLog`.
- [ ] App : badge « ✓ Examiné par la modération : conforme aux règles » à la place du bouton Signaler.
- [ ] App : écran modérateur « Commentaires signalés » ; écran « Mes sanctions » pour l'utilisateur concerné.
- [ ] App : action « Bloquer cet utilisateur ».

**Critères de validation**

- Une suite de 4 commentaires retirés produit exactement : avertissement, 24 h, 7 jours, bannissement.
- Un motif discrimination confirmé produit un bannissement immédiat.
- Un compte suspendu peut lire mais ne peut ni commenter, ni voter, ni signaler.

---

## Phase 9 — Support et chats

- [ ] API : ouvrir un ticket `SUPPORT` (tout compte) ; ouvrir un ticket `EDITOR_CHAT` (modérateur vers éditeur).
- [ ] API : liste des tickets `NEW` pour les modérateurs ; attribution atomique (`UPDATE ... WHERE status = 'NEW'`) ; clôture.
- [ ] API : messages en ajout seul (aucune route de modification ou de suppression).
- [ ] API : job planifié de retour à `NEW` après 24 h sans message du modérateur (§8).
- [ ] API : un `ADMIN` lit tous les tickets ; chaque lecture → `AuditLog`.
- [ ] App : écran « Parler à l'équipe », écran de conversation (rafraîchi par `refetchInterval`).
- [ ] App : écrans modérateur « Tickets » (non attribués / les miens) ; écran admin « Toutes les conversations » et « Journal d'audit ».

**Critères de validation**

- Deux attributions simultanées du même ticket : une seule réussit (test).
- Un modérateur ne voit pas les tickets attribués à un autre.

---

## Phase 10 — Recherche

- [ ] Colonnes / index de recherche plein texte (`tsvector`, configuration `french`) sur titre, résumé, corps ; extension `pg_trgm` pour pseudos et titres.
- [ ] API : `GET /search?q=...` combinable avec `today` / `zone` / `theme`, résultats séparés (éditeurs, posts).
- [ ] App : barre de recherche en haut du fil, résultats avec les mêmes filtres.

**Critères de validation**

- « le mond » trouve l'éditeur « Le Monde » du seed.
- Une recherche avec filtres renvoie uniquement des posts correspondant à la fois au texte et aux filtres.

---

## Phase 10 bis — Refonte de l'interface

- [ ] Direction visuelle validée par le porteur du projet (couleurs, typographie, composants de base) et appliquée à tous les écrans.
- [ ] Revue d'ergonomie des parcours (lecture, publication, vote, commentaires, modération) sur mobile et web.

**Critères de validation**

- Le porteur du projet valide l'interface sur mobile et sur le web.

---

## Phase 11 — Conformité et préparation à la publication

- [ ] Suppression de compte depuis l'app (anonymisation, §10).
- [ ] Job planifié de purge selon `RETENTION_DAYS`.
- [ ] Pages : règles de la communauté, politique de confidentialité, mentions légales (textes fournis par le porteur du projet ; prévoir l'emplacement).
- [ ] Limitation de débit (rate limiting) sur l'inscription, la connexion, les commentaires et les signalements.
- [ ] Revue de sécurité : aucune donnée privée dans les réponses publiques (test automatisé qui parcourt les schémas publics).
- [ ] Configuration EAS (builds iOS / Android) et déploiement de l'API (choix consigné dans `DECISIONS.md`).

**Critères de validation**

- Un compte supprimé ne peut plus se connecter et son pseudo apparaît comme « Compte supprimé ».
- Les builds iOS et Android se lancent sur un appareil de test.

**Fin du MVP.**

---

## Après le MVP (ne pas commencer sans validation)

- [ ] Fil pondéré : tirage, division par √n, règle d'espacement (§4.2).
- [ ] Jauge de fiabilité des comptes éditeurs (§5.7).
- [ ] « Voir les similaires » et « X autres médias en parlent » (§9).
- [ ] Notifications push.
- [ ] Vidéos dans les posts.
- [ ] Corrections d'articles publiées par l'éditeur (`PostCorrection`) si non faites avant.
- [ ] Revue communautaire par jury tiré au sort (§5.8).
- [ ] Dons aux éditeurs.
- [ ] Moteur de recherche dédié (Meilisearch) si PostgreSQL ne suffit plus.
- [ ] Messagerie temps réel (WebSocket) à la place du polling.
