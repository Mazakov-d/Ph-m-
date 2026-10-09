import { APP_NAME, can } from "@fama/shared";
import { usePathname, useRouter } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../providers/AuthProvider";
import { colors, radius, spacing } from "../ui/theme";
import { BackArrow } from "./BackArrow";
import { type TabPath, useGoToTab } from "./useGoToTab";

const texts = {
  back: "Retour",
  feed: `${APP_NAME}, le fil des publications`,
  publish: "Publier",
  account: "Tableau de bord",
  editorPage: "Ma page",
};

// Interface brief: the name of the app is centred on the web, on the left on a phone.
const CENTERED_BRAND = Platform.OS === "web";

// Below this width (a phone), the tabs are smaller so that they all fit on one line.
const COMPACT_MAX_WIDTH = 480;

/**
 * The header of every page (interface brief): the brand (APP_NAME) (the feed tab), the « Publier »
 * (editors) and « Tableau de bord » tabs, the current tab greyed, and a back arrow on the pages
 * opened above them. docs/DECISIONS.md (dashboard): an editor also has « Ma page », their profile.
 */
export function AppHeader({ canGoBack }: { canGoBack: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const goToTab = useGoToTab();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const compact = useWindowDimensions().width < COMPACT_MAX_WIDTH;
  const editorPage = user?.role === "EDITOR" ? `/editors/${user.id}` : null;

  const tabProps = { current: pathname, onPress: goToTab, compact };
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
          {editorPage ? (
            <HeaderButton
              label={texts.editorPage}
              selected={pathname === editorPage}
              compact={compact}
              onPress={() => router.push(editorPage)}
            />
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
  compact: boolean;
  brand?: boolean;
};

/** A tab of the header. */
function Tab({ path, current, onPress, ...props }: TabProps) {
  return <HeaderButton {...props} selected={current === path} onPress={() => onPress(path)} />;
}

type HeaderButtonProps = {
  label: string;
  accessibilityLabel?: string;
  selected: boolean;
  compact: boolean;
  onPress: () => void;
  brand?: boolean;
};

/** A button of the header, greyed when it is the current page. */
function HeaderButton(props: HeaderButtonProps) {
  const { label, accessibilityLabel, selected, compact, onPress, brand = false } = props;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.tab, compact && styles.compactTab, selected && styles.currentTab]}
    >
      <Text
        numberOfLines={1}
        style={[
          brand ? styles.brand : styles.tabLabel,
          compact && (brand ? styles.compactBrand : styles.compactLabel),
        ]}
      >
        {label}
      </Text>
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
  compactTab: { paddingHorizontal: spacing.sm },
  currentTab: { backgroundColor: colors.subtle },
  compactLabel: { fontSize: 14 },
  compactBrand: { fontSize: 19 },
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
