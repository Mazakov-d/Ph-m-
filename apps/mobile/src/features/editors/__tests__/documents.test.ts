import { documentsProblem, type PickedDocument } from "../documents";

const pdf = (name: string, size = 1000): PickedDocument => ({
  name,
  uri: `file:///${name}`,
  mimeType: "application/pdf",
  size,
});

describe("documentsProblem", () => {
  it("accepts 1 to 5 PDF, JPEG or PNG files", () => {
    expect(documentsProblem([pdf("a.pdf")])).toBeNull();
    expect(documentsProblem([1, 2, 3, 4, 5].map((n) => pdf(`${n}.pdf`)))).toBeNull();
  });

  it("requires at least one document", () => {
    expect(documentsProblem([])).toBe("Ajoutez au moins un document d'identité.");
  });

  it("refuses a sixth document", () => {
    expect(documentsProblem([1, 2, 3, 4, 5, 6].map((n) => pdf(`${n}.pdf`)))).toBe(
      "5 documents maximum.",
    );
  });

  it("refuses another format", () => {
    expect(documentsProblem([{ ...pdf("a.docx"), mimeType: "application/msword" }])).toBe(
      "a.docx : seuls les fichiers PDF, JPEG et PNG sont acceptés.",
    );
  });

  it("refuses a file over 10 MB", () => {
    expect(documentsProblem([pdf("gros.pdf", 10 * 1024 * 1024 + 1)])).toBe(
      "gros.pdf dépasse 10 Mo.",
    );
  });
});
