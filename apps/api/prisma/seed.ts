// Demo data (ROADMAP phase 1): 1 admin, 2 moderators, 3 editors (PENDING, INDEPENDENT,
// CERTIFIED), 5 readers, 20 posts spread over 3 days, comments and votes.
// Dates are relative to now so the 48 h feed always has content.
// Every account uses the password DEMO_PASSWORD.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "argon2";
import {
  DEFAULT_VOTE_OPTIONS,
  type PostKind,
  type Theme,
  type UserRole,
  type Zone,
} from "@fama/shared";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { StorageService } from "../src/storage/storage.service.js";

const DEMO_PASSWORD = "fama-demo-2026";
const POST_COUNT = 20;
// 20 posts, one every 3.6 h: from now back to 68.4 h ago, so a few fall outside the 48 h feed.
const HOURS_BETWEEN_POSTS = 3.6;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set (see apps/api/.env.example)");
}
if (process.env.NODE_ENV === "production") {
  throw new Error("The demo seed wipes the database: never run it in production");
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
const now = Date.now();

function hoursAgo(hours: number): Date {
  return new Date(now - hours * MS_PER_HOUR);
}

function daysAgo(days: number): Date {
  return new Date(now - days * MS_PER_DAY);
}

async function wipeDatabase(): Promise<void> {
  // Child tables first; CASCADE takes care of the remaining foreign keys.
  await prisma.$executeRawUnsafe(`
    TRUNCATE "AuditLog", "Message", "Ticket", "Block", "Appeal", "Sanction", "EditorReply",
      "Review", "CommentReport", "PostReport", "Vote", "VoteOption", "Comment", "PostCorrection", "PostView",
      "PostSource", "PostImage", "Post", "EditorIdentity", "EditorProfile", "User" CASCADE
  `);
}

type SeedUser = {
  pseudo: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  upheldReportCount?: number;
  dismissedReportCount?: number;
};

async function createUsers(passwordHash: string) {
  const users: SeedUser[] = [
    { pseudo: "Direction Fama", email: "admin@fama.test", role: "ADMIN", createdAt: daysAgo(400) },
    { pseudo: "Modo Alice", email: "alice@fama.test", role: "MODERATOR", createdAt: daysAgo(300) },
    { pseudo: "Modo Bruno", email: "bruno@fama.test", role: "MODERATOR", createdAt: daysAgo(200) },
    { pseudo: "Le Monde", email: "lemonde@fama.test", role: "EDITOR", createdAt: daysAgo(365) },
    { pseudo: "Clara Enquêtes", email: "clara@fama.test", role: "EDITOR", createdAt: daysAgo(120) },
    // docs/DECISIONS.md: an applicant stays READER until the application is validated.
    { pseudo: "Nouveau Média", email: "nouveau@fama.test", role: "READER", createdAt: daysAgo(3) },
    // Readers with varied ages and report histories, to exercise computeReportWeight.
    {
      pseudo: "lecteur.ancien",
      email: "ancien@fama.test",
      role: "READER",
      createdAt: daysAgo(500),
      upheldReportCount: 8,
      dismissedReportCount: 2,
    },
    {
      pseudo: "lecteur.mitige",
      email: "mitige@fama.test",
      role: "READER",
      createdAt: daysAgo(200),
      upheldReportCount: 2,
      dismissedReportCount: 6,
    },
    {
      pseudo: "lecteur.regulier",
      email: "regulier@fama.test",
      role: "READER",
      createdAt: daysAgo(90),
    },
    { pseudo: "lecteur.29j", email: "recent29@fama.test", role: "READER", createdAt: daysAgo(29) },
    {
      pseudo: "lecteur.nouveau",
      email: "nouveau.lecteur@fama.test",
      role: "READER",
      createdAt: daysAgo(1),
    },
  ];

  const created = [];
  for (const user of users) {
    created.push(await prisma.user.create({ data: { ...user, passwordHash } }));
  }
  return created;
}

async function createEditors(editors: { id: string; pseudo: string }[]) {
  const [leMonde, clara, nouveau] = editors;
  if (!leMonde || !clara || !nouveau) {
    throw new Error("Three editor accounts are expected");
  }
  const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
  const moderator = await prisma.user.findFirstOrThrow({ where: { role: "MODERATOR" } });

  await prisma.editorProfile.create({
    data: {
      userId: leMonde.id,
      status: "CERTIFIED",
      editorialLine: "Quotidien d'information générale, national et international.",
      ownerName: "Société éditrice du Monde",
      ownerGroup: null,
      validatedById: admin.id,
      validatedAt: daysAgo(360),
    },
  });
  await prisma.editorProfile.create({
    data: {
      userId: clara.id,
      status: "INDEPENDENT",
      editorialLine: "Journalisme d'enquête indépendant sur l'environnement et le social.",
      ownerName: "Clara Martin",
      ownerGroup: null,
      showIdentityPublicly: true,
      validatedById: moderator.id,
      validatedAt: daysAgo(100),
    },
  });
  await prisma.editorProfile.create({
    data: {
      userId: nouveau.id,
      status: "PENDING",
      editorialLine: "Actualité locale de la région nantaise.",
      ownerName: "Association Nouveau Média",
      ownerGroup: null,
    },
  });

  const identities = [
    { userId: leMonde.id, legalFirstName: "Jeanne", legalLastName: "Durand" },
    { userId: clara.id, legalFirstName: "Clara", legalLastName: "Martin" },
    { userId: nouveau.id, legalFirstName: "Hugo", legalLastName: "Petit" },
  ];
  for (const identity of identities) {
    await prisma.editorIdentity.create({ data: { ...identity, documentKeys: [] } });
  }
  // The pending applicant gets a demo document, to try the moderator screen.
  await prisma.editorIdentity.update({
    where: { userId: nouveau.id },
    data: { documentKeys: [await storeDemoDocument(nouveau.id)] },
  });
}

// A minimal valid one-page PDF reading "Document de demonstration".
const DEMO_PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 120]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 58>>stream
BT /F1 16 Tf 20 60 Td (Document de demonstration) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF
`;

async function storeDemoDocument(userId: string): Promise<string> {
  const storage = new StorageService();
  await storage.onModuleInit();
  const key = `editor-documents/${userId}/demo.pdf`;
  await storage.put(key, new TextEncoder().encode(DEMO_PDF), "application/pdf");
  return key;
}

type SeedPost = { title: string; summary: string; zone: Zone; region: string | null; theme: Theme };

const POST_TOPICS: SeedPost[] = [
  {
    title: "Le budget de l'État adopté en première lecture",
    summary: "Les députés ont voté le projet de loi de finances après trois semaines de débats.",
    zone: "FRANCE",
    region: null,
    theme: "POLITICS",
  },
  {
    title: "L'inflation ralentit pour le troisième mois consécutif",
    summary:
      "Les prix à la consommation progressent moins vite, selon les derniers chiffres publiés.",
    zone: "FRANCE",
    region: null,
    theme: "ECONOMY",
  },
  {
    title: "Grève dans les transports régionaux",
    summary: "Les syndicats appellent à une journée de mobilisation sur les salaires.",
    zone: "FRANCE",
    region: null,
    theme: "SOCIAL_MOVEMENTS",
  },
  {
    title: "Faut-il interdire les jets privés ?",
    summary: "Une tribune pour une taxation plus forte des vols privés.",
    zone: "EUROPE",
    region: null,
    theme: "ENVIRONMENT",
  },
  {
    title: "Un nouveau traitement contre la maladie d'Alzheimer évalué",
    summary: "Une étude européenne publie des résultats préliminaires encourageants.",
    zone: "EUROPE",
    region: null,
    theme: "SCIENCE_HEALTH",
  },
  {
    title: "Le Parlement européen encadre l'intelligence artificielle",
    summary: "Le texte fixe des obligations de transparence pour les modèles d'IA.",
    zone: "EUROPE",
    region: null,
    theme: "TECH",
  },
  {
    title: "Rennes inaugure sa nouvelle médiathèque",
    summary: "Le bâtiment de quatre étages ouvre ses portes au public ce week-end.",
    zone: "LOCAL",
    region: "Bretagne",
    theme: "CULTURE",
  },
  {
    title: "Le télétravail doit-il devenir un droit ?",
    summary: "Une opinion sur l'organisation du travail après la pandémie.",
    zone: "FRANCE",
    region: null,
    theme: "SOCIAL_MOVEMENTS",
  },
  {
    title: "Sommet climatique : un accord a minima",
    summary: "Les pays participants s'engagent sur une feuille de route sans objectifs chiffrés.",
    zone: "INTERNATIONAL",
    region: null,
    theme: "ENVIRONMENT",
  },
  {
    title: "Élections législatives au Canada",
    summary: "Le scrutin s'annonce serré selon les derniers sondages.",
    zone: "INTERNATIONAL",
    region: null,
    theme: "POLITICS",
  },
  {
    title: "Le prix de l'électricité en hausse au 1er février",
    summary: "Le tarif réglementé augmente, selon la commission de régulation.",
    zone: "FRANCE",
    region: null,
    theme: "ECONOMY",
  },
  {
    title: "Les Jeux paralympiques battent un record d'audience",
    summary: "Les retransmissions ont réuni un public inédit.",
    zone: "INTERNATIONAL",
    region: null,
    theme: "SPORT",
  },
  {
    title: "La semaine de quatre jours, une fausse bonne idée ?",
    summary: "Une opinion sur les limites de la réduction du temps de travail.",
    zone: "FRANCE",
    region: null,
    theme: "ECONOMY",
  },
  {
    title: "Lyon : la ligne de tramway T10 mise en service",
    summary: "La nouvelle ligne relie le sud de l'agglomération en vingt minutes.",
    zone: "LOCAL",
    region: "Auvergne-Rhône-Alpes",
    theme: "POLITICS",
  },
  {
    title: "Un satellite européen d'observation lancé avec succès",
    summary: "Il surveillera l'évolution des glaciers pendant sept ans.",
    zone: "EUROPE",
    region: null,
    theme: "SCIENCE_HEALTH",
  },
  {
    title: "Les réseaux sociaux devraient-ils être interdits aux moins de 15 ans ?",
    summary: "Une opinion en faveur d'une majorité numérique.",
    zone: "FRANCE",
    region: null,
    theme: "TECH",
  },
  {
    title: "Le festival d'Avignon dévoile sa programmation",
    summary: "Quarante spectacles seront présentés dans la cour d'honneur et hors les murs.",
    zone: "FRANCE",
    region: null,
    theme: "CULTURE",
  },
  {
    title: "Football : la finale de la coupe d'Europe à Paris",
    summary: "Le Stade de France accueillera la rencontre au printemps.",
    zone: "EUROPE",
    region: null,
    theme: "SPORT",
  },
  {
    title: "Mobilisation des agriculteurs contre les accords commerciaux",
    summary: "Des rassemblements sont prévus dans plusieurs préfectures.",
    zone: "FRANCE",
    region: null,
    theme: "SOCIAL_MOVEMENTS",
  },
  {
    title: "Faut-il rouvrir le débat sur le nucléaire ?",
    summary: "Une opinion sur la place de l'atome dans la transition énergétique.",
    zone: "FRANCE",
    region: null,
    theme: "ENVIRONMENT",
  },
];

// SPEC §7: one opinion shows custom answer choices; the others keep the defaults.
const CUSTOM_VOTE_OPTIONS: Record<string, string[]> = {
  "Faut-il rouvrir le débat sur le nucléaire ?": [
    "Oui, sans attendre",
    "Non",
    "Seulement pour la recherche",
  ],
};

function postKindOf(title: string): PostKind {
  // Seed convention: questions are opinions.
  return title.endsWith("?") ? "OPINION" : "ARTICLE";
}

async function createPosts(authorIds: string[], readerIds: string[]) {
  const posts = [];
  for (let index = 0; index < POST_COUNT; index++) {
    const topic = POST_TOPICS[index];
    const authorId = authorIds[index % authorIds.length];
    if (!topic || !authorId) {
      throw new Error(`Missing seed data for post ${index}`);
    }
    const kind = postKindOf(topic.title);
    // A few readers viewed each post (one PostView per account, viewCount kept in sync).
    const viewers = readerIds.slice(0, index % (readerIds.length + 1));

    const post = await prisma.post.create({
      data: {
        authorId,
        kind,
        title: topic.title,
        summary: topic.summary,
        body: `${topic.summary}\n\nTexte de démonstration de l'article « ${topic.title} ».`,
        zone: topic.zone,
        region: topic.region,
        theme: topic.theme,
        // SPEC §3: always true for an opinion; one article with comments disabled.
        commentsEnabled: kind === "OPINION" || index !== 1,
        viewCount: viewers.length,
        createdAt: hoursAgo(index * HOURS_BETWEEN_POSTS),
        sources: {
          create: [
            { position: 0, value: "https://www.insee.fr/fr/statistiques" },
            { position: 1, value: "Communiqué officiel de démonstration" },
          ],
        },
        views: { create: viewers.map((userId) => ({ userId })) },
        voteOptions:
          kind === "OPINION"
            ? {
                create: (CUSTOM_VOTE_OPTIONS[topic.title] ?? DEFAULT_VOTE_OPTIONS).map(
                  (label, position) => ({ label, position }),
                ),
              }
            : undefined,
      },
    });
    posts.push(post);
  }
  return posts;
}

