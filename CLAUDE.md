# CLAUDE.md

Instructions permanentes pour Claude Code sur ce projet. À lire au début de chaque session.

- **Quoi construire** : `docs/SPEC.md` (règles métier, fait foi).
- **Dans quel ordre** : `ROADMAP.md` (phases et tâches cochables).
- **Comment l'écrire** : ce fichier.

Langue : code, identifiants, commits en **anglais** ; interface utilisateur et docs en **français**.

---

## 1. Façon de travailler

1. Prendre la **première tâche non cochée** de `ROADMAP.md`. Une tâche à la fois.
2. Relire la section de `docs/SPEC.md` concernée avant de coder.
3. Implémenter **avec ses tests**.
4. Lancer `pnpm check` (lint + typecheck + tests). Il doit être vert.
5. Cocher la tâche dans `ROADMAP.md`, puis commit (format Conventional Commits : `feat(comments): ...`).
6. **À la fin de chaque phase : s'arrêter** et résumer ce qui a été fait pour validation humaine.

Règles :

- Ne jamais inventer une règle métier. Si la SPEC est muette ou ambiguë : poser la question, puis
  consigner la réponse dans `docs/DECISIONS.md` (date, question, décision).
- Ne pas ajouter de dépendance sans dire pourquoi dans le message de commit.
- Ne pas anticiper les phases suivantes (pas de code « pour plus tard »).
- Préférer du code simple et explicite à du code astucieux. Un lecteur débutant doit pouvoir suivre.

---

## 2. Stack

| Rôle                         | Outil                                                        |
| ---------------------------- | ------------------------------------------------------------ |
| Langage                      | TypeScript, `strict: true`, `noUncheckedIndexedAccess: true` |
| Monorepo                     | pnpm workspaces                                              |
| App (iOS, Android, web)      | Expo + Expo Router                                           |
| État serveur côté app        | TanStack Query                                               |
| Formulaires                  | react-hook-form + `@hookform/resolvers/zod`                  |
| Backend                      | NestJS                                                       |
| Base de données              | PostgreSQL (Docker en local)                                 |
| ORM                          | Prisma                                                       |
| Validation et types partagés | Zod                                                          |
| Tests                        | Vitest (api, shared), Jest via `jest-expo` (mobile)          |
| Qualité                      | ESLint + Prettier                                            |

