import { WordListToxicityChecker } from "./word-list-toxicity-checker.js";

describe("WordListToxicityChecker (SPEC §6.2)", () => {
  const checker = new WordListToxicityChecker();

  it.each([
    "Merci pour cet article, les sources sont claires.",
    "Je ne suis pas d'accord avec ce contexte.",
    "Les constructions de la commune avancent.",
    "Un raton laveur au zoo de Mulhouse.",
    "Il a dit putain, c'est une interjection courante.",
    "La pédiatrie manque de moyens.",
  ])("lets an ordinary comment through: %s", async (text) => {
    await expect(checker.check(text)).resolves.toEqual({ blocked: false });
  });

  it.each([
    ["Quel connard.", "connard"],
    ["Bande de C0NNARDS", "connard"],
    ["c . o . n . n . a . r . d", "connard"],
    ["Espèce de bâtard", "bâtard"],
    ["fils de pute", "fils de pute"],
    ["Sale juif", "sale juif"],
    ["ta gueule", "ta gueule"],
  ])("blocks « %s »", async (text, term) => {
    await expect(checker.check(text)).resolves.toEqual({ blocked: true, matchedTerm: term });
  });

  it("accepts its own list, e.g. for tests or a future configuration", async () => {
    const custom = new WordListToxicityChecker(["mot interdit"]);
    await expect(custom.check("Un MOT   interdit ici")).resolves.toMatchObject({ blocked: true });
    await expect(custom.check("Un mot autorisé")).resolves.toEqual({ blocked: false });
  });
});
