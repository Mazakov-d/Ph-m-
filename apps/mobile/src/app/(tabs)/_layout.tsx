import { APP_NAME } from "@fama/shared";
import { Tabs } from "expo-router";
import { AppHeader } from "../../components/navigation/AppHeader";
import { colors } from "../../components/ui/theme";

/**
 * Interface brief: the feed, publishing and the account are tabs, switched from the header
 * (no bar at the bottom), never stacked on each other.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{
        header: () => <AppHeader canGoBack={false} />,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: APP_NAME }} />
      <Tabs.Screen name="publish" options={{ title: "Publier" }} />
      <Tabs.Screen name="account" options={{ title: "Compte" }} />
    </Tabs>
  );
}
