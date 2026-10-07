import { APP_SLOGAN, can } from "@fama/shared";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { HeaderButton } from "../components/ui/HeaderButton";
import { type FeedFilters, useFeed } from "../features/posts/api";
import { FeedFiltersBar } from "../features/posts/components/FeedFiltersBar";
import { PostCard } from "../features/posts/components/PostCard";
import { postErrorMessage } from "../features/posts/texts";
import { useAuth } from "../providers/AuthProvider";

const texts = {
  publish: "Publier",
  account: "Compte",
  empty: "Aucune publication ces dernières 48 heures pour ces filtres.",
};

const NO_FILTERS: FeedFilters = { today: false, zone: null, theme: null };

/** SPEC §4: the feed, readable without an account (SPEC §2). */
export default function FeedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [filters, setFilters] = useState<FeedFilters>(NO_FILTERS);
  const feed = useFeed(filters);
  const posts = feed.data?.pages.flatMap((page) => page.items) ?? [];

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
      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.slogan}>{APP_SLOGAN}</Text>
            <FeedFiltersBar filters={filters} onChange={setFilters} />
            {feed.isPending ? <ActivityIndicator /> : null}
            {feed.error ? <Text style={styles.error}>{postErrorMessage(feed.error)}</Text> : null}
          </View>
        }
        ListEmptyComponent={feed.isSuccess ? <Text style={styles.empty}>{texts.empty}</Text> : null}
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) {
            void feed.fetchNextPage();
          }
        }}
        ListFooterComponent={feed.isFetchingNextPage ? <ActivityIndicator /> : null}
        onRefresh={() => void feed.refetch()}
        refreshing={feed.isRefetching && !feed.isFetchingNextPage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerButtons: { flexDirection: "row" },
  list: { gap: 12, paddingBottom: 24, width: "100%", maxWidth: 720, alignSelf: "center" },
  listHeader: { gap: 4 },
  slogan: { fontStyle: "italic", textAlign: "center", paddingTop: 12 },
  empty: { textAlign: "center", padding: 24 },
  error: { color: "#c1121f", textAlign: "center" },
});
