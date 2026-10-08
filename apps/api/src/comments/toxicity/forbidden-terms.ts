/**
 * SPEC §6.2: terms blocked by the automatic comment filter.
 *
 * ⚠ STARTER LIST, TO BE REVIEWED AND COMPLETED BY THE PROJECT OWNER BEFORE LAUNCH
 * (docs/DECISIONS.md, "Commentaires").
 *
 * Whole words only (after normalization, see normalize.ts): ambiguous words that are also
 * ordinary words (« con », « raton », « mongol », « débile ») are deliberately left out, the
 * reports and human moderation (SPEC §6.2 steps 2–4) handle them.
 */
export const FORBIDDEN_TERMS: readonly string[] = [
  // Insults
  "connard",
  "connasse",
  "salaud",
  "salope",
  "salopard",
  "enculé",
  "enculer",
  "enfoiré",
  "ordure",
  "pourriture",
  "bâtard",
  "abruti",
  "pétasse",
  "pouffiasse",
  "pute",
  "fils de pute",
  "fdp",
  "trou du cul",
  "trouduc",
  "sous merde",
  "merdeux",
  "ta gueule",
  "tg",
  "nique ta mère",
  "ntm",
  "va te faire foutre",
  "vtff",
  // Discrimination (SPEC §6.3: origin, religion, sex, sexual orientation, disability…)
  "pédé",
  "pd",
  "tapette",
  "tarlouze",
  "tantouze",
  "gouine",
  "travelo",
  "nègre",
  "négro",
  "bougnoule",
  "bicot",
  "youpin",
  "youtre",
  "chinetoque",
  "niakoué",
  "bamboula",
  "gogol",
  "sale arabe",
  "sale noir",
  "sale noire",
  "sale juif",
  "sale juive",
  "sale musulman",
  "sale chinois",
  // Threats
  "crève",
  "suicide toi",
  "je vais te tuer",
];
