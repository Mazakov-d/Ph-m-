import type { Theme, Zone } from "../enums.js";

type AlertCriteria = { theme: Theme | null; zone: Zone | null; region: string | null };
type PostPlacement = { theme: Theme; zone: Zone; region: string | null };

/**
 * docs/DECISIONS.md (push notifications): an alert matches a post when each criterion it sets
 * is the post's (an unset criterion matches everything). Regions compare without case.
 */
export function alertMatchesPost(alert: AlertCriteria, post: PostPlacement): boolean {
  const sameRegion =
    alert.region === null ||
    (post.region !== null &&
      alert.region.toLocaleLowerCase("fr") === post.region.toLocaleLowerCase("fr"));
  return (
    (alert.theme === null || alert.theme === post.theme) &&
    (alert.zone === null || alert.zone === post.zone) &&
    sameRegion
  );
}
