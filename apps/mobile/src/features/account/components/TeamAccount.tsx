import { can, type AuthUser } from "@fama/shared";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Button } from "../../../components/ui/Button";
import { type MenuItem, MenuGrid } from "../../../components/ui/MenuGrid";
import { Tabs } from "../../../components/ui/Tabs";
import { colors } from "../../../components/ui/theme";
import { DeleteAccount } from "../../auth/components/DeleteAccount";
import { ConversationsSection } from "../../tickets/components/ConversationsSection";

const TAB_ORDER = ["conversations", "moderation", "administration", "account"] as const;
type Tab = (typeof TAB_ORDER)[number];

const texts = {
  tabs: {
    conversations: "Conversations",
    moderation: "Modération",
    administration: "Administration",
    account: "Mon compte",
  },
  signedInAs: (pseudo: string) => `Connecté en tant que ${pseudo}`,
  signOut: "Se déconnecter",
};

type Route =
  | "/moderation/editor-applications"
  | "/moderation/comments"
  | "/moderation/post-reviews"
  | "/admin/moderators"
  | "/admin/audit"
  | "/alerts"
  | "/blocks"
  | "/sanctions";

type Entry = { label: string; description: string; route: Route; visible: boolean };

function moderationEntries(user: AuthUser): Entry[] {
  return [
    {
      label: "Demandes éditeurs",
      description: "Vérifier les justificatifs et valider ou refuser.",
      route: "/moderation/editor-applications",
      visible: can(user, "editor.validateIndependent"),
    },
    {
      label: "Commentaires et opinions signalés",
      description: "Les contenus mis en revue par les signalements.",
      route: "/moderation/comments",
      visible: can(user, "moderation.queue.read"),
    },
    {
      label: "Articles signalés",
      description: "Les articles en attente d'un verdict.",
      route: "/moderation/post-reviews",
      visible: can(user, "moderation.queue.read"),
    },
  ];
}

function administrationEntries(user: AuthUser): Entry[] {
  return [
    {
      label: "Modérateurs",
      description: "La liste de l'équipe et « + Modérateur ».",
      route: "/admin/moderators",
      visible: can(user, "moderator.manage"),
    },
    {
      label: "Journal d'audit",
      description: "Chaque action de modération, et qui l'a faite.",
      route: "/admin/audit",
      visible: can(user, "audit.read"),
    },
  ];
}

function personalEntries(): Entry[] {
  return [
    {
      label: "Mes alertes",
      description: "Thèmes et lieux suivis.",
      route: "/alerts",
      visible: true,
    },
    {
      label: "Comptes bloqués",
      description: "Les comptes que vous ne voyez plus.",
      route: "/blocks",
      visible: true,
    },
    {
      label: "Mes sanctions",
      description: "L'historique de votre compte.",
      route: "/sanctions",
      visible: true,
    },
  ];
}

/**
 * todo.txt / docs/DECISIONS.md (team account): a moderator's or an admin's account is split in
 * tabs; the conversations come first, the other tools are a grid of cards.
 */
export function TeamAccount({ user, onSignOut }: { user: AuthUser; onSignOut: () => void }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("conversations");
  const tabs = TAB_ORDER.filter(
    (id) => id !== "administration" || administrationEntries(user).some((e) => e.visible),
  ).map((id) => ({ id, label: texts.tabs[id] }));
  const toItems = (entries: Entry[]): MenuItem[] =>
    entries
      .filter((entry) => entry.visible)
      .map((entry) => ({
        label: entry.label,
        description: entry.description,
        onPress: () => router.push(entry.route),
      }));

  return (
    <>
      <Text style={styles.text}>{texts.signedInAs(user.pseudo)}</Text>
      <Tabs tabs={tabs} current={tab} onChange={setTab} />
      {tab === "conversations" ? <ConversationsSection /> : null}
      {tab === "moderation" ? <MenuGrid items={toItems(moderationEntries(user))} /> : null}
      {tab === "administration" ? <MenuGrid items={toItems(administrationEntries(user))} /> : null}
      {tab === "account" ? (
        <>
          <MenuGrid items={toItems(personalEntries())} />
          <Button label={texts.signOut} variant="secondary" onPress={onSignOut} />
          <DeleteAccount />
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  text: { textAlign: "center", color: colors.muted },
});
