import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { DRAFT_NOTICE, type LegalPage, LEGAL_PAGES } from "../../features/legal/texts";
import { colors } from "../../components/ui/theme";

function isLegalPage(page: string | undefined): page is LegalPage {
  return page === "rules" || page === "privacy" || page === "legal-notice";
}

/** SPEC §10: static pages (rules, privacy, legal notice), readable without an account. */
export default function LegalScreen() {
  const { page } = useLocalSearchParams<{ page: string }>();
  if (!isLegalPage(page)) {
    return <Text style={styles.container}>Page introuvable.</Text>;
  }
  const content = LEGAL_PAGES[page];
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: content.title }} />
      {content.draft ? <Text style={styles.draft}>{DRAFT_NOTICE}</Text> : null}
      {content.sections.map((section, index) => (
        <Text key={index} style={styles.section}>
          {section}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12, width: "100%", maxWidth: 720, alignSelf: "center" },
  draft: { color: colors.danger, fontWeight: "600" },
  section: { fontSize: 15, lineHeight: 22 },
});
