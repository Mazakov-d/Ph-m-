import { useWindowDimensions } from "react-native";
import { gridBreakpoints } from "./theme";

/** Interface brief: on a wide screen (web, tablet) the posts fill several columns. */
export function useGridColumns(): number {
  const { width } = useWindowDimensions();
  if (width >= gridBreakpoints.threeColumns) return 3;
  if (width >= gridBreakpoints.twoColumns) return 2;
  return 1;
}
