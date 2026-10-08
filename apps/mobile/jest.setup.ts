// In-memory stand-in for the native keychain (expo-secure-store has no native module under Jest).
jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: async (key: string) => store.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => {
      store.set(key, value);
    },
    deleteItemAsync: async (key: string) => {
      store.delete(key);
    },
  };
});

// The text editor runs in a web view (Expo DOM component), which Jest cannot start: tests type
// into a plain field instead. The editor's own logic is tested in features/posts/richText.ts.
jest.mock("./src/features/posts/components/RichTextEditor", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  const { TextInput } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    __esModule: true,
    default: (props: { label: string; initialValue: string; onChange: (value: string) => void }) =>
      createElement(TextInput, {
        accessibilityLabel: props.label,
        defaultValue: props.initialValue,
        onChangeText: props.onChange,
      }),
  };
});

// Screen insets of a phone without a notch (the library's own Jest mock).
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual<{ default: object }>("react-native-safe-area-context/jest/mock").default,
);

// Fonts are downloaded from a CDN in the app; in tests they count as already there.
jest.mock("expo-font", () => ({
  isLoaded: () => true,
  loadAsync: async () => undefined,
}));
