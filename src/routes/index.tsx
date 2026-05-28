import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Search, Sparkles, X, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { fetchPublishedPosts } from "@backend/queries/posts";
import { Navbar } from "@frontend/components/Navbar";
import { PostCard } from "@frontend/components/PostCard";
import { PostCardSkeleton } from "@frontend/components/PostCardSkeleton";
import { useAuth } from "@frontend/hooks/use-auth";
import { ALL_TAGS, TAG_CONFIG, type PostTag } from "@frontend/lib/getCategoryConfig";
import { useEffect } from "react";
import * as Sentry from "@sentry/react";
import { posthog } from "@/lib/posthog/client";

type HomeSearch = { category?: string };

export const Route = createFileRoute("/")({
  component: HomePage,
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    category: typeof search.category === "string" ? search.category : undefined,
  }),
});

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useMemo(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function HomePage() {
  const { category } = Route.useSearch();
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<PostTag[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const { loading: authLoading } = useAuth();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts", category, debouncedSearch, selectedTags],
    queryFn: () =>
      fetchPublishedPosts(
        category || undefined,
        debouncedSearch || undefined,
        selectedTags.length > 0 ? selectedTags : undefined
      ),
    enabled: !authLoading,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const handleTagToggle = (tag: PostTag) => {
    posthog.capture("tag_filter_toggled", {
      tag,
      selected: !selectedTags.includes(tag),
    });

    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };

  const clearAllTags = () => setSelectedTags([]);
  const activeFilterCount = selectedTags.length;

  useEffect(() => {
    if (!debouncedSearch) return;

    posthog.capture("search_performed", {
      query: debouncedSearch,
      selected_tags: selectedTags,
      category,
    });
  }, [debouncedSearch]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero — search + filter dalam satu area */}
      <section className="border-b bg-card px-4 py-12 text-center md:py-20">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Temukan <span className="text-primary">Beasiswa</span>,{" "}
            <span className="text-emerald">Lomba</span> &{" "}
            <span className="text-violet">Event</span> Terbaik
          </h1>
          <p className="mt-4 text-muted-foreground">
            Platform terlengkap untuk mencari beasiswa, kompetisi, dan event
            terbaru bagi pelajar dan mahasiswa Indonesia.
          </p>
          <button
              onClick={() => {
                Sentry.captureException(
                  new Error("Manual captureException test")
                );
              }}
            >
              Test Sentry
            </button>

          {/* Search bar */}
          <div className="relative mx-auto mt-8 max-w-lg">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari beasiswa, lomba, atau event..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border bg-background py-3 pl-12 pr-10 text-sm shadow-sm outline-none ring-1 ring-transparent transition-all focus:ring-2 focus:ring-primary"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter toggle — di bawah search bar, centered */}
          <div className="mx-auto mt-4 max-w-lg">
            <button
              onClick={() => setShowTagFilter((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filter
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
              {showTagFilter ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Filter panel — muncul di bawah tombol */}
            {showTagFilter && (
              <div className="mt-3 rounded-2xl border bg-background p-4 shadow-md text-left">
                <div className="flex flex-wrap justify-center gap-2">
                  {ALL_TAGS.map((tag) => {
                    const config = TAG_CONFIG[tag];
                    const selected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => handleTagToggle(tag)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all border ${selected
                          ? config.pillClass +
                          " ring-2 ring-offset-1 ring-primary/40"
                          : "bg-secondary text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                          }`}
                      >
                        {selected && <span className="mr-1">✓</span>}
                        {config.label}
                      </button>
                    );
                  })}
                </div>

                {activeFilterCount > 0 && (
                  <div className="mt-3 flex items-center justify-center gap-3 border-t pt-3">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {selectedTags.map((t) => TAG_CONFIG[t].label).join(", ")}
                      </span>
                    </p>
                    <button
                      onClick={clearAllTags}
                      className="text-xs text-destructive hover:underline shrink-0"
                    >
                      Hapus semua
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Active filter chips — ditampilkan di atas grid kalau ada filter aktif */}
      {activeFilterCount > 0 && (
        <div className="border-b bg-card/50 px-4 py-2">
          <div className="mx-auto flex max-w-6xl items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground shrink-0">Filter aktif:</span>
            {selectedTags.map((tag) => {
              const config = TAG_CONFIG[tag];
              return (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.pillClass}`}
                >
                  {config.label}
                  <X className="h-3 w-3" />
                </button>
              );
            })}
            <button
              onClick={clearAllTags}
              className="ml-auto text-xs text-destructive hover:underline"
            >
              Hapus semua
            </button>
          </div>
        </div>
      )}

      {/* Post Grid */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Sparkles className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold text-muted-foreground">
              Belum ada postingan
            </h3>
            <p className="mt-1 text-sm text-muted-foreground/70">
              {search
                ? "Tidak ditemukan hasil untuk pencarian kamu."
                : activeFilterCount > 0
                  ? "Tidak ada post yang cocok dengan filter yang dipilih."
                  : "Nantikan beasiswa, lomba, dan event terbaru."}
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllTags}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Hapus semua filter
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}