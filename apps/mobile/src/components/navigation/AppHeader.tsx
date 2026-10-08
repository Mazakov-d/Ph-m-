import { APP_NAME, can } from "@fama/shared";
import { usePathname, useRouter } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../providers/AuthProvider";
import { colors, radius, spacing } from "../ui/theme";
import { BackArrow } from "./BackArrow";
import { type TabPath, useGoToTab } from "./useGoToTab";

const texts = {
  back: "Retour",
  feed: `${APP_NAME}, le fil des publications`,
  publish: "Publier",
  account: "Compte",
};

// Interface brief: the name of the app is centred on the web, on the left on a phone.
const CENTERED_BRAND = Platform.OS === "web";

/**
 * The header of every page (interface brief): the brand (APP_NAME) (the feed tab), the « Publier »
 * (editors) and « Compte » tabs, the current tab greyed, and a back arrow on the pages opened above them.
 */
export function AppHeader({ canGoBack }: { canGoBack: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const goToTab = useGoToTab();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const tabProps = { current: pathname, onPress: goToTab };
  const brand = (
    <Tab label={APP_NAME} accessibilityLabel={texts.feed} path="/" brand {...tabProps} />
  );

  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        {canGoBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={texts.back}
            hitSlop={8}
            onPress={() => (router.canGoBack() ? router.back() : goToTab("/"))}
            style={styles.back}
          >
            <BackArrow />
          </Pressable>
        ) : null}
        {CENTERED_BRAND ? null : brand}
        <View style={styles.tabs}>
          {/* SPEC §2.5: only validated editors publish (the API checks again). */}
          {can(user, "post.create") ? (
            <Tab label={texts.publish} path="/publish" {...tabProps} />
          ) : null}
          <Tab label={texts.account} path="/account" {...tabProps} />
        </View>
        {CENTERED_BRAND ? <View style={styles.centered}>{brand}</View> : null}
      </View>
    </View>
  );
}

type TabProps = {
  label: string;
  accessibilityLabel?: string;
  path: TabPath;
  current: string;
  onPress: (path: TabPath) => void;
  brand?: boolean;
};

/** A tab of the header, greyed when it is the current page. */
function Tab({ label, accessibilityLabel, path, current, onPress, brand = false }: TabProps) {
  const selected = current === path;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={() => onPress(path)}
      style={[styles.tab, selected && styles.currentTab]}
    >
      <Text style={brand ? styles.brand : styles.tabLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  row: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  back: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  tabs: { flexDirection: "row", gap: spacing.xs, marginLeft: "auto" },
  tab: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.sm },
  currentTab: { backgroundColor: colors.subtle },
  tabLabel: { fontSize: 16, fontWeight: "600", color: colors.brand },
  brand: { fontSize: 22, fontWeight: "bold", color: colors.brand },
  // Centred on the whole width, whatever the buttons on each side.
  centered: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "box-none",
  },
});
