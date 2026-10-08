import { can, type PostPublic } from "@fama/shared";
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../../providers/AuthProvider";
import { useCastVote, useRevealResults } from "../api";
import { voteErrorMessage } from "../texts";
import { RevealResults } from "./RevealResults";
import { VoteChoices } from "./VoteChoices";
import { VoteResults } from "./VoteResults";

const texts = {
  title: "Votre avis",
  signIn: "Connectez-vous pour voter ou voir les résultats.",
};

/**
 * SPEC §7: one final action per opinion, so that no vote is influenced by the others:
 * vote (select, then confirm) or « Voir sans voter » (confirmed). Results come after either.
 */
export function VoteBar({ post }: { post: PostPublic }) {
  const { user } = useAuth();
  const castVote = useCastVote(post.id);
  const reveal = useRevealResults(post.id);
  const votes = post.votes;
  if (!votes) {
    return null;
  }
  const error = castVote.error ?? reveal.error;
  const results = votes.results;

  const content = () => {
    if (results) {
      return <VoteResults votes={{ ...votes, results }} />;
    }
    if (!user) {
      return (
        <>
          {votes.options.map((option) => (
            <Text key={option.id}>{`• ${option.label}`}</Text>
          ))}
          <Link href="/login" style={styles.link}>
            {texts.signIn}
          </Link>
        </>
      );
    }
    return (
      <>
        {/* SPEC §2.5: a suspended account can see the results but not vote (the API checks too). */}
        {can(user, "vote.cast") ? (
          <VoteChoices
            options={votes.options}
            loading={castVote.isPending}
            onValidate={(optionId) => castVote.mutate(optionId)}
          />
        ) : (
          votes.options.map((option) => <Text key={option.id}>{`• ${option.label}`}</Text>)
        )}
        <RevealResults loading={reveal.isPending} onConfirm={() => reveal.mutate()} />
      </>
    );
  };

  return (
    <View style={styles.bar}>
      <Text style={styles.title}>{texts.title}</Text>
      {content()}
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
  link: { color: "#1d3557", fontWeight: "600", textAlign: "center" },
  error: { color: "#c1121f" },
});
