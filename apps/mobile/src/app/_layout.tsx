import { APP_NAME } from "@fama/shared";
import { Stack } from "expo-router";
import { AppHeader } from "../components/navigation/AppHeader";
import { colors } from "../components/ui/theme";
import { useAppFonts } from "../components/ui/typefaces";
import { AuthProvider } from "../providers/AuthProvider";
import { QueryProvider } from "../providers/QueryProvider";

export default function RootLayout() {
  // Posts are written in the bundled fonts (interface brief): wait for them, a very short time.
  const fontsReady = useAppFonts();
  if (!fontsReady) {
    return null;
  }
  return (
    <QueryProvider>
      <AuthProvider>
        {/* The tabs at the bottom of the stack; a post or a setting opens above them, with « < ». */}
        <Stack
          screenOptions={{
            title: APP_NAME,
            header: ({ back }) => <AppHeader canGoBack={back !== undefined} />,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </QueryProvider>
  );
}
