# SPEC — Réseau d'information

Spécification fonctionnelle de référence. Elle traduit le cahier des charges en règles précises,
avec les noms utilisés dans le code. **En cas de doute sur une règle métier, ce fichier fait foi.**
Si une règle manque ou se contredit, demander au porteur du projet avant de coder.

Langue : la documentation et l'interface sont en **français**, le code (identifiants, enums, commits) en **anglais**.

---

## 1. Vision

L'information des médias, sans le bruit des réseaux sociaux. Seules des informations sont publiées
(articles et opinions, avec photos). Les éditeurs publient ; les lecteurs lisent, débattent et signalent.

Principes non négociables :

- Que de l'information : pas de publication sans titre, résumé, texte et source (la source est facultative pour une opinion).
- Transparence : on montre qui publie et ce que la revue a constaté, on ne décrète pas la vérité.
- Aucun média ne juge un autre média.
- Le vote sur les opinions n'influence jamais l'affichage.
- Rien n'est réellement effacé quand la loi impose de le conserver (suppression logique).

---

## 2. Rôles (`UserRole`)

| Enum        | Nom affiché | Résumé                                                                      |
| ----------- | ----------- | --------------------------------------------------------------------------- |
| `READER`    | Lecteur     | Lit, commente, vote, signale, contacte l'équipe. Pas de page profil.        |
| `EDITOR`    | Éditeur     | Lecteur + publie (après validation). Page profil publique.                  |
| `MODERATOR` | Modérateur  | Traite signalements, tickets et chats. Bénévole au lancement.               |
| `ADMIN`     | Dirigeant   | Tout voir, nommer les modérateurs, valider les certifiés. Actions auditées. |

Un compte a **un seul rôle**. Un `EDITOR` a toutes les permissions d'un `READER`.
Un visiteur **non connecté** peut lire le fil et les articles (découverte via liens partagés),
mais pas commenter, voter ni signaler.

### 2.1 Lecteur

- S'inscrit avec e-mail, mot de passe et **pseudo** unique (affiché sur ses commentaires, non cliquable).
- Données internes (jamais renvoyées au public) : date de création, historique de signalements
  (`upheldReportCount`, `dismissedReportCount`), sanctions.

### 2.2 Éditeur (`EditorStatus`)

N'importe quel compte peut demander le statut éditeur.

| Enum          | Signification                                                                             | Peut publier               |
| ------------- | ----------------------------------------------------------------------------------------- | -------------------------- |
| `PENDING`     | Demande envoyée, en attente                                                               | Non                        |
| `INDEPENDENT` | Identité vérifiée + entretien + exemples de travaux. Validé par un `MODERATOR` ou `ADMIN` | Oui, badge « Indépendant » |
| `CERTIFIED`   | Documents officiels (Kbis, carte de presse, CPPAP…). Validé par un `ADMIN` uniquement     | Oui, badge « Certifié »    |
| `REJECTED`    | Demande refusée (motif obligatoire)                                                       | Non                        |

- L'éditeur publie sous un **pseudo** (compte, profil, publications).
- Son **identité légale** est vérifiée et stockée à l'inscription éditeur, **toujours**.
- Champ `showIdentityPublicly` (booléen, défaut `false`) : il choisit si son identité apparaît sur son profil.
- Les documents d'identité sont stockés dans un espace **privé** (jamais d'URL publique), lisibles par `MODERATOR`/`ADMIN` uniquement.
- Profil public : pseudo, badge, ligne éditoriale déclarée (texte), propriétaire (nom + groupe),
  identité si `showIdentityPublicly`, liste de ses publications.

### 2.3 Modérateur

- Voit la file des signalements (articles et commentaires), triée par priorité.
- S'attribue tickets de support et chats ; voit uniquement **ses** conversations.
- Ne peut jamais traiter un dossier qui le concerne (signalement contre lui, ou contre un éditeur
  qu'il a déclaré comme lien d'intérêt : champ `conflictEditorIds`).

### 2.4 Dirigeant (`ADMIN`)

- Lit tous les chats et toutes les décisions.
- Nomme/retire les modérateurs, valide les éditeurs `CERTIFIED`.
- **Chaque** consultation de chat et chaque décision d'un `ADMIN` crée une entrée `AuditLog`.

