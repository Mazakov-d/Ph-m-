import { act, renderHook } from "@testing-library/react-native";
import { Keyboard, type KeyboardEvent } from "react-native";
import { useKeyboard } from "../useKeyboard";

describe("useKeyboard", () => {
  it("follows the keyboard's height and top, and forgets them when it hides", async () => {
    const listeners = new Map<string, (event: KeyboardEvent) => void>();
    const remove = jest.fn();
    const spy = jest.spyOn(Keyboard, "addListener").mockImplementation((name, listener) => {
      listeners.set(name, listener);
      return { remove } as unknown as ReturnType<typeof Keyboard.addListener>; // a test double.
    });
    const { result, unmount } = await renderHook(() => useKeyboard());
    expect(result.current).toEqual({ height: 0, top: 0 });

    const event: KeyboardEvent = {
      duration: 250,
      easing: "keyboard",
      startCoordinates: { height: 300, screenY: 800, screenX: 0, width: 390 },
      endCoordinates: { height: 300, screenY: 500, screenX: 0, width: 390 },
      isEventFromThisApp: true,
    };
    // The tests run as iOS: the keyboard is announced before it moves.
    await act(() => listeners.get("keyboardWillShow")?.(event));
    expect(result.current).toEqual({ height: 300, top: 500 });
    await act(() => listeners.get("keyboardWillHide")?.(event));
    expect(result.current).toEqual({ height: 0, top: 0 });

    await unmount();
    expect(remove).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});
