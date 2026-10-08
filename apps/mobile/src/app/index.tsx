import { APP_SLOGAN, can } from "@fama/shared";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { HeaderButton } from "../components/ui/HeaderButton";
import { colors, spacing } from "../components/ui/theme";
import { useGridColumns } from "../components/ui/useGridColumns";
import { type FeedFilters, useFeed } from "../features/posts/api";
import { ActiveFilters } from "../features/posts/components/ActiveFilters";
import { FeedFiltersPanel } from "../features/posts/components/FeedFiltersPanel";
import { PostCard } from "../features/posts/components/PostCard";
import { postErrorMessage } from "../features/posts/texts";
import { isSearchActive } from "../features/search/api";
import { SearchBar } from "../features/search/components/SearchBar";
import { SearchResults } from "../features/search/components/SearchResults";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useAuth } from "../providers/AuthProvider";

const texts = {
  publish: "Publier",
  account: "Compte",
  empty: "Aucune publication ces dernières 48 heures pour ces filtres.",
};

const NO_FILTERS: FeedFilters = { today: false, zone: null, theme: null };
const SEARCH_DELAY_MS = 300;

/** SPEC §4: the feed (readable without an account, SPEC §2), with the search bar (SPEC §4.4). */
export default function FeedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [filters, setFilters] = useState<FeedFilters>(NO_FILTERS);
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const columns = useGridColumns();
  const debouncedQuery = useDebouncedValue(query, SEARCH_DELAY_MS);
  const searching = isSearchActive(debouncedQuery);
  const feed = useFeed(filters);
  const posts = feed.data?.pages.flatMap((page) => page.items) ?? [];
  const slogan = <Text style={styles.slogan}>{APP_SLOGAN}</Text>;

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerButtons}>
              {/* SPEC §2.5: only validated editors publish (the API checks again). */}
              {can(user, "post.create") ? (
                <HeaderButton label={texts.publish} onPress={() => router.push("/publish")} />
              ) : null}
              <HeaderButton label={texts.account} onPress={() => router.push("/account")} />
            </View>
          ),
        }}
      />
      {/* Above the lists, so that typing never loses the keyboard when the results appear. */}
      <SearchBar value={query} onChange={setQuery} onFocus={() => setFiltersOpen(true)} />
      {filtersOpen ? (
        <FeedFiltersPanel
          filters={filters}
          onChange={setFilters}
          onClose={() => setFiltersOpen(false)}
        />
      ) : (
        <ActiveFilters filters={filters} onEdit={() => setFiltersOpen(true)} />
      )}
      {searching ? (
        <SearchResults q={debouncedQuery} filters={filters} header={slogan} columns={columns} />
      ) : (
        <FlatList
          // A FlatList cannot change its number of columns: a new one is made instead.
          key={columns}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.row : undefined}
          data={posts}
          keyExtractor={(post) => post.id}
          renderItem={({ item }) => <PostCard post={item} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              {slogan}
              {feed.isPending ? <ActivityIndicator /> : null}
              {feed.error ? <Text style={styles.error}>{postErrorMessage(feed.error)}</Text> : null}
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
          onRefresh={() => void feed.refetch()}
          refreshing={feed.isRefetching && !feed.isFetchingNextPage}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  headerButtons: { flexDirection: "row" },
  list: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center",
  },
  row: { gap: spacing.md },
  slogan: { fontStyle: "italic", textAlign: "center", paddingVertical: 8 },
  empty: { textAlign: "center", padding: 24 },
  error: { color: colors.danger, textAlign: "center" },
});
