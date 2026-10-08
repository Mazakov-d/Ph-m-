import { Stack } from "expo-router";
import { ActivityIndicator, Text } from "react-native";
import { useMySanctions } from "../features/sanctions/api";
import { SanctionCard } from "../features/sanctions/components/SanctionCard";
import { sanctionErrorMessage } from "../features/sanctions/texts";
import { CenteredBox } from "../components/ui/CenteredBox";

const texts = {
  title: "Mes sanctions",
  empty: "Vous n'avez aucune sanction.",
};

/** SPEC §6.3: the sanctions of the signed-in account, each contestable once. */
export default function SanctionsScreen() {
  const sanctions = useMySanctions();
  return (
    <CenteredBox size="narrow">
      <Stack.Screen options={{ title: texts.title }} />
      {sanctions.isPending ? <ActivityIndicator /> : null}
      {sanctions.error ? <Text>{sanctionErrorMessage(sanctions.error)}</Text> : null}
      {sanctions.data?.length === 0 ? <Text>{texts.empty}</Text> : null}
      {sanctions.data?.map((sanction) => (
        <SanctionCard key={sanction.id} sanction={sanction} />
      ))}
    </CenteredBox>
  );
}