### 2.5 Matrice de permissions (source : `packages/shared/src/permissions.ts`)

| Permission                                                 | READER | EDITOR | MODERATOR | ADMIN |
| ---------------------------------------------------------- | ------ | ------ | --------- | ----- |
| `post.read` (aussi visiteur anonyme)                       | ✓      | ✓      | ✓         | ✓     |
| `comment.create` / `vote.cast` / `report.create`           | ✓      | ✓      | ✓         | ✓     |
| `support.open`                                             | ✓      | ✓      | —         | —     |
| `user.block`                                               | ✓      | ✓      | ✓         | ✓     |
| `post.create` (si `EditorStatus` ∈ INDEPENDENT, CERTIFIED) | —      | ✓      | —         | —     |
| `post.toggleComments` (ses articles)                       | —      | ✓      | —         | —     |
| `moderation.queue.read` / `moderation.decide`              | —      | —      | ✓         | ✓     |
| `ticket.assign`                                            | —      | —      | ✓         | ✓     |
| `chat.readAll`                                             | —      | —      | —         | ✓     |
| `editor.validateIndependent`                               | —      | —      | ✓         | ✓     |
| `editor.validateCertified`                                 | —      | —      | —         | ✓     |
| `moderator.manage`                                         | —      | —      | —         | ✓     |
| `audit.read`                                               | —      | —      | —         | ✓     |

---

## 3. Publications (`Post`)

Deux types (`PostKind`) : `ARTICLE` et `OPINION` (case « Opinion » au moment de publier).

**Champs obligatoires** : `title`, `summary`, `body`, `sources` (≥ 1 URL ou référence texte ; facultatives pour une `OPINION`),
`zone`, `theme`, `kind`. Images optionnelles (toujours rattachées au post). Une vidéo optionnelle (voir `DECISIONS.md`).

