import { SIMILAR_POSTS_MAX } from "../rules.js";

/** A post on the same subject, as the diversification needs it (most relevant first). */
export type SimilarCandidate = {
  id: string;
  editorId: string;
  ownerGroup: string | null;
  /** docs/DECISIONS.md: certified editors stand for the « large » ones. */
  certified: boolean;
};

/** SPEC §9: « X autres médias en parlent » counts the distinct editors of the similar posts. */
export function otherMediaCount(candidates: Pick<SimilarCandidate, "editorId">[]): number {
  return new Set(candidates.map((candidate) => candidate.editorId)).size;
}

/**
 * SPEC §9 + docs/DECISIONS.md: diversified similar posts. At most one post per owner group (an
 * editor without a group is its own group), the most relevant one; then certified and
 * independent editors take turns, starting with the most relevant post; SIMILAR_POSTS_MAX at most.
 */
export function diversifySimilar<Candidate extends SimilarCandidate>(
  candidates: Candidate[],
  max: number = SIMILAR_POSTS_MAX,
): Candidate[] {
  const seenGroups = new Set<string>();
  const onePerGroup = candidates.filter((candidate) => {
    const group = candidate.ownerGroup ?? `editor:${candidate.editorId}`;
    if (seenGroups.has(group)) return false;
    seenGroups.add(group);
    return true;
  });

  const certified = onePerGroup.filter((candidate) => candidate.certified);
  const independent = onePerGroup.filter((candidate) => !candidate.certified);
  const result: Candidate[] = [];
  let takeCertified = onePerGroup[0]?.certified ?? true;
  while (result.length < max && (certified.length > 0 || independent.length > 0)) {
    const preferred = takeCertified ? certified : independent;
    const other = takeCertified ? independent : certified;
    const next = preferred.shift() ?? other.shift();
    if (next) result.push(next);
    takeCertified = !takeCertified;
  }
  return result;
}
