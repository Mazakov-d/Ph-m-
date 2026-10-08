import { APP_NAME } from "@fama/shared";
import { Stack } from "expo-router";
import { colors } from "../components/ui/theme";
import { AuthProvider } from "../providers/AuthProvider";
import { QueryProvider } from "../providers/QueryProvider";

export default function RootLayout() {
  return (
    <QueryProvider>
      <AuthProvider>
        <Stack
          screenOptions={{
            title: APP_NAME,
            headerTintColor: colors.brand,
            headerTitleStyle: { fontWeight: "bold", color: colors.text },
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </AuthProvider>
    </QueryProvider>
  );
}
