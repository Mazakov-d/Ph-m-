import { computeVotePercentages, type VoteSummaryPublic } from "@fama/shared";
import { StyleSheet, Text, View } from "react-native";
import { formatVoteCount } from "../texts";
import { VoteResultRow } from "./VoteResultRow";

const texts = {
  myChoice: (label: string) => ` · votre choix : ${label}`,
  revealed: " · vous avez vu les résultats sans voter",
};

type Props = { votes: VoteSummaryPublic & { results: NonNullable<VoteSummaryPublic["results"]> } };

/** SPEC §7 + docs/DECISIONS.md: share of each choice (adding up to 100 %) and the total. */
export function VoteResults({ votes }: Props) {
  const { options, results, myOptionId } = votes;
  const counts = options.map(
    (option) => results.counts.find((count) => count.optionId === option.id)?.count ?? 0,
  );
  const percentages = computeVotePercentages(counts);
  const myLabel = options.find((option) => option.id === myOptionId)?.label;

  return (
    <View style={styles.results}>
      {options.map((option, index) => (
        <VoteResultRow
          key={option.id}
          label={option.label}
          percentage={percentages[index] ?? 0}
          isMine={option.id === myOptionId}
        />
      ))}
      <Text style={styles.total}>
        {formatVoteCount(results.totalVotes) + (myLabel ? texts.myChoice(myLabel) : texts.revealed)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  results: { gap: 10 },
  total: { color: "#555" },
});
