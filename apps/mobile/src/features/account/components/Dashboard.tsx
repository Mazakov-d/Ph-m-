import { can, type AuthUser } from "@fama/shared";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../components/ui/Button";
import { type DashboardItem, DashboardGrid } from "../../../components/ui/DashboardGrid";
import { colors } from "../../../components/ui/theme";
import { useAuth } from "../../../providers/AuthProvider";
import { DeleteAccount } from "../../auth/components/DeleteAccount";
import { JurySection } from "../../jury/components/JurySection";
import { ConversationsSection } from "../../tickets/components/ConversationsSection";

const texts = {
  signedInAs: (pseudo: string) => `Connecté en tant que ${pseudo}`,
  becomeEditor: "Devenir éditeur",
  editorSpace: "Mon espace éditeur",
  conversations: "Conversations",
  moderation: "Modération",
  editorApplications: "Demandes éditeurs",
  comments: "Commentaires et opinions signalés",
  postReviews: "Articles signalés",
  administration: "Administration",
  moderators: "Modérateurs",
  audit: "Journal d'audit",
  jury: "Jury citoyen",
  alerts: "Mes alertes",
  sanctions: "Mes sanctions",
  blocks: "Comptes bloqués",
  support: "Contacter Phémé",
  signOut: "Se déconnecter",
  deleteAccount: "Supprimer mon compte",
};

type Route =
  | "/editor"
  | "/moderation/editor-applications"
  | "/moderation/comments"
  | "/moderation/post-reviews"
  | "/admin/moderators"
  | "/admin/audit"
  | "/alerts"
  | "/sanctions"
  | "/blocks"
  | "/support";

/** The pages a section unfolds, as a column of buttons. */
function Links({ links }: { links: { label: string; route: Route; visible: boolean }[] }) {
  const router = useRouter();
  return (
    <View style={styles.links}>
      {links
        .filter((link) => link.visible)
        .map((link) => (
          <Button
            key={link.label}
            label={link.label}
            variant="secondary"
            onPress={() => router.push(link.route)}
          />
        ))}
    </View>
  );
}

/**
 * docs/DECISIONS.md (dashboard): the « Tableau de bord » of every signed-in account. The same
 * buttons for everyone; the team's tools unfold under their button; signing out and deleting
 * the account are always there.
 */
export function Dashboard({ user }: { user: AuthUser }) {
  const router = useRouter();
  const { signOut } = useAuth();
  const go = (route: Route) => () => router.push(route);
  const team = user.role === "MODERATOR" || user.role === "ADMIN";

  const items: DashboardItem[] = [];
  if (!team) {
    items.push({
      label: user.role === "EDITOR" ? texts.editorSpace : texts.becomeEditor,
      onPress: go("/editor"),
    });
  }
  if (can(user, "ticket.assign") || can(user, "chat.readAll")) {
    items.push({ label: texts.conversations, content: () => <ConversationsSection /> });
  }
  if (can(user, "moderation.queue.read")) {
    items.push({
      label: texts.moderation,
      content: () => (
        <Links
          links={[
            {
              label: texts.editorApplications,
              route: "/moderation/editor-applications",
              visible: can(user, "editor.validateIndependent"),
            },
            { label: texts.comments, route: "/moderation/comments", visible: true },
            { label: texts.postReviews, route: "/moderation/post-reviews", visible: true },
          ]}
        />
      ),
    });
  }
  if (can(user, "moderator.manage") || can(user, "audit.read")) {
    items.push({
      label: texts.administration,
      content: () => (
        <Links
          links={[
            {
              label: texts.moderators,
              route: "/admin/moderators",
              visible: can(user, "moderator.manage"),
            },
            { label: texts.audit, route: "/admin/audit", visible: can(user, "audit.read") },
          ]}
        />
      ),
    });
  }
  if (can(user, "jury.serve")) {
    items.push({ label: texts.jury, content: () => <JurySection /> });
  }
  items.push(
    { label: texts.alerts, onPress: go("/alerts") },
    { label: texts.sanctions, onPress: go("/sanctions") },
    { label: texts.blocks, onPress: go("/blocks") },
  );
  // docs/DECISIONS.md (contact): readers and editors write to the team.
  if (can(user, "support.open")) items.push({ label: texts.support, onPress: go("/support") });
  items.push(
    { label: texts.signOut, onPress: () => void signOut() },
    { label: texts.deleteAccount, content: (close) => <DeleteAccount onCancel={close} /> },
  );

  return (
    <>
      <Text style={styles.text}>{texts.signedInAs(user.pseudo)}</Text>
      <DashboardGrid items={items} />
    </>
  );
}

const styles = StyleSheet.create({
  text: { textAlign: "center", color: colors.muted },
  links: { gap: 8 },
});
