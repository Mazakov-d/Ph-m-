import { Link } from "expo-router";
import { StyleSheet, View } from "react-native";
import { type LegalPage, LEGAL_PAGES } from "./texts";
import { colors } from "../../components/ui/theme";

const PAGES: LegalPage[] = ["rules", "privacy", "legal-notice"];

/** Links to the static pages (SPEC §10). */
export function LegalLinks() {
  return (
    <View style={styles.links}>
      {PAGES.map((page) => (
        <Link key={page} href={`/legal/${page}`} style={styles.link}>
          {LEGAL_PAGES[page].title}
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  links: { gap: 8, marginTop: 16, alignItems: "center" },
  link: { color: colors.brand },
});
