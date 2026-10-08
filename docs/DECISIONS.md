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
- **Décision** : l'application s'appelle **Fama** (renommée **Phémé** depuis, voir plus bas), slogan « La rumeur, sourcée. » (`APP_NAME`, `APP_SLOGAN`
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

## 2026-10-08 — Modération des commentaires, sanctions et blocage (sans validation)

- **Question** : la SPEC (§6.2, §6.3, §10) laisse ouverts plusieurs détails ; le porteur du projet a
  demandé d'enchaîner les phases sans s'arrêter : **décisions prises sans validation, à relire**.
- **Décision** :
  - un commentaire se signale comme un post (poids §5.2, un signalement par compte, jamais le sien) ;
    impossible s'il est `VERIFIED`, supprimé ou retiré ; possible tant qu'il est `UNDER_REVIEW` ;
  - file des commentaires signalés : `UNDER_REVIEW`, triée par somme des poids décroissante, sans les
    dossiers en conflit d'intérêts ; décision par update conditionnel ; un retrait est logique
    (`REMOVED`, `deletedAt`, `deletedBy = MODERATOR`) ;
  - sanctions (§6.3) comptées sur les commentaires **et** les opinions retirés des 6 derniers mois
    (« les mêmes règles s'appliquent aux posts ») ; `SUSPENSION_24H` = 24 h, `SUSPENSION_7D` = 7 jours
    à partir de la décision (une suspension en cours n'est jamais raccourcie) ; `PERMANENT_BAN` fixe
    `bannedAt` ; `WARNING` n'a pas d'effet sur le compte ;
  - « À signaler sur PHAROS » est enregistré sur la sanction (export manuel à prévoir) ;
  - appel d'une sanction : une fois, sans délai, par le compte sanctionné (même suspendu ou banni),
    tranché par un autre modérateur ou un dirigeant (jamais l'auteur de la sanction) ; accepté, il
    lève la sanction (`liftedAt`), retire la restriction qu'elle avait posée et le contenu repasse en
    `VERIFIED` (examiné et jugé conforme en appel) ;
  - opinions signalées : file des opinions ayant des signalements en attente (triée par somme des
    poids) ; décision « conforme » (signalements rejetés) ou « retirer » (`Post.removedAt`,
    signalements retenus) + sanction de l'éditeur par `nextSanction` ; une opinion retirée disparaît
    du fil et du profil, son contenu est masqué par lien direct ;
  - blocage (§10) : un compte bloque un autre compte (jamais lui-même) ; les posts et les fils de
    commentaires dont la racine est d'un compte bloqué, ainsi que ses réponses, ne sont plus envoyés au
    bloqueur (le fil, les commentaires) ; un post reste accessible par lien direct ;
  - toutes les décisions de modération (commentaire, opinion, appel de sanction) écrivent un `AuditLog`.
- **Pourquoi** : déduit de la SPEC ; à confirmer par le porteur du projet.

## 2026-10-08 — Support et chats (sans validation)

- **Question** : la SPEC (§8) ne précise pas qui voit quoi dans un ticket ni le détail des états.
- **Décision** (prise sans validation, à relire) :
  - un ticket `SUPPORT` est ouvert par un lecteur ou un éditeur (`support.open`, y compris suspendu ou
    banni, pour contester) avec un premier message ; un `EDITOR_CHAT` est ouvert par un modérateur ou
    un dirigeant avec un éditeur validé et lui est directement attribué (`ASSIGNED`) ;
  - participants : l'auteur d'un ticket `SUPPORT` (ou l'éditeur d'un `EDITOR_CHAT`) et le modérateur
    attribué ; les modérateurs voient la liste des tickets `NEW` (avec le premier message) et les leurs ;
    un dirigeant voit tout, et **chaque lecture d'une conversation à laquelle il ne participe pas
    crée une entrée `AuditLog`** ;
  - attribution atomique (update conditionnel `WHERE status = 'NEW'`) ; seul le modérateur attribué
    (ou un dirigeant) ferme un ticket ; un ticket fermé ne reçoit plus de message ;
  - retour à `NEW` (et retrait du modérateur) quand le dernier message du modérateur — ou à défaut
    l'attribution — date de 24 h (`TICKET_ASSIGN_TIMEOUT_HOURS`) : tâche planifiée toutes les 10 min ;
  - messages : texte seul, ajout uniquement ; rafraîchissement de la conversation toutes les 10 s.
- **Pourquoi** : déduit de la SPEC ; à confirmer par le porteur du projet.

## 2026-10-08 — Recherche (sans validation)

- **Question** : la SPEC (§4.4) fixe la technique (plein texte `french` + `pg_trgm`) mais pas la portée.
- **Décision** (prise sans validation, à relire) :
  - recherche insensible aux accents (`unaccent`) : « economie » trouve « économie » ;
  - posts : tous les posts non retirés (pas seulement les 48 h du fil), `today` limitant aux 24 h ;
    plein texte pondéré titre > résumé > corps, plus tolérance aux fautes sur le titre (`pg_trgm`) ;
    triés par pertinence ; sans les auteurs bloqués par le lecteur ; 20 résultats au plus, sans
    pagination au MVP ;
  - éditeurs : éditeurs validés dont le pseudo ressemble à la recherche (`pg_trgm`), 5 au plus ;
  - la recherche commence à 2 caractères (100 au plus).
- **Pourquoi** : déduit de la SPEC ; à confirmer par le porteur du projet.

## 2026-10-08 — Suppression de compte et purge (sans validation, à confirmer avec un juriste)

- **Question** : la SPEC (§10, §6) demande l'anonymisation du compte supprimé et une purge selon
  `RETENTION_DAYS` (à fixer avec un juriste) sans en préciser le détail.
- **Décision** (prise sans validation, à relire avec un juriste) :
  - la suppression se fait depuis l'app, **avec le mot de passe** ; elle est immédiate : e-mail
    remplacé, mot de passe rendu inutilisable, sessions révoquées, `deletedAt` renseigné, pseudo
    remplacé par « Compte supprimé » (unicité des pseudos limitée aux comptes actifs ; ce pseudo est
    réservé à l'inscription) ; le profil éditeur public disparaît ;
  - les contenus (posts, commentaires, messages) restent, signés « Compte supprimé » ;
  - purge quotidienne : le texte des commentaires supprimés ou retirés depuis plus de `RETENTION_DAYS`
    est effacé définitivement, avec leurs signalements (la ligne vide reste, pour ne pas casser le fil
    des réponses) ; l'identité légale et les documents d'un éditeur
    dont le compte est supprimé depuis plus de `RETENTION_DAYS` sont effacés ;
  - un compte banni peut aussi supprimer son compte.
- **Pourquoi** : exigence Apple (§10) et RGPD ; la durée de conservation légale reste à confirmer.

## 2026-10-08 — Limitation de débit (sans validation)

- **Question** : la ROADMAP (phase 11) demande de limiter le débit sans fixer de valeurs.
- **Décision** (prise sans validation, à relire) : inscription 5 par heure et connexion 10 par 15 min,
  par adresse IP ; commentaires 10 par minute et signalements 20 par heure, par compte ; au-delà,
  réponse 429 `RATE_LIMITED`. Compteurs en mémoire : suffisant pour une seule instance de l'API ; un
  stockage partagé (Redis) sera nécessaire avec plusieurs instances.
- **Pourquoi** : limiter la création de comptes en masse, les essais de mots de passe et le spam.

## 2026-10-08 — Builds mobiles et déploiement de l'API (sans validation)

- **Question** : la ROADMAP (phase 11) demande la configuration EAS et le déploiement de l'API ;
  l'hébergeur n'est pas choisi.
- **Décision** (prise sans validation, à relire) :
  - **Builds** : EAS Build, profils `development` (client de dev, distribution interne), `preview`
    (distribution interne, API de préproduction) et `production` (numéro de build incrémenté par
    EAS). L'adresse de l'API passe par `EXPO_PUBLIC_API_URL` dans `apps/mobile/eas.json`.
    Identifiants provisoires `app.fama.mobile` (iOS et Android) et adresses `*.fama.example` :
    **à remplacer** par le nom de domaine et les identifiants réels avant le premier build.
  - **API** : une image Docker indépendante de l'hébergeur (`apps/api/Dockerfile`) qui applique les
    migrations puis démarre l'API. Elle peut tourner chez n'importe quel hébergeur de conteneurs
    (Scaleway, Fly.io, Render, Railway…) ; recommandation : un hébergeur en Europe (RGPD) avec
    PostgreSQL managé et un stockage S3 privé dans la même région.
  - **Exigences de production** : `JWT_ACCESS_SECRET` long et aléatoire ; `CORS_ORIGINS` limité au
    site web ; l'API et le site web sur le même domaine racine (ex. `api.fama.fr` et `fama.fr`),
    car le cookie de session web est `SameSite` ; HTTPS obligatoire ; une seule instance tant que la
    limitation de débit garde ses compteurs en mémoire (sinon ajouter Redis).
- **Pourquoi** : rester libre de l'hébergeur tant qu'il n'est pas choisi ; l'image a été construite
  et démarrée localement (migrations appliquées, `/health` répond).

## 2026-10-08 — Refonte de l'interface d'après `interface.txt` (sans validation)

- **Question** : la phase 10 bis attendait la direction visuelle du porteur du projet ; il l'a
  décrite dans `interface.txt`. Plusieurs points demandaient un choix technique.
- **Décision** (prise sans validation, à relire) :
  - **Ordre des blocs** : l'éditeur choisit « titre, résumé, texte, photos » (`TEXT_FIRST`, par
    défaut) ou « titre, résumé, photos, texte » (`MEDIA_FIRST`). La carte du fil montre les trois
    premiers blocs : la photo de couverture, ou le début du texte (280 caractères, coupé sur un
    mot). Un post `MEDIA_FIRST` sans photo montre son texte. Les vidéos restent hors MVP (phase 12).
  - **Mise en forme** : une police par champ (titre, résumé, texte) parmi trois polices système
    (sans empattement, avec empattement, machine à écrire), sans téléchargement ; les tailles sont
    fixées par l'app. Gras et italique s'écrivent `**gras**` et `*italique*` (boutons B et I qui
    entourent la sélection, aperçu sous le champ). Les écrans de modération montrent le texte sans
    mise en forme. Les marques comptent dans les longueurs maximales.
  - **Thème « Autre »** (`OTHER`) ajouté, pour les sujets hors de la liste. (Autre lecture
    possible du brief : pouvoir choisir plusieurs thèmes à la fois ; non retenue.)
  - **Page d'un post** : le post est dans un cadre ; l'espace commentaires sort de dessous le
    cadre, un peu plus étroit ; les sources sont repliées derrière un bouton « Sources (n) » qui
    ouvre une fenêtre ; la zone de saisie d'un commentaire est en bas, la touche Entrée publie.
  - **Filtres** : affichés quand on touche la barre de recherche, regroupés (Période, Zone, Thème)
    avec la phrase « Combinez une période, une zone et un thème. » ; une fois masqués, un rappel
    « Filtres : … · Modifier » reste visible s'il y en a d'actifs.
  - **Web et tablettes** : le fil et les résultats de recherche passent à 2 colonnes à partir de
    760 px de large, 3 à partir de 1140 px.
  - **Base visuelle** : couleurs, espacements et tailles de texte regroupés dans
    `apps/mobile/src/components/ui/theme.ts` (bleu marine `#1d3557` conservé comme couleur
    principale, fond gris clair, cartes blanches bordées).
- **Pourquoi** : suivre le brief au plus près sans ajouter de dépendance (éditeur de texte riche,
  polices téléchargées) ; tout reste réglable dans `theme.ts`.

## 2026-10-08 — Retours du porteur sur la refonte (sans validation pour les points marqués)

- **Question** : retours du porteur après la première refonte (éditeur de texte, navigation,
  commentaires, recherche).
- **Décision** :
  - **Éditeur de texte** : les boutons B et I agissent comme dans un traitement de texte (sur la
    sélection, ou activés avant de taper), et le texte s'affiche en gras ou en italique pendant la
    saisie. L'éditeur est un composant DOM d'Expo (une vue web sur iOS et Android, dépendance
    `@expo/dom-webview`), car un champ natif ne sait pas afficher des mots en gras. Le stockage
    reste le texte balisé (`**gras**`, `*italique*`, `***les deux***`).
  - **Polices proposées** (sans validation) : Inter, Merriweather, Playfair Display, Lora,
    IBM Plex Mono, embarquées dans l'app (`expo-font`, `@expo-google-fonts/*`) en quatre variantes.
  - **Navigation** : trois onglets dans l'en-tête — « Fama » (le fil, nom de l'app centré sur le
    web, à gauche sur téléphone), « Publier » (éditeurs) et « Compte » ; l'onglet courant est
    grisé ; changer d'onglet n'empile pas de page. Un post ou une page ouverte depuis le compte
    s'ouvre au-dessus, avec « < » pour revenir.
  - **Commentaires** : « Répondre », « Supprimer » (les siens), « Signaler » et « Bloquer » sont
    dans un menu « ⋯ » sur la ligne du pseudo.
  - **Commentaire supprimé par son auteur** : il n'est plus envoyé par l'API (il reste en base,
    suppression logique) et ne compte plus dans le nombre de commentaires. Remplace l'affichage
    « Commentaire supprimé » de la SPEC §6. **Sans validation** : les réponses à un commentaire
    supprimé disparaissent avec lui (elles n'ont plus de commentaire auquel se rattacher).
  - **Recherche** : les filtres s'ouvrent par-dessus le fil, se ferment par un appui à côté, et
    défilent au-dessus du clavier.
  - **Post** : pleine largeur, titre centré ; sur une fenêtre large, le texte et les photos côte à
    côte (ordre choisi par l'éditeur) ; les cartes du fil grandissent avec la fenêtre.
  - **Mot de passe** : un bouton « Afficher » / « Masquer » dans chaque champ de mot de passe.

## 2026-10-08 — Deuxième retour sur l'interface (sans validation pour les points marqués)

- **Question** : le porteur veut une vraie liste de polices connues (au moins une trentaine), une
  flèche de retour dessinée, le post en une seule colonne centrée et le compte dans une boîte
  centrée.
- **Décision** :
  - **Polices** (liste sans validation) : 33 polices libres connues (Google Fonts, celles qu'on
    retrouve dans WordPress), présentées dans une liste cliquable groupée par famille, chaque nom
    écrit dans sa police : 16 sans empattement (Inter, Roboto, Open Sans, Lato, Montserrat,
    Poppins, Raleway, Nunito, Work Sans, Source Sans 3, Noto Sans, PT Sans, Ubuntu, Fira Sans,
    Rubik, IBM Plex Sans), 12 avec empattement (Merriweather, Playfair Display, Lora, EB Garamond,
    Crimson Text, PT Serif, Noto Serif, Source Serif 4, Cormorant Garamond, Bitter, Alegreya, Arvo)
    et 5 à chasse fixe (IBM Plex Mono, JetBrains Mono, Source Code Pro, Roboto Mono, Space Mono).
    Toutes existent en normal, gras, italique et gras italique.
  - **Téléchargement à la demande** (sans validation) : les polices ne sont plus embarquées dans
    l'app (33 × 4 fichiers l'alourdiraient de plusieurs Mo) ; elles sont téléchargées depuis le CDN
    Fontsource (jsDelivr) quand un texte en a besoin, puis gardées. En attendant, ou sans réseau,
    le texte s'affiche dans la police du système. Les anciennes valeurs sont renommées en base
    (`SANS` → `INTER`, `SERIF` → `MERRIWEATHER`, `MONO` → `IBM_PLEX_MONO`, `DISPLAY` →
    `PLAYFAIR_DISPLAY`, `BOOK` → `LORA`) : les posts gardent leur police.
  - **Retour** : une flèche dessinée remplace le caractère « < ».
  - **Page d'un post** : retour à une seule colonne centrée (largeur de lecture limitée), titre
    centré ; l'affichage côte à côte sur le web est abandonné.
  - **Compte** : les actions sont dans une boîte centrée à l'écran ; hors connexion, le slogan
    « La rumeur, sourcée. » est en tête de la boîte.
  - **Connexion et inscription** : les formulaires s'ouvrent dans la même boîte centrée que le
    compte, sous le slogan, avec un lien pour passer de l'un à l'autre. Les pages `/login` et
    `/register` (liens « Connectez-vous pour commenter ») montrent la même boîte.
  - **Pages du compte** : toutes les pages ouvertes depuis le compte (espace éditeur, sanctions,
    comptes bloqués, support et tickets, modération, administration, pages légales) s'affichent
    dans la même boîte centrée, plus ou moins large selon le contenu (420, 560 ou 760 points).

## 2026-10-08 — Fil pondéré « À la une » (SPEC §4.2)

- **Question** : la SPEC §4.2 dit « poids = f(fraîcheur, statut de fiabilité) » sans fixer f, ni
  la façon de garder un tirage stable pendant le défilement, ni la place de ce fil.
- **Décision** (validée par le porteur du projet) :
  - fraîcheur : demi-vie de 12 h (1 à la publication, 0,5 à 12 h, 0,25 à 24 h) ;
  - fiabilité : non examiné 1 · en examen 0,5 · exact 1,2 · contexte manquant 0,7 ·
    invérifiable 0,6 · trompeur 0,3 · faux 0,1 · opinion 1 ;
  - poids = fraîcheur × fiabilité / √n (n = posts du même éditeur parmi ceux du fil filtré) ;
  - tirage pondéré sans remise, fixé par une graine tirée par le lecteur à chaque ouverture ou
    rafraîchissement du fil : l'ordre reste stable pendant le défilement ; les pages suivantes
    portent la graine et l'instant de la première page (les posts publiés entre-temps
    n'apparaissent qu'au rafraîchissement) ;
  - espacement : un éditeur au plus une fois sur 4 posts consécutifs quand c'est possible (un
    éditeur dont les posts ne tiendraient plus avec l'espacement passe en priorité) ;
  - le fil reste chronologique par défaut ; « À la une » se choisit dans les filtres (groupe
    « Ordre »), combinable avec les autres filtres. La recherche n'est pas concernée.

## 2026-10-08 — Nouveau nom : Phémé

- **Question** : le porteur du projet renomme l'application.
- **Décision** : l'application s'appelle **Phémé** (`APP_NAME`), le slogan reste « La rumeur,
  sourcée. ». Remplace le nom « Fama ». Le nom affiché, le lien profond (`pheme://`), les
  identifiants provisoires des stores (`app.pheme.mobile`) et les adresses d'exemple
  (`*.pheme.example`) changent. Les identifiants techniques internes restent (`@fama/shared`,
  base `fama`, cookie `fama_refresh`, clé `fama.refreshToken`, dossier du dépôt) : invisibles
  pour les utilisateurs, et les changer déconnecterait les sessions en cours.

## 2026-10-08 — Jauge de fiabilité des comptes éditeurs (SPEC §5.7)

- **Question** : la SPEC §5.7 ne fixe ni la pondération par l'ancienneté, ni les seuils des
  paliers, ni l'effet d'un verdict « invérifiable », ni l'endroit de l'affichage.
- **Décision** (validée par le porteur du projet) :
  - ancienneté : poids linéaire de 1 (verdict du jour) à 0,25 (verdict d'il y a 12 mois) ; au-delà,
    le verdict ne compte plus ;
  - invérifiable : 0 point, mais compte parmi les 3 verdicts nécessaires ;
  - paliers : Très fiable ≥ 60, Fiable ≥ 45, Vigilance en dessous ; Historique insuffisant sous
    3 verdicts ; score borné entre 0 et 100 ;
  - un article compte une fois, avec son dernier verdict (un verdict en appel remplace le premier) ;
    la pénalité est divisée par 2 si une correction a été publiée avant le verdict ;
  - affichage par palier seulement (jamais le score), sur le profil public de l'éditeur et à côté
    de son nom sur la page d'un post ; pas sur les cartes du fil.

## 2026-10-08 — « Voir les similaires » et « X autres médias en parlent » (SPEC §9)

- **Question** : la SPEC §9 dit « zone + thème + mots-clés, diversifiés par `ownerGroup` et taille
  d'éditeur » sans préciser les mots-clés, la période, la diversification ni l'affichage.
- **Décision** (validée par le porteur du projet, sauf les points marqués) :
  - même zone et même thème ; pour une publication locale, même région aussi (**sans
    validation**) ;
  - au moins 2 mots significatifs en commun dans le titre et le résumé (dictionnaire français de
    PostgreSQL, accents ignorés, mots vides comme « le » ou « de » exclus) ; aucun champ de
    mots-clés à remplir ;
  - posts publiés jusqu'à 7 jours avant ou après le post lu, d'autres éditeurs que son auteur,
    jamais d'un éditeur que le lecteur a bloqué ;
  - au plus un post par groupe propriétaire (un éditeur sans groupe compte pour un groupe), en
    alternant éditeurs certifiés et indépendants, 5 au plus ;
  - « X autres médias en parlent » compte les éditeurs distincts (**sans validation**) ;
  - affichage sur la page d'un post, sous l'article : le compteur et « Voir les similaires », qui
    déplie la liste ; rien sur les cartes du fil, rien quand personne d'autre n'en parle.
