import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { apiClient } from "../../../lib/apiClient";
import { ARTICLE_DETAIL } from "../../../test/fixtures";
import { jsonResponse, renderWithProviders } from "../../../test/renderWithProviders";
import { PublishForm } from "../components/PublishForm";

jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: jest.fn() }));

describe("PublishForm (SPEC §3)", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");

  beforeEach(async () => {
    fetchMock.mockReset();
    await apiClient.endSession();
  });

  it("explains every missing mandatory field without calling the API", async () => {
    await renderWithProviders(<PublishForm onPublished={jest.fn()} />);
    await fireEvent.press(screen.getByText("Publier"));

    expect((await screen.findAllByText("Champ obligatoire.")).length).toBe(5);
    expect(screen.getByText("Ajoutez au moins une source (lien ou référence).")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks for a region only for a local post", async () => {
    await renderWithProviders(<PublishForm onPublished={jest.fn()} />);
    expect(screen.queryByLabelText("Région")).toBeNull();
    await fireEvent.press(screen.getByText("Local"));
    expect(screen.getByLabelText("Région")).toBeTruthy();
  });

  it("does not offer to disable comments on an opinion", async () => {
    await renderWithProviders(<PublishForm onPublished={jest.fn()} />);
    expect(screen.getByLabelText("Autoriser les commentaires")).toBeTruthy();
    await fireEvent.press(screen.getByText("Opinion"));
    expect(screen.queryByLabelText("Autoriser les commentaires")).toBeNull();
  });

  it("sends the post as JSON and reports the new post", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, ARTICLE_DETAIL));
    const onPublished = jest.fn();
    await renderWithProviders(<PublishForm onPublished={onPublished} />);

    await fireEvent.changeText(screen.getByLabelText("Titre"), "Le budget adopté");
    await fireEvent.changeText(screen.getByLabelText("Résumé"), "Les députés ont voté.");
    await fireEvent.changeText(screen.getByLabelText("Texte"), "Texte complet.");
    await fireEvent.changeText(screen.getByLabelText("Source 1"), "https://www.insee.fr");
    await fireEvent.press(screen.getByText("France"));
    await fireEvent.press(screen.getByText("Politique"));
    await fireEvent.press(screen.getByText("Publier"));

    await waitFor(() => expect(onPublished).toHaveBeenCalledWith(ARTICLE_DETAIL.id));
    const body = fetchMock.mock.calls[0]?.[1]?.body;
    const post = body instanceof FormData ? body.get("post") : null;
    expect(typeof post === "string" ? JSON.parse(post) : null).toEqual({
      kind: "ARTICLE",
      title: "Le budget adopté",
      summary: "Les députés ont voté.",
      body: "Texte complet.",
      sources: ["https://www.insee.fr"],
      zone: "FRANCE",
      region: null,
      theme: "POLITICS",
      commentsEnabled: true,
    });
  });

  it("lets the editor of an opinion set up to 4 answer choices (SPEC §7)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, ARTICLE_DETAIL));
    const onPublished = jest.fn();
    await renderWithProviders(<PublishForm onPublished={onPublished} />);
    await fireEvent.press(screen.getByText("Opinion"));

    expect(screen.getByLabelText("Choix 1").props.value).toBe("D'accord");
    expect(screen.getByLabelText("Choix 2").props.value).toBe("Pas d'accord");
    await fireEvent.changeText(screen.getByLabelText("Choix 1"), "Oui");
    await fireEvent.press(screen.getByText("Ajouter un choix"));
    await fireEvent.changeText(screen.getByLabelText("Choix 3"), "Sans avis");
    await fireEvent.press(screen.getByText("Ajouter un choix"));
    expect(screen.getByLabelText("Choix 4")).toBeTruthy();
    expect(screen.queryByText("Ajouter un choix")).toBeNull();
    await fireEvent.press(screen.getByLabelText("Retirer le choix 4"));

    await fireEvent.changeText(screen.getByLabelText("Titre"), "Faut-il ?");
    await fireEvent.changeText(screen.getByLabelText("Résumé"), "Une opinion.");
    await fireEvent.changeText(screen.getByLabelText("Texte"), "Texte.");
    await fireEvent.changeText(screen.getByLabelText("Source 1"), "Référence");
    await fireEvent.press(screen.getByText("France"));
    await fireEvent.press(screen.getByText("Politique"));
    await fireEvent.press(screen.getByText("Publier"));

    await waitFor(() => expect(onPublished).toHaveBeenCalled());
    const body = fetchMock.mock.calls[0]?.[1]?.body;
    const post = body instanceof FormData ? body.get("post") : null;
    expect(typeof post === "string" ? JSON.parse(post) : null).toMatchObject({
      kind: "OPINION",
      voteOptions: ["Oui", "Pas d'accord", "Sans avis"],
    });
  });

  it("sends no choices for an article, even after switching back from opinion", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, ARTICLE_DETAIL));
    const onPublished = jest.fn();
    await renderWithProviders(<PublishForm onPublished={onPublished} />);
    await fireEvent.press(screen.getByText("Opinion"));
    await fireEvent.press(screen.getByText("Article"));
    expect(screen.queryByLabelText("Choix 1")).toBeNull();

    await fireEvent.changeText(screen.getByLabelText("Titre"), "Titre");
    await fireEvent.changeText(screen.getByLabelText("Résumé"), "Résumé.");
    await fireEvent.changeText(screen.getByLabelText("Texte"), "Texte.");
    await fireEvent.changeText(screen.getByLabelText("Source 1"), "Référence");
    await fireEvent.press(screen.getByText("France"));
    await fireEvent.press(screen.getByText("Politique"));
    await fireEvent.press(screen.getByText("Publier"));

    await waitFor(() => expect(onPublished).toHaveBeenCalled());
    const body = fetchMock.mock.calls[0]?.[1]?.body;
    const post = body instanceof FormData ? body.get("post") : null;
    expect(typeof post === "string" ? JSON.parse(post) : {}).not.toHaveProperty("voteOptions");
  });
});
