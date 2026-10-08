import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { VerdictForm } from "../components/VerdictForm";

describe("VerdictForm (SPEC §5.5)", () => {
  it("requires a verdict, a public note and a source", async () => {
    const onSubmit = jest.fn();
    await render(<VerdictForm onSubmit={onSubmit} loading={false} />);
    await fireEvent.press(screen.getByText("Rendre le verdict"));
    expect((await screen.findAllByText("Champ obligatoire.")).length).toBe(2);
    expect(screen.getByText("Ajoutez au moins une source.")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the verdict", async () => {
    const onSubmit = jest.fn();
    await render(<VerdictForm onSubmit={onSubmit} loading={false} />);
    await fireEvent.press(screen.getByText("Contexte manquant"));
    await fireEvent.changeText(
      screen.getByLabelText("Note publique (affichée dans « Pourquoi ? »)"),
      "La date du sondage n'est pas précisée.",
    );
    await fireEvent.changeText(screen.getByLabelText("Source 1"), "https://www.insee.fr");
    await fireEvent.press(screen.getByText("Rendre le verdict"));
    await waitFor(() =>
      expect(onSubmit.mock.calls[0]?.[0]).toEqual({
        verdict: "MISSING_CONTEXT",
        publicNote: "La date du sondage n'est pas précisée.",
        sources: ["https://www.insee.fr"],
      }),
    );
  });
});
