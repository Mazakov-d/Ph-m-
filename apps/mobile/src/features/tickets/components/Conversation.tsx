import { MESSAGE_MAX_LENGTH } from "@fama/shared";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { formatPublishedAt } from "../../posts/texts";
import { useMessages, useSendMessage } from "../api";
import { ticketErrorMessage } from "../texts";

const texts = {
  placeholder: "Votre message",
  send: "Envoyer",
  team: "Équipe",
};

/** SPEC §8: messages are text only, never edited nor deleted; refreshed by polling. */
export function Conversation({ ticketId }: { ticketId: string }) {
  const messages = useMessages(ticketId);
  const send = useSendMessage(ticketId);
  const [draft, setDraft] = useState("");

  return (
    <View style={styles.conversation}>
      {messages.isPending ? <ActivityIndicator /> : null}
      {messages.error ? <Text>{ticketErrorMessage(messages.error)}</Text> : null}
      {messages.data?.map((message) => (
        <View
          key={message.id}
          style={[styles.bubble, message.fromTeam ? styles.team : styles.user]}
        >
          <Text style={styles.author}>
            {`${message.fromTeam ? `${texts.team} · ` : ""}${message.authorPseudo} · ${formatPublishedAt(message.createdAt)}`}
          </Text>
          <Text>{message.content}</Text>
        </View>
      ))}
      <TextInput
        accessibilityLabel={texts.placeholder}
        placeholder={texts.placeholder}
        value={draft}
        onChangeText={setDraft}
        multiline
        maxLength={MESSAGE_MAX_LENGTH}
        style={styles.input}
      />
      {send.error ? <Text style={styles.error}>{ticketErrorMessage(send.error)}</Text> : null}
      <Button
        label={texts.send}
        loading={send.isPending}
        onPress={() => {
          if (draft.trim()) {
            send.mutate(draft.trim(), { onSuccess: () => setDraft("") });
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  conversation: { gap: 10 },
  bubble: { gap: 2, padding: 10, borderRadius: 8, maxWidth: "90%" },
  team: { backgroundColor: "#eef2f8", alignSelf: "flex-start" },
  user: { backgroundColor: "#fff", alignSelf: "flex-end" },
  author: { color: "#555", fontSize: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, minHeight: 60 },
  error: { color: "#c1121f" },
});
