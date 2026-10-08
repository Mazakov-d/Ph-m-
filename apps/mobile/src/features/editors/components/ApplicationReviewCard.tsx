import { can, type EditorDecisionInput, type EditorModeration } from "@fama/shared";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { useAuth } from "../../../providers/AuthProvider";
import {
  CAN_OPEN_DOCUMENTS,
  openIdentityDocument,
  useDecideEditorApplication,
} from "../moderationApi";
import { editorErrorMessage } from "../texts";
import { EditorBadge } from "./EditorBadge";
import { RejectionForm } from "./RejectionForm";
import { colors } from "../../../components/ui/theme";

const texts = {
  identity: (first: string, last: string) => `Identité : ${first} ${last}`,
  visibility: (shown: boolean) => (shown ? "Identité publique" : "Identité masquée au public"),
  owner: (name: string, group: string | null) =>
    `Propriétaire : ${group ? `${name} (${group})` : name}`,
  document: (index: number) => `Document ${index + 1}`,
  documentsOnWeb: (count: number) => `${count} document(s) : à consulter depuis la version web.`,
  validate: "Valider (Indépendant)",
  certify: "Certifier",
  reject: "Refuser",
  documentError: "Impossible d'ouvrir le document.",
};

export function ApplicationReviewCard({ application }: { application: EditorModeration }) {
  const { user } = useAuth();
  const decide = useDecideEditorApplication();
  const [isRejecting, setIsRejecting] = useState(false);
  const [documentError, setDocumentError] = useState(false);
  const isPending = application.editorStatus === "PENDING";

  const submit = (decision: EditorDecisionInput) =>
    decide.mutate({ userId: application.userId, decision });

  const openDocument = (index: number) => {
    setDocumentError(false);
    openIdentityDocument(application.userId, index).catch(() => setDocumentError(true));
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.pseudo}>{application.pseudo}</Text>
        <EditorBadge status={application.editorStatus} />
      </View>
      <Text>{texts.identity(application.legalFirstName, application.legalLastName)}</Text>
      <Text style={styles.muted}>{texts.visibility(application.showIdentityPublicly)}</Text>
      <Text>{texts.owner(application.ownerName, application.ownerGroup)}</Text>
      <Text>{application.editorialLine}</Text>

      {CAN_OPEN_DOCUMENTS ? (
        <View style={styles.documents}>
          {Array.from({ length: application.documentCount }, (_, index) => (
            <Button
              key={index}
              label={texts.document(index)}
              variant="secondary"
              onPress={() => openDocument(index)}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.muted}>{texts.documentsOnWeb(application.documentCount)}</Text>
      )}
      {documentError ? <Text style={styles.error}>{texts.documentError}</Text> : null}

      {isRejecting ? (
        <RejectionForm
          loading={decide.isPending}
          onCancel={() => setIsRejecting(false)}
          onConfirm={(rejectionReason) => submit({ status: "REJECTED", rejectionReason })}
        />
      ) : (
        <View style={styles.actions}>
          {isPending ? (
            <Button
              label={texts.validate}
              loading={decide.isPending}
              onPress={() => submit({ status: "INDEPENDENT" })}
            />
          ) : null}
          {/* SPEC §2.2: only an admin certifies (the API checks again). */}
          {can(user, "editor.validateCertified") ? (
            <Button label={texts.certify} onPress={() => submit({ status: "CERTIFIED" })} />
          ) : null}
          {isPending ? (
            <Button label={texts.reject} variant="secondary" onPress={() => setIsRejecting(true)} />
          ) : null}
        </View>
      )}
      {decide.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {editorErrorMessage(decide.error)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  pseudo: { fontSize: 18, fontWeight: "bold" },
  muted: { color: colors.muted },
  documents: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actions: { gap: 8 },
  error: { color: colors.danger },
});