Utiliser les **dernières versions stables** au moment de l'initialisation et suivre leurs idiomes
(les exemples ci-dessous sont illustratifs : adapter la syntaxe si la version de Zod l'exige).

---

## 3. Structure du monorepo

```
.
├── apps/
│   ├── api/                 NestJS
│   │   ├── prisma/schema.prisma
│   │   └── src/
│   │       ├── common/      guards, pipes, decorators, filters
│   │       ├── prisma/      PrismaService
│   │       └── <domain>/    un dossier par domaine : posts, comments, reports, ...
│   │           ├── <domain>.module.ts
│   │           ├── <domain>.controller.ts
│   │           ├── <domain>.service.ts
│   │           ├── <domain>.mapper.ts       entité Prisma → DTO public
│   │           └── <domain>.service.spec.ts
│   └── mobile/              Expo
│       └── src/
│           ├── app/         écrans (Expo Router)
│           ├── features/<domain>/
│           │   ├── api.ts           hooks TanStack Query du domaine
│           │   └── components/      composants propres au domaine
│           ├── components/ui/       composants génériques (Button, Card, ...)
│           ├── providers/           AuthProvider, QueryProvider
│           └── lib/                 apiClient, tokenStorage
├── packages/
│   └── shared/
│       └── src/
│           ├── enums.ts
│           ├── rules.ts             constantes de la SPEC §11
│           ├── permissions.ts       matrice SPEC §2.5 + fonction can()
│           ├── domain/              fonctions métier pures (poids, seuils, sanctions)
│           ├── schemas/<domain>.ts  schémas Zod + types inférés
│           ├── errors.ts            codes d'erreur API
│           └── index.ts
├── docs/
├── docker-compose.yml
├── CLAUDE.md
└── ROADMAP.md
```

---

## 4. Le package `shared` : une seule source de vérité

### 4.1 Règle d'or

**Tout type qui traverse le réseau est défini UNE fois, dans `packages/shared`, sous forme de schéma Zod.**
Le type TypeScript est **dérivé** du schéma avec `z.infer`. On n'écrit jamais à la main un `type`
ou une `interface` qui duplique un schéma.

```ts
// packages/shared/src/enums.ts
import { z } from "zod";

export const CommentStatus = z.enum(["VISIBLE", "UNDER_REVIEW", "VERIFIED", "REMOVED", "DELETED"]);
export type CommentStatus = z.infer<typeof CommentStatus>;
```

```ts
// packages/shared/src/schemas/comment.ts
import { z } from "zod";
import { CommentStatus } from "../enums";
import { COMMENT_MAX_LENGTH } from "../rules";

// Ce que le client ENVOIE
export const createCommentInputSchema = z.object({
  postId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  content: z.string().trim().min(1).max(COMMENT_MAX_LENGTH),
});
export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;

// Ce que l'API RENVOIE au public
export const commentPublicSchema = z.object({
  id: z.string().uuid(),
  postId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  authorPseudo: z.string(),
  content: z.string().nullable(), // null si supprimé ou en revue
  status: CommentStatus,
  createdAt: z.string().datetime(), // ISO 8601, jamais un objet Date
});
export type CommentPublic = z.infer<typeof commentPublicSchema>;
```

### 4.2 Conventions de nommage

| Ce que c'est                                | Nom du schéma              | Nom du type          |
| ------------------------------------------- | -------------------------- | -------------------- |
| Entrée d'une création                       | `createXInputSchema`       | `CreateXInput`       |
| Entrée d'une mise à jour                    | `updateXInputSchema`       | `UpdateXInput`       |
| Paramètres de requête (filtres, pagination) | `xQuerySchema`             | `XQuery`             |
| Réponse publique                            | `xPublicSchema`            | `XPublic`            |
| Réponse réservée à la modération            | `xModerationSchema`        | `XModeration`        |
| Liste paginée                               | `paginated(xPublicSchema)` | `Paginated<XPublic>` |

### 4.3 Règles

- **Dates** : toujours des chaînes ISO (`z.string().datetime()`) dans les schémas réseau. Un `Date` ne survit pas au JSON.
- **Enums** : `z.enum([...])` dans `enums.ts`. Les enums Prisma portent **exactement** les mêmes valeurs ;
  un test (`enums.consistency.spec.ts` dans `apps/api`) vérifie l'égalité entre les deux.
- **Séparation public / privé** : un schéma public ne contient jamais de données sensibles
  (e-mail, identité légale non publique, poids de signalement, compteurs internes).
- **Constantes métier** : uniquement dans `rules.ts`. Aucun nombre magique ailleurs (`3`, `48`, `0.01`…).
- **Fonctions métier pures** dans `domain/` (sans accès base de données), chacune testée :
  `computeReportWeight`, `computePostReviewThreshold`, `nextSanction`, `canSeeVoteResults`, etc.
- **Permissions** : `permissions.ts` exporte la matrice et `can(user, permission): boolean`.
  Le backend l'utilise pour **autoriser**, l'app pour **masquer** des boutons. Seul le backend fait foi.
- `shared` ne dépend ni de NestJS, ni de React, ni de Prisma. Seulement de Zod.

---

## 5. Backend (NestJS)

### 5.1 Trois couches

| Couche     | Rôle                                                                         | Interdit                               |
| ---------- | ---------------------------------------------------------------------------- | -------------------------------------- |
| Controller | Route HTTP, validation d'entrée, permission, appel du service, renvoi du DTO | Logique métier, accès Prisma           |
| Service    | Règles métier, transactions, appels Prisma                                   | Connaître HTTP (`Request`, `Response`) |
| Mapper     | Entité Prisma → schéma public                                                | Effets de bord                         |

### 5.2 Validation des entrées

Toute entrée (`@Body`, `@Query`, `@Param`) passe par un `ZodValidationPipe` avec le schéma de `shared` :

```ts
// apps/api/src/common/pipes/zod-validation.pipe.ts
import { BadRequestException, PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({ code: "VALIDATION_ERROR", issues: result.error.issues });
    }
    return result.data;
  }
}
```

```ts
// apps/api/src/comments/comments.controller.ts
@Post()
@RequirePermission("comment.create")
create(
  @Body(new ZodValidationPipe(createCommentInputSchema)) input: CreateCommentInput,
  @CurrentUser() user: AuthUser,
): Promise<CommentPublic> {
  return this.commentsService.create(user, input);
}
```

### 5.3 Autres règles

- Ne **jamais** renvoyer un objet Prisma brut : toujours passer par le mapper.
- Authentification : `JwtAuthGuard` global ; les routes anonymes (lecture du fil) sont marquées `@Public()`.
- Autorisation : décorateur `@RequirePermission(...)` + `PermissionGuard` qui appelle `can()` de `shared`.
- Toute règle « vérifier puis modifier » (supprimer un commentaire non signalé, s'attribuer un ticket)
  se fait dans **une transaction** ou par **update conditionnel**, jamais en deux requêtes séparées.
- Suppressions : toujours logiques (`deletedAt`) sauf purge planifiée.
- Actions de modération et lectures de chat par un `ADMIN` → écrire un `AuditLog` dans la même transaction.
- Erreurs : format unique `{ code, message }`, codes listés dans `shared/src/errors.ts`.
- Jobs planifiés (`@nestjs/schedule`) : retour des tickets, purge de rétention.

---

## 6. App mobile (Expo / React)

### 6.1 Où vit chaque type d'état

| Type d'état                        | Outil                                                            | Exemples                                      |
| ---------------------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| Données venant de l'API            | **TanStack Query**                                               | fil, post, commentaires, tickets              |
| État local d'un composant          | `useState`                                                       | texte d'un champ, modal ouverte, onglet actif |
| Valeur calculée à partir d'autres  | **calcul direct dans le rendu** (`useMemo` seulement si coûteux) | nombre de réponses, libellé du statut         |
| Session globale, rarement modifiée | **Context**                                                      | utilisateur connecté (`AuthContext`)          |
| Formulaire                         | react-hook-form + schéma Zod partagé                             | publier un article, commenter                 |

### 6.2 Règles React

- **Jamais** de `fetch` dans un `useEffect` + `useState`. Les données serveur passent par TanStack Query.
- `useEffect` seulement pour se synchroniser avec un système extérieur (abonnement, timer, API native).
  Pas pour calculer une valeur, pas pour réagir à un clic.
- Pas d'état dérivé stocké : si une valeur se calcule à partir de props ou d'un autre état, on la calcule.
- **Context** : uniquement pour des données globales et peu changeantes (session, thème).
  Jamais de listes de données serveur dans un Context. La `value` est mémoïsée avec `useMemo`,
  les fonctions avec `useCallback`, et chaque Context a un hook dédié qui lève une erreur hors de son Provider.
- Composants courts (< ~150 lignes). Au-delà, extraire un sous-composant ou un hook.
- Aucune règle métier dans les composants : elles viennent de `shared` (`can()`, constantes, `domain/`).
- Toute réponse de l'API est **validée** avec le schéma public correspondant dans `apiClient`.

### 6.3 Modèles à suivre

**Mauvais** (à ne pas écrire) :

```tsx
const [comments, setComments] = useState<CommentPublic[]>([]);
useEffect(() => {
  fetch(`/posts/${postId}/comments`)
    .then((r) => r.json())
    .then(setComments);
}, [postId]);
```

**Bon** :

```ts
// apps/mobile/src/features/comments/api.ts
export const commentKeys = {
  all: ["comments"] as const,
  byPost: (postId: string) => [...commentKeys.all, "post", postId] as const,
};

export function useComments(postId: string) {
  return useQuery({
    queryKey: commentKeys.byPost(postId),
    queryFn: () => apiClient.get(`/posts/${postId}/comments`, z.array(commentPublicSchema)),
  });
}

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCommentInput) =>
      apiClient.post("/comments", input, commentPublicSchema),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: commentKeys.byPost(postId) }),
  });
}
```

**Context de session** :

```tsx
// apps/mobile/src/providers/AuthProvider.tsx
type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const signIn = useCallback(async (input: LoginInput) => {
    const session = await authApi.login(input);
    await tokenStorage.save(session.tokens);
    setUser(session.user);
    setStatus("authenticated");
  }, []);

  const signOut = useCallback(async () => {
    await tokenStorage.clear();
    setUser(null);
    setStatus("anonymous");
  }, []);

  const value = useMemo(() => ({ user, status, signIn, signOut }), [user, status, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
```

**Formulaire** :

```tsx
const form = useForm<CreateCommentInput>({
  resolver: zodResolver(createCommentInputSchema),
  defaultValues: { postId, parentId: null, content: "" },
});
```

### 6.4 Divers

- Jetons d'authentification via une abstraction `tokenStorage` : `expo-secure-store` sur mobile ;
  stratégie web décidée en phase 2 (consigner dans `docs/DECISIONS.md`).
- Textes de l'interface en français, regroupés par écran (pas de chaînes éparpillées dans la logique).
- Accessibilité : chaque bouton icône a un `accessibilityLabel`.

---

## 7. Qualité

- Interdits : `any`, `@ts-ignore`, `!` (non-null assertion), `as` pour contourner le typeur
  (sauf `as const` ou cas commenté et justifié).
- Fonctions et variables nommées par ce qu'elles font : `computeReportWeight`, pas `calc`.
- Commentaires : expliquer le **pourquoi** (référence à la SPEC, ex. `// SPEC §6: author cannot delete while under review`), pas le quoi.
- Tests obligatoires :
  - chaque fonction de `shared/src/domain/` (cas nominaux + limites : seuil exact, compte de 29 et 30 jours…) ;
  - la matrice de permissions (chaque rôle × chaque permission) ;
  - un test e2e (supertest, base de test) par parcours critique de la ROADMAP.
- `pnpm check` vert avant chaque commit.

---

## 8. Commandes

```bash
nvm use                              # Node 22 (.nvmrc)
cp apps/api/.env.example apps/api/.env
pnpm install                         # installe, compile shared et génère le client Prisma
docker compose up -d                 # PostgreSQL local (port 5434), requis par les tests de l'API
pnpm --filter api prisma migrate dev # migrations
pnpm --filter api prisma db seed     # données de démo
pnpm dev                             # shared (watch) + api (:3000) + mobile (Expo, :8081)
pnpm check                           # generate + lint + typecheck + tests (tout le monorepo)
pnpm format                          # formate tout le dépôt avec Prettier
```

Mettre à jour cette section si les commandes changent.
