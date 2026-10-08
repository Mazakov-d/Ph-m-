import { APP_SLOGAN } from "@fama/shared";
import { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { colors, layout, spacing } from "../../components/ui/theme";
import { useGridColumns } from "../../components/ui/useGridColumns";
import { randomUUID } from "expo-crypto";
import { type FeedFilters, NO_FILTERS, useFeed } from "../../features/posts/api";
import { ActiveFilters } from "../../features/posts/components/ActiveFilters";
import { FiltersOverlay } from "../../features/posts/components/FiltersOverlay";
import {
  gridCellKey,
  PostGridCellView,
  toGridCells,
} from "../../features/posts/components/PostGridCell";
import { postErrorMessage } from "../../features/posts/texts";
import { isSearchActive } from "../../features/search/api";
import { SearchBar } from "../../features/search/components/SearchBar";
import { SearchResults } from "../../features/search/components/SearchResults";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

const texts = {
  empty: "Aucune publication ces dernières 48 heures pour ces filtres.",
};

const SEARCH_DELAY_MS = 300;

/** SPEC §4: the feed (readable without an account, SPEC §2), with the search bar (SPEC §4.4). */
export default function FeedScreen() {
  const [filters, setFilters] = useState<FeedFilters>(NO_FILTERS);
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const columns = useGridColumns();
  const debouncedQuery = useDebouncedValue(query, SEARCH_DELAY_MS);
  const searching = isSearchActive(debouncedQuery);
  // A new draw of « À la une » each time the reader opens or refreshes the feed (SPEC §4.2).
  const [seed, setSeed] = useState(() => randomUUID());
  const feed = useFeed(filters, seed);
  const posts = feed.data?.pages.flatMap((page) => page.items) ?? [];
  const slogan = <Text style={styles.slogan}>{APP_SLOGAN}</Text>;

  return (
    <View style={styles.screen}>
      {/* Above the lists, so that typing never loses the keyboard when the results appear. */}
      <SearchBar value={query} onChange={setQuery} onFocus={() => setFiltersOpen(true)} />
      {filtersOpen ? null : <ActiveFilters filters={filters} onEdit={() => setFiltersOpen(true)} />}
      <View style={styles.content}>
        {searching ? (
          <SearchResults q={debouncedQuery} filters={filters} header={slogan} columns={columns} />
        ) : (
          <FlatList
            // A FlatList cannot change its number of columns: a new one is made instead.
            key={columns}
            numColumns={columns}
            columnWrapperStyle={columns > 1 ? styles.row : undefined}
            data={toGridCells(posts, columns)}
            keyExtractor={gridCellKey}
            renderItem={({ item }) => <PostGridCellView cell={item} columns={columns} />}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <View>
                {slogan}
                {feed.isPending ? <ActivityIndicator /> : null}
                {feed.error ? (
                  <Text style={styles.error}>{postErrorMessage(feed.error)}</Text>
                ) : null}
              </View>
            }
            ListEmptyComponent={
              feed.isSuccess ? <Text style={styles.empty}>{texts.empty}</Text> : null
            }
            onEndReached={() => {
              if (feed.hasNextPage && !feed.isFetchingNextPage) {
                void feed.fetchNextPage();
              }
            }}
            ListFooterComponent={feed.isFetchingNextPage ? <ActivityIndicator /> : null}
            onRefresh={() =>
              filters.sort === "WEIGHTED" ? setSeed(randomUUID()) : void feed.refetch()
            }
            refreshing={feed.isRefetching && !feed.isFetchingNextPage}
          />
        )}
        {filtersOpen ? (
          <FiltersOverlay
            filters={filters}
            onChange={setFilters}
            onClose={() => setFiltersOpen(false)}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  list: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    // Interface brief: on the web, the posts grow with the window.
    width: "100%",
    // Interface brief: on a very wide window the columns stop growing, centred.
    maxWidth: layout.maxGridWidth,
    alignSelf: "center",
  },
  row: { gap: spacing.md },
  slogan: { fontStyle: "italic", textAlign: "center", paddingVertical: 8 },
  empty: { textAlign: "center", padding: 24 },
  error: { color: colors.danger, textAlign: "center" },
});
