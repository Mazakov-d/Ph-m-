const FULL = 100;

/**
 * SPEC §7 + docs/DECISIONS.md: whole percentages of each choice that always add up to 100
 * (largest remainder method: rounded down first, the missing points go to the largest
 * remainders). All zeros when nobody voted.
 */
export function computeVotePercentages(counts: number[]): number[] {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total === 0) {
    return counts.map(() => 0);
  }
  const exact = counts.map((count) => (count * FULL) / total);
  const percentages = exact.map(Math.floor);
  let missing = FULL - percentages.reduce((sum, value) => sum + value, 0);
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of byRemainder) {
    if (missing === 0) break;
    percentages[index] = (percentages[index] ?? 0) + 1;
    missing--;
  }
  return percentages;
}
