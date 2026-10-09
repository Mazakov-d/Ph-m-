import { EDITOR_PROOFS, type EditorModeration, type EditorProof } from "@fama/shared";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Chip } from "../../../components/ui/Chip";
import { colors, spacing } from "../../../components/ui/theme";
import { APPLICANT_TYPES, EDITOR_PROOF_LABELS } from "../texts";

// The public register of French companies, to check a SIRET.
const COMPANY_REGISTER = "https://annuaire-entreprises.data.gouv.fr/etablissement/";

const texts = {
  type: (label: string) => `Profil : ${label}`,
  siret: "SIRET",
  website: "Site",
  director: "Directeur de publication",
  email: "E-mail professionnel",
  cppap: "CPPAP",
  pressCard: "Carte de presse",
  account: "Compte",
  works: "Travaux / publications",
  code: (code: string) => `Code attendu dans la bio du compte : ${code}`,
  required: "À vérifier (obligatoire)",
  optional: "Facultatif",
};

type Props = {
  application: EditorModeration;
  checked: EditorProof[];
  onToggle: (proof: EditorProof) => void;
};

/**
 * docs/DECISIONS.md (editor applications): what the applicant gave, with links to check it,
 * and the checklist of the proofs of their kind (the required ones first).
 */
export function ApplicationProofs({ application, checked, onToggle }: Props) {
  const proofs = EDITOR_PROOFS[application.applicantType];
  const detail = (label: string, value: string | null, link?: string) =>
    value ? (
      // A link (a URL, the register) is one long word: cut with « … » rather than overflowing.
      <Text key={label} numberOfLines={link ? 1 : undefined}>
        <Text style={styles.strong}>{`${label} : `}</Text>
        {link ? (
          <Text
            accessibilityRole="link"
            style={styles.link}
            onPress={() => void Linking.openURL(link)}
          >
            {value}
          </Text>
        ) : (
          value
        )}
      </Text>
    ) : null;

  return (
    <View style={styles.box}>
      <Text style={styles.strong}>
        {texts.type(APPLICANT_TYPES[application.applicantType].label)}
      </Text>
      {detail(
        texts.siret,
        application.siret,
        application.siret ? COMPANY_REGISTER + application.siret : undefined,
      )}
      {detail(texts.website, application.websiteUrl, application.websiteUrl ?? undefined)}
      {detail(texts.director, application.publicationDirector)}
      {detail(texts.email, application.professionalEmail)}
      {detail(texts.cppap, application.cppapNumber)}
      {detail(texts.pressCard, application.pressCardNumber)}
      {detail(
        texts.account,
        application.socialAccountUrl,
        application.socialAccountUrl ?? undefined,
      )}
      {application.applicantType === "SOCIAL_MEDIA" ? (
        <Text style={styles.code}>{texts.code(application.verificationCode)}</Text>
      ) : null}
      {application.workLinks.length > 0 ? <Text style={styles.strong}>{texts.works}</Text> : null}
      {application.workLinks.map((link) => (
        <Text
          key={link}
          accessibilityRole="link"
          numberOfLines={1}
          style={styles.link}
          onPress={() => void Linking.openURL(link)}
        >
          {link}
        </Text>
      ))}
      <Checklist
        title={texts.required}
        proofs={proofs.required}
        checked={checked}
        onToggle={onToggle}
      />
      {proofs.optional.length > 0 ? (
        <Checklist
          title={texts.optional}
          proofs={proofs.optional}
          checked={checked}
          onToggle={onToggle}
        />
      ) : null}
    </View>
  );
}

type ChecklistProps = {
  title: string;
  proofs: EditorProof[];
  checked: EditorProof[];
  onToggle: (proof: EditorProof) => void;
};

function Checklist({ title, proofs, checked, onToggle }: ChecklistProps) {
  return (
    <View style={styles.list}>
      <Text style={styles.muted}>{title}</Text>
      <View style={styles.chips}>
        {proofs.map((proof) => (
          <Chip
            key={proof}
            label={`${checked.includes(proof) ? "✓ " : ""}${EDITOR_PROOF_LABELS[proof]}`}
            selected={checked.includes(proof)}
            onPress={() => onToggle(proof)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  strong: { fontWeight: "600", color: colors.text },
  link: { color: colors.brand, textDecorationLine: "underline" },
  code: { fontWeight: "bold", color: colors.brand },
  list: { gap: spacing.xs, marginTop: spacing.sm },
  muted: { color: colors.muted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
