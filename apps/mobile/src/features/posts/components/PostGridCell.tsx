import type { PostSummaryPublic } from "@fama/shared";
import { StyleSheet, View } from "react-native";
import { PostCard } from "./PostCard";

/** A cell of a post grid: a post, or an empty cell that completes the last row. */
export type PostGridCell = PostSummaryPublic | null;

/**
 * Interface brief: the last row of a grid is completed with empty cells, so that a lone post
 * keeps the width of a column instead of taking the whole row.
 */
export function toGridCells(posts: PostSummaryPublic[], columns: number): PostGridCell[] {
  const missing = (columns - (posts.length % columns)) % columns;
  return [...posts, ...Array.from({ length: missing }, () => null)];
}

export function gridCellKey(cell: PostGridCell, index: number): string {
  return cell ? cell.id : `empty-${index}`;
}

export function PostGridCellView({ cell, columns }: { cell: PostGridCell; columns: number }) {
  if (cell === null) return <View style={styles.empty} />;
  return <PostCard post={cell} fill={columns > 1} />;
}

const styles = StyleSheet.create({ empty: { flex: 1 } });
