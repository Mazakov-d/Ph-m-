import { Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { DRAFT_NOTICE, type LegalPage, LEGAL_PAGES } from "../../features/legal/texts";
import { colors } from "../../components/ui/theme";
import { CenteredBox } from "../../components/ui/CenteredBox";

function isLegalPage(page: string | undefined): page is LegalPage {
  return page === "rules" || page === "privacy" || page === "legal-notice";
}

/** SPEC §10: static pages (rules, privacy, legal notice), readable without an account. */
export default function LegalScreen() {
  const { page } = useLocalSearchParams<{ page: string }>();
  if (!isLegalPage(page)) {
    return (
      <CenteredBox size="medium">
        <Text>Page introuvable.</Text>
      </CenteredBox>
    );
  }
  const content = LEGAL_PAGES[page];
  return (
    <CenteredBox size="medium">
      <Stack.Screen options={{ title: content.title }} />
      {content.draft ? <Text style={styles.draft}>{DRAFT_NOTICE}</Text> : null}
      {content.sections.map((section, index) => (
        <Text key={index} style={styles.section}>
          {section}
        </Text>
      ))}
    </CenteredBox>
  );
}

const styles = StyleSheet.create({
  draft: { color: colors.danger, fontWeight: "600" },
  section: { fontSize: 15, lineHeight: 22 },
});