async function createComments(postIds: string[], readerIds: string[]) {
  const [first, second, third] = readerIds;
  if (!first || !second || !third) {
    throw new Error("Three readers are expected");
  }
  for (const postId of postIds.slice(0, 6)) {
    const root = await prisma.comment.create({
      data: {
        postId,
        authorId: first,
        content: "Merci pour cet article, les sources sont claires.",
      },
    });
    await prisma.comment.create({
      data: {
        postId,
        authorId: second,
        parentId: root.id,
        content: "D'accord, très bien documenté.",
      },
    });
    await prisma.comment.create({
      data: {
        postId,
        authorId: third,
        content: "Il manque un point de vue sur les conséquences locales.",
      },
    });
  }
  // SPEC §6: a comment deleted by its author stays in the database.
  const [firstPostId] = postIds;
  if (firstPostId) {
    await prisma.comment.create({
      data: {
        postId: firstPostId,
        authorId: third,
        content: "Commentaire supprimé par son auteur.",
        status: "DELETED",
        deletedAt: hoursAgo(1),
        deletedBy: "AUTHOR",
      },
    });
  }
}

async function createVotes(opinionIds: string[], readerIds: string[]) {
  for (const postId of opinionIds) {
    const options = await prisma.voteOption.findMany({
      where: { postId },
      orderBy: { position: "asc" },
    });
    for (const [index, userId] of readerIds.entries()) {
      // The last reader only clicked « Voir sans voter »; the others spread over the choices.
      const option = options[index % options.length];
      if (index === readerIds.length - 1 || !option) {
        await prisma.vote.create({ data: { postId, userId, revealedResults: true } });
      } else {
        await prisma.vote.create({ data: { postId, userId, optionId: option.id } });
      }
    }
  }
}

