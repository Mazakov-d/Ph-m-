import { usePathname, useRouter } from "expo-router";
import { useCallback } from "react";

/** The three tabs of the app (interface brief): the feed, publishing, the account. */
export const TAB_PATHS = ["/", "/publish", "/account"] as const;
export type TabPath = (typeof TAB_PATHS)[number];

export function isTabPath(path: string): path is TabPath {
  return TAB_PATHS.some((tab) => tab === path);
}

/**
 * Interface brief: switching tabs never stacks pages (no « back » between tabs). The pages opened
 * above the tabs (a post, a setting) are closed first.
 */
export function useGoToTab(): (tab: TabPath) => void {
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(
    (tab: TabPath) => {
      if (router.canDismiss()) {
        router.dismissAll();
        router.navigate(tab);
      } else if (isTabPath(pathname)) {
        router.navigate(tab);
      } else {
        // A page opened alone (a shared link, after publishing): the tabs replace it.
        router.replace(tab);
      }
    },
    [router, pathname],
  );
}
