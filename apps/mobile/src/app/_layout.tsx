import { APP_NAME } from "@fama/shared";
import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack screenOptions={{ title: APP_NAME }} />;
}