async function main(): Promise<void> {
  await wipeDatabase();
  const passwordHash = await hash(DEMO_PASSWORD);
  const users = await createUsers(passwordHash);

  const editorEmails = ["lemonde@fama.test", "clara@fama.test", "nouveau@fama.test"];
  const editors = editorEmails.map((email) => {
    const editor = users.find((user) => user.email === email);
    if (!editor) {
      throw new Error(`Missing seed account ${email}`);
    }
    return editor;
  });
  await createEditors(editors);
  // Only validated editors publish (SPEC §2.2): Le Monde and Clara Enquêtes.
  const publishingEditorIds = editors.slice(0, 2).map((editor) => editor.id);
  // The 5 readers who comment and vote (the pending applicant is left out).
  const readerIds = users
    .filter((user) => user.role === "READER" && !editorEmails.includes(user.email))
    .map((user) => user.id);

  const posts = await createPosts(publishingEditorIds, readerIds);
  await createComments(
    posts.filter((post) => post.commentsEnabled).map((post) => post.id),
    readerIds,
  );
  await createVotes(
    posts.filter((post) => post.kind === "OPINION").map((post) => post.id),
    readerIds,
  );

  console.log(
    `Seed done: ${users.length} accounts, ${posts.length} posts. Password: ${DEMO_PASSWORD}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
