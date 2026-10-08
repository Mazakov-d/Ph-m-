import { can, computeVotePercentages, type PostPublic } from "@fama/shared";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { useAuth } from "../../../providers/AuthProvider";
import { useCastVote, useRevealResults } from "../api";
import { formatVoteCount, voteErrorMessage } from "../texts";
import { VoteResultRow } from "./VoteResultRow";

const texts = {
  title: "Votre avis",
  reveal: "Voir sans voter",
  signIn: "Connectez-vous pour voter ou voir les résultats.",
  myChoice: (label: string) => ` · votre choix : ${label}`,
};

/** SPEC §7: vote among the opinion's choices; results only after voting or « Voir sans voter ». */
export function VoteBar({ post }: { post: PostPublic }) {
  const { user } = useAuth();
  const castVote = useCastVote(post.id);
  const reveal = useRevealResults(post.id);
  const votes = post.votes;
  if (!votes) {
    return null;
  }
  // SPEC §2.5: the API checks again; this only decides what to show.
  const canVote = can(user, "vote.cast");
  const vote = canVote ? (optionId: string) => castVote.mutate(optionId) : undefined;
  const error = castVote.error ?? reveal.error;
  const results = votes.results;
  const myLabel = votes.options.find((option) => option.id === votes.myOptionId)?.label;

  return (
    <View style={styles.bar}>
      <Text style={styles.title}>{texts.title}</Text>
      {results ? (
        <>
          {computeVotePercentages(
            votes.options.map(
              (option) => results.counts.find((count) => count.optionId === option.id)?.count ?? 0,
            ),
          ).map((percentage, index) => {
            const option = votes.options[index];
            return option ? (
              <VoteResultRow
                key={option.id}
                label={option.label}
                percentage={percentage}
                isMine={option.id === votes.myOptionId}
                onPress={vote && (() => vote(option.id))}
              />
            ) : null;
          })}
          <Text style={styles.total}>
            {formatVoteCount(results.totalVotes) + (myLabel ? texts.myChoice(myLabel) : "")}
          </Text>
        </>
      ) : (
        <>
          {votes.options.map((option) =>
            vote ? (
              <Button
                key={option.id}
                label={option.label}
                variant="secondary"
                loading={castVote.isPending && castVote.variables === option.id}
                onPress={() => vote(option.id)}
              />
            ) : (
              // Cannot vote (anonymous or suspended): the choices are only listed.
              <Text key={option.id} style={styles.choice}>
                {`• ${option.label}`}
              </Text>
            ),
          )}
          {user ? (
            <Pressable accessibilityRole="button" onPress={() => reveal.mutate()}>
              <Text style={styles.link}>{texts.reveal}</Text>
            </Pressable>
          ) : (
            <Link href="/login" style={styles.link}>
              {texts.signIn}
            </Link>
          )}
        </>
      )}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {voteErrorMessage(error)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { gap: 10, padding: 16, borderRadius: 8, backgroundColor: "#fff" },
  title: { fontSize: 16, fontWeight: "bold" },
  total: { color: "#555" },
  choice: { fontSize: 15 },
  link: { color: "#1d3557", fontWeight: "600", textAlign: "center" },
  error: { color: "#c1121f" },
});
