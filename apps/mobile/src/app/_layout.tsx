import { APP_NAME } from "@fama/shared";
import { Stack } from "expo-router";
import { AuthProvider } from "../providers/AuthProvider";
import { QueryProvider } from "../providers/QueryProvider";

export default function RootLayout() {
  return (
    <QueryProvider>
      <AuthProvider>
        <Stack screenOptions={{ title: APP_NAME }} />
      </AuthProvider>
    </QueryProvider>
  );
}
