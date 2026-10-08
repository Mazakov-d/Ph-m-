import type { AuthSession, PostPublic, PostSummaryPublic, UserRole } from "@fama/shared";

export function sessionFor(
  role: UserRole,
  editorStatus: AuthSession["user"]["editorStatus"] = null,
): AuthSession {
  return {
    user: {
      id: "0b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
      email: "test@fama.test",
      pseudo: "Testeur",
      role,
      editorStatus,
      suspendedUntil: null,
      bannedAt: null,
    },
    tokens: { accessToken: "access", refreshToken: "refresh" },
  };
}

export const ARTICLE_CARD: PostSummaryPublic = {
  id: "1b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
  kind: "ARTICLE",
  title: "Le budget adopté",
  summary: "Les députés ont voté le budget.",
  bodyExcerpt: "Texte complet de l'article.",
  layout: "TEXT_FIRST",
  typefaces: { title: "MERRIWEATHER", summary: "INTER", body: "MERRIWEATHER" },
  zone: "FRANCE",
  region: null,
  theme: "POLITICS",
  editor: {
    id: "2b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
    pseudo: "Le Monde",
    editorStatus: "CERTIFIED",
  },
  coverImage: null,
  commentCount: 2,
  reviewStatus: "NOT_REVIEWED",
  reportCount: 0,
  verdict: null,
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
};

export const OPINION_CARD: PostSummaryPublic = {
  ...ARTICLE_CARD,
  id: "3b1e4a3c-6f1d-4d6b-9a52-3c2f0e7d8a11",
  kind: "OPINION",
  title: "Faut-il rouvrir le débat ?",
  commentCount: 0,
};

export const ARTICLE_DETAIL: PostPublic = {
  ...ARTICLE_CARD,
  zone: "LOCAL",
  region: "Bretagne",
  body: "Texte complet de l'article.",
  sources: ["https://www.insee.fr", "Compte rendu de séance"],
  images: [],
  commentsEnabled: true,
  corrections: [],
  votes: null,
  viewerHasReported: false,
  editorReliability: "RELIABLE",
};