- `Zone` : `FRANCE`, `EUROPE`, `INTERNATIONAL`, `LOCAL` (+ champ `region` texte si `LOCAL`).
- `Theme` : `POLITICS`, `ECONOMY`, `SOCIAL_MOVEMENTS`, `ENVIRONMENT`, `SCIENCE_HEALTH`, `TECH`, `CULTURE`, `SPORT`, `OTHER` (« Autre », voir `DECISIONS.md`).
- Présentation (voir `DECISIONS.md`, refonte de l'interface) : ordre des blocs (`TEXT_FIRST` ou `MEDIA_FIRST`), police de chaque bloc, gras et italique ; les tailles sont fixées par l'app.

|                  | `ARTICLE`                               | `OPINION`                                                               |
| ---------------- | --------------------------------------- | ----------------------------------------------------------------------- |
| Indicateur       | Barre de fiabilité                      | Vote parmi 2 à 4 choix définis par l'éditeur (§7)                       |
| Résultat du vote | —                                       | Caché tant que l'utilisateur n'a pas voté ou cliqué « Voir sans voter » |
| Commentaires     | `commentsEnabled` au choix de l'éditeur | **Toujours** activés (non désactivable)                                 |
| Signalement      | Oui                                     | Oui                                                                     |

- Un post publié n'est **pas modifiable** sauf via une **correction** (`PostCorrection` : texte + date),
  affichée publiquement sous l'article. Hors MVP si besoin, mais le modèle doit le prévoir.
- `viewCount` : nombre de lecteurs uniques (un compte = une vue ; visiteurs anonymes dédupliqués par session).

---

## 4. Fil et recherche

### 4.1 Fil (MVP)

- Posts publiés dans les **48 dernières heures** (`FEED_WINDOW_HOURS`), du plus récent au plus ancien.
- Pagination par curseur (`createdAt` + `id`), pas par numéro de page.
- Les posts d'auteurs **bloqués** par le lecteur sont exclus.
- Le vote sur les opinions n'intervient **jamais** dans le tri.

### 4.2 Fil pondéré (post-MVP)

- Tirage pondéré : poids = f(fraîcheur, statut de fiabilité).
- Division par √n : `poids_article = poids / sqrt(n)` où n = posts de l'éditeur dans la fenêtre.
- Espacement : un même éditeur n'apparaît pas deux fois dans `FEED_SPACING` (4) posts consécutifs.
- Choix « À la une » dans les filtres ; le fil reste chronologique par défaut. Fonction de poids, tirage et pagination : voir `DECISIONS.md`.

### 4.3 Filtres (combinables entre eux)

- `today` : publiés dans les **24 dernières heures** (fenêtre glissante, pas « depuis minuit »).
- `zone` : une valeur de `Zone`.
- `theme` : une valeur de `Theme`.

### 4.4 Recherche

- Une barre unique : pseudos d'éditeurs, titres, mots-clés du contenu.
- MVP : recherche plein texte PostgreSQL (`tsvector`, config `french`) + `pg_trgm` pour la tolérance aux fautes sur pseudos et titres.
- Combinable avec les filtres ci-dessus.

---

## 5. Fiabilité et signalements d'articles

### 5.1 Signalement

- Motif obligatoire (`PostReportReason`) : `DUBIOUS_SOURCE`, `OUT_OF_CONTEXT_MEDIA`, `FALSE_INFORMATION`, `MISLEADING`, `OTHER` (+ texte libre obligatoire si `OTHER`).
- Un compte ne peut signaler un même post qu'une fois.
- Un éditeur ne peut pas signaler ses propres posts.

### 5.2 Poids d'un signalement

Calculé **au moment du signalement** et stocké dans `Report.weight` :

```
si âge du compte < 30 jours            → 0.2
sinon si (upheld + dismissed) < 5      → 1.0
sinon ratio = upheld / (upheld + dismissed)
      weight = 0.1 + 1.9 × ratio         (donc entre 0.1 et 2.0)
```

### 5.3 Seuil de revue d'un article

```
score = somme des weight des signalements PENDING du post
seuil = max(POST_REPORT_MIN_SCORE (5), POST_REPORT_AUDIENCE_RATIO (0.01) × viewCount)
si score ≥ seuil et reviewStatus = NOT_REVIEWED → reviewStatus = UNDER_REVIEW
```

L'article **reste visible** pendant la revue (contrairement aux commentaires).

### 5.4 File de revue

Triée par priorité décroissante : `priorité = score × log10(viewCount + 10)`.

### 5.5 Revue (MVP : par l'équipe)

- Un modérateur rend un verdict (`Verdict`) : `ACCURATE`, `MISSING_CONTEXT`, `MISLEADING`, `FALSE`, `UNVERIFIABLE`.
- Note publique obligatoire (texte) + au moins une source.
- Passage à `reviewStatus = REVIEWED`. Les signalements deviennent `UPHELD` (si verdict ≠ `ACCURATE`) ou `DISMISSED` (si `ACCURATE`), ce qui met à jour les compteurs des signaleurs.
- L'éditeur dispose de **48 h** (`EDITOR_REPLY_HOURS`) pour publier une réponse ou une correction, affichée sous la note.
- L'éditeur peut faire **appel** une fois : un autre modérateur (pas celui du verdict initial) réexamine.

### 5.6 Barre de fiabilité (affichage)

| État                       | Texte                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| Aucun signalement          | « Non examiné »                                                                                        |
| Signalements sous le seuil | « Non examiné · N signalements »                                                                       |
| `UNDER_REVIEW`             | « N signalements · en cours d'examen »                                                                 |
| `REVIEWED`                 | « N signalements · examiné : <verdict> » + bouton « Pourquoi ? » (note, sources, réponse de l'éditeur) |

Les opinions n'ont pas de barre de fiabilité.

### 5.7 Jauge de fiabilité d'un compte éditeur (post-MVP)

Départ 50/100. Verdicts des 12 derniers mois : `ACCURATE` +2, `MISSING_CONTEXT` −1, `MISLEADING` −5, `FALSE` −10.
Pénalité divisée par 2 si l'éditeur avait publié une correction **avant** le verdict. Pondération dégressive avec l'ancienneté.
Affichage en paliers : Très fiable, Fiable, Vigilance, Historique insuffisant (< 3 verdicts).
Pondération, seuils et affichage : voir `DECISIONS.md`.

### 5.8 Revue communautaire (post-MVP)

Jury de 7 contributeurs tirés au sort (comptes anciens, sans sanction, sans lien avec un média),
source obligatoire par vote, validation finale par un modérateur. Détails : voir `DECISIONS.md`.

---

## 6. Commentaires

- Réservés aux comptes connectés. Contenu texte, longueur max `COMMENT_MAX_LENGTH`.
- Réponses en **fil** (un niveau de profondeur suffit au MVP : `parentId` pointe vers un commentaire racine).
- Triés **par date croissante**.
- **Jamais modifiables.**
- Suppression **toujours logique** : `deletedAt`, `deletedBy` (`AUTHOR` | `MODERATOR`). Un commentaire supprimé par son auteur n'est plus affiché, ni ses réponses (voir `DECISIONS.md`).
- L'auteur ne peut **pas** supprimer un commentaire `UNDER_REVIEW`. Vérification et suppression
  dans **une seule transaction** (pas de condition de course).
- Purge définitive des commentaires supprimés après `RETENTION_DAYS` (valeur à fixer avec un juriste ; job planifié).

### 6.1 Statuts (`CommentStatus`)

`VISIBLE` → `UNDER_REVIEW` → `VERIFIED` ou `REMOVED`. `DELETED` si supprimé par l'auteur.

### 6.2 Modération

1. **Filtre automatique** avant publication : interface `ToxicityChecker` (MVP : liste de mots + normalisation des contournements simples ; remplaçable plus tard par un service). Un commentaire bloqué n'est pas publié et l'utilisateur voit pourquoi.
2. **Signalement** (`CommentReportReason`) : `INSULT`, `DISCRIMINATION`, `HARASSMENT`, `SPAM`, `OTHER`. Pondéré comme en 5.2.
3. Somme des poids ≥ `COMMENT_REPORT_THRESHOLD` (3) → `UNDER_REVIEW` : masqué pour tous sauf modérateurs.
4. **Décision humaine** :
   - conforme → `VERIFIED` : réaffiché avec le badge « ✓ Examiné par la modération : conforme aux règles », **plus signalable** ;
   - non conforme → `REMOVED` + sanction (6.3).
5. Un commentaire `VERIFIED` ne peut plus être signalé (le bouton est remplacé par le badge).

### 6.3 Sanctions (`SanctionType`)

Comptées sur les commentaires `REMOVED` des 6 derniers mois (`SANCTION_RESET_MONTHS`) :

| N°  | Sanction         |
| --- | ---------------- |
| 1   | `WARNING`        |
| 2   | `SUSPENSION_24H` |
| 3   | `SUSPENSION_7D`  |
| 4   | `PERMANENT_BAN`  |

- **Discrimination** (motif confirmé par un humain : origine, religion, sexe, orientation sexuelle, handicap…) → `PERMANENT_BAN` direct.
- Le modérateur peut cocher « À signaler sur PHAROS » : le dossier est marqué et exportable (le signalement lui-même se fait manuellement sur le site officiel).
- Toute sanction est contestable une fois (appel traité par un autre modérateur ou un `ADMIN`).
- Un compte suspendu peut lire mais ni publier, ni commenter, ni voter, ni signaler.
- Les mêmes règles s'appliquent aux posts des éditeurs.

---

## 7. Votes sur les opinions

- L'éditeur définit les **choix de réponse** en publiant l'opinion : **2 à 4 choix**, « D'accord » et
  « Pas d'accord » par défaut, renommables (`VOTE_OPTIONS_MIN`, `VOTE_OPTIONS_MAX`,
  `VOTE_OPTION_LABEL_MAX_LENGTH`, libellés distincts sans tenir compte de la casse). Ils ne sont plus
  modifiables ensuite (un post publié n'est pas modifiable, §3).
- Un vote par compte et par opinion (un des choix), **définitif** : le lecteur sélectionne un choix puis
  confirme (« Valider mon vote ») ; il ne peut plus le changer.
- « Voir sans voter » est aussi **définitif** et demande une confirmation : un lecteur qui a vu les
  résultats ne peut plus voter. Principe : un vote ne doit jamais être influencé par celui des autres.
- Résultats : pourcentage et barre par choix, nombre total de votes, choix de l'utilisateur mis en évidence.
- L'API **ne renvoie pas** les totaux à un utilisateur qui n'a ni voté ni demandé « Voir sans voter » (`revealedResults`).
- Les votes n'entrent dans aucun calcul de tri.

---

## 8. Support et chats

- Page « Parler à l'équipe », accessible à tout compte connecté → crée un `Ticket` (`kind = SUPPORT`).
- Un modérateur peut ouvrir un `Ticket` (`kind = EDITOR_CHAT`) avec un éditeur (par exemple au sujet d'un signalement).
- États (`TicketStatus`) : `NEW` → `ASSIGNED` → `CLOSED`.
  - Un ticket `ASSIGNED` n'est visible que de son modérateur (et des `ADMIN`).
  - L'attribution est **atomique** : deux modérateurs qui cliquent en même temps → un seul gagne (update conditionnel `WHERE status = 'NEW'`).
  - Sans message du modérateur depuis `TICKET_ASSIGN_TIMEOUT_HOURS` (24 h) → retour à `NEW` (job planifié).
- Messages : **ni modification, ni suppression**. Texte uniquement au MVP.
- Rafraîchissement par polling au MVP (pas de WebSocket).
- Lecture d'un chat par un `ADMIN` → entrée `AuditLog`.

---

## 9. Pluralisme

- Pas d'étiquette politique, pas de vote des lecteurs sur l'orientation.
- Profil éditeur : ligne éditoriale déclarée, propriétaire (`ownerName`, `ownerGroup`).
- « Voir les similaires » (post-MVP) : posts partageant zone + thème + mots-clés, diversifiés par `ownerGroup` et taille d'éditeur. Détails : voir `DECISIONS.md`.

---

## 10. Exigences des stores et RGPD

- **Bloquer un utilisateur** : ses posts et commentaires ne sont plus affichés au bloqueur.
- **Supprimer son compte** depuis l'app (exigence Apple) : anonymisation du compte, contenus conservés de façon logique selon `RETENTION_DAYS`.
- Pages statiques : politique de confidentialité (mentionne la conservation des chats et leur lecture possible par la direction), règles de la communauté, mentions légales.
- Mots de passe hachés (argon2). Identités et documents d'éditeurs en accès restreint.

---

## 11. Constantes (source : `packages/shared/src/rules.ts`)

| Constante                      | Valeur    | Remarque                        |
| ------------------------------ | --------- | ------------------------------- |
| `FEED_WINDOW_HOURS`            | 48        |                                 |
| `TODAY_WINDOW_HOURS`           | 24        | Fenêtre glissante               |
| `COMMENT_REPORT_THRESHOLD`     | 3         | Somme des poids                 |
| `POST_REPORT_MIN_SCORE`        | 5         |                                 |
| `POST_REPORT_AUDIENCE_RATIO`   | 0.01      | 1 % des lecteurs                |
| `NEW_ACCOUNT_DAYS`             | 30        |                                 |
| `REPORT_WEIGHT_NEW_ACCOUNT`    | 0.2       |                                 |
| `REPORT_HISTORY_MIN_SAMPLE`    | 5         |                                 |
| `REPORT_WEIGHT_MIN` / `MAX`    | 0.1 / 2.0 |                                 |
| `EDITOR_REPLY_HOURS`           | 48        |                                 |
| `TICKET_ASSIGN_TIMEOUT_HOURS`  | 24        |                                 |
| `SANCTION_RESET_MONTHS`        | 6         |                                 |
| `FEED_SPACING`                 | 4         | Post-MVP                        |
| `COMMENT_MAX_LENGTH`           | 2000      | Provisoire                      |
| `POST_TITLE_MAX_LENGTH`        | 200       | Provisoire                      |
| `POST_SUMMARY_MAX_LENGTH`      | 500       | Provisoire                      |
| `VOTE_OPTIONS_MIN` / `MAX`     | 2 / 4     | Choix de réponse d'une opinion  |
| `VOTE_OPTION_LABEL_MAX_LENGTH` | 50        |                                 |
| `RETENTION_DAYS`               | 365       | **À confirmer avec un juriste** |
