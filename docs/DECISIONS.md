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
