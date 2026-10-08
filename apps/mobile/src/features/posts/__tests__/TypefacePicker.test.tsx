import { Typeface } from "@fama/shared";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { TYPEFACES } from "../../../components/ui/typefaces";
import { TypefacePicker } from "../components/TypefacePicker";

describe("TypefacePicker (interface brief)", () => {
  it("lists the known fonts by kind and returns the chosen one", async () => {
    const onChange = jest.fn();
    await render(<TypefacePicker label="Titre" value="MERRIWEATHER" onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText("Choisir la police du champ Titre"));
    expect(screen.getByText("Sans empattement")).toBeTruthy();
    expect(screen.getByText("Avec empattement")).toBeTruthy();
    expect(screen.getByText("Chasse fixe")).toBeTruthy();
    // Every typeface of the list is offered, by its name (the chosen one is also on the button).
    for (const typeface of Typeface.options) {
      expect(screen.getAllByText(TYPEFACES[typeface].label).length).toBeGreaterThan(0);
    }

    await fireEvent.press(screen.getByText("EB Garamond"));
    expect(onChange).toHaveBeenCalledWith("EB_GARAMOND");
    expect(screen.queryByText("Chasse fixe")).toBeNull();
  });
});
