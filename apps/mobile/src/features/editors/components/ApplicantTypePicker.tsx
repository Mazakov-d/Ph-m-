import { EditorApplicantType } from "@fama/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../../components/ui/theme";
import { APPLICANT_TYPES } from "../texts";

const texts = {
  title: "Vous êtes…",
  required: "Justificatifs obligatoires : ",
  optional: "Facultatifs : ",
};

type Props = {
  value: EditorApplicantType | undefined;
  onChange: (type: EditorApplicantType) => void;
  error?: string;
};

/** docs/DECISIONS.md (editor applications): the applicant chooses how they become an editor. */
export function ApplicantTypePicker({ value, onChange, error }: Props) {
  return (
    <View style={styles.field}>
      <Text style={styles.title}>{texts.title}</Text>
      {EditorApplicantType.options.map((type) => {
        const info = APPLICANT_TYPES[type];
        const selected = value === type;
        return (
          <Pressable
            key={type}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(type)}
            style={[styles.option, selected && styles.selected]}
          >
            <Text style={styles.label}>{info.label}</Text>
            <Text style={styles.who}>{info.who}</Text>
            <Text style={styles.proofs}>
              <Text style={styles.strong}>{texts.required}</Text>
              {info.required}
            </Text>
            {info.optional ? (
              <Text style={styles.proofs}>
                <Text style={styles.strong}>{texts.optional}</Text>
                {info.optional}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  title: { fontWeight: "bold", fontSize: 16, color: colors.text },
  option: {
    gap: 4,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  label: { fontWeight: "bold", color: colors.text },
  who: { color: colors.text },
  proofs: { color: colors.muted, fontSize: 13 },
  strong: { fontWeight: "600" },
  error: { color: colors.danger },
});
