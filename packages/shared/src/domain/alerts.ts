import type { Locality, Theme, Zone } from "../enums.js";
import { localitiesWithin } from "./localities.js";

type AlertCriteria = { theme: Theme | null; zone: Zone | null; locality: Locality | null };
type PostPlacement = { theme: Theme; zone: Zone; locality: Locality | null };

/**
 * docs/DECISIONS.md (push notifications, places): an alert matches a post when each criterion it
 * sets is the post's (an unset criterion matches everything); an alert on a region also matches
 * the posts of its cities.
 */
export function alertMatchesPost(alert: AlertCriteria, post: PostPlacement): boolean {
  const samePlace =
    alert.locality === null ||
    (post.locality !== null && localitiesWithin(alert.locality).includes(post.locality));
  return (
    (alert.theme === null || alert.theme === post.theme) &&
    (alert.zone === null || alert.zone === post.zone) &&
    samePlace
  );
}
