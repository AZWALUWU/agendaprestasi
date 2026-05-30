import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useQuery } from "@tanstack/react-query";

import { useState, useEffect } from "react";

import {
  Search,
  Sparkles,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { fetchPublishedPosts } from "@backend/queries/posts";

import { Navbar } from "@frontend/components/Navbar";
import { PostCard } from "@frontend/components/PostCard";
import { PostCardSkeleton } from "@frontend/components/PostCardSkeleton";

import { useAuth } from "@frontend/hooks/use-auth";

import {
  ALL_TAGS,
  TAG_CONFIG,
  type PostTag,
} from "@frontend/lib/getCategoryConfig";

import { posthog } from "@/lib/posthog/client";

import { track } from "@/lib/analytics/events";
import { EVENTS } from "@/lib/analytics/event-names";

type HomeSearch = {
  category?: string;
  page?: number;
};

export const Route = createFileRoute("/")({
  component: HomePage,

  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    category: typeof search.category === "string" ? search.category : undefined,

    page:
      typeof search.page === "number" ? search.page : Number(search.page) || 1,
  }),
});

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);

    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

function HomePage() {
  const { category, page = 1 } = Route.useSearch();

  const navigate = useNavigate();

  const [search, setSearch] = useState("");

  const [selectedTags, setSelectedTags] = useState<PostTag[]>([]);

  const [showTagFilter, setShowTagFilter] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const { loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["posts", category, debouncedSearch, selectedTags, page],

    queryFn: () =>
      fetchPublishedPosts(
        category || undefined,
        debouncedSearch || undefined,
        selectedTags.length > 0 ? selectedTags : undefined,
        page,
        12,
      ),

    enabled: !authLoading,

    staleTime: 3 * 60 * 1000,

    gcTime: 10 * 60 * 1000,
  });

  const posts = data?.posts ?? [];
  const totalPages = data?.totalPages ?? 1;

  const handleTagToggle = (tag: PostTag) => {
    track(EVENTS.TAG_FILTER_USED, {
      tag,
    });

    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const clearAllTags = () => setSelectedTags([]);

  const activeFilterCount = selectedTags.length;

  // RESET PAGE WHEN FILTER/SEARCH CHANGES

  useEffect(() => {
    navigate({
      to: "/",

      search: (prev) => ({
        ...prev,
        page: 1,
      }),

      replace: true,
    });
  }, [debouncedSearch, selectedTags, category]);

  // SEARCH TRACKING

  useEffect(() => {
    if (!debouncedSearch) return;

    track(EVENTS.SEARCH_USED, {
      query: debouncedSearch,
    });
  }, [debouncedSearch]);

  // POSTHOG SEARCH TRACKING

  useEffect(() => {
    if (!debouncedSearch) return;

    posthog.capture("search_performed", {
      query: debouncedSearch,
      selected_tags: selectedTags,
      category,
    });
  }, [debouncedSearch]);

  // PAGINATION TRACKING

  useEffect(() => {
    track("pagination_used", {
      page,
    });
  }, [page]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO */}

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

          {/* SEARCH */}

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

          {/* FILTER */}

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
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all border ${
                          selected
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
                        {selectedTags
                          .map((t) => TAG_CONFIG[t].label)
                          .join(", ")}
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

      {/* ACTIVE FILTERS */}

      {activeFilterCount > 0 && (
        <div className="border-b bg-card/50 px-4 py-2">
          <div className="mx-auto flex max-w-6xl items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground shrink-0">
              Filter aktif:
            </span>

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

      {/* POSTS */}

      <section className="mx-auto max-w-6xl px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({
              length: 6,
            }).map((_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        ) : posts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>

            {/* PAGINATION */}

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                {/* PREV */}

                <button
                  disabled={page <= 1}
                  onClick={() => {
                    navigate({
                      to: "/",

                      search: (prev) => ({
                        ...prev,
                        page: page - 1,
                      }),
                    });

                    window.scrollTo({
                      top: 0,
                      behavior: "smooth",
                    });
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>

                {/* PAGE NUMBERS */}

                <div className="flex items-center gap-1">
                  {Array.from({
                    length: totalPages,
                  })
                    .slice(
                      Math.max(0, page - 3),
                      Math.min(totalPages, page + 2),
                    )
                    .map((_, i) => {
                      const pageNumber = Math.max(1, page - 2) + i;

                      return (
                        <button
                          key={pageNumber}
                          onClick={() => {
                            navigate({
                              to: "/",

                              search: (prev) => ({
                                ...prev,
                                page: pageNumber,
                              }),
                            });

                            window.scrollTo({
                              top: 0,
                              behavior: "smooth",
                            });
                          }}
                          className={`h-10 w-10 rounded-lg border text-sm font-medium transition-colors ${
                            pageNumber === page
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-secondary"
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                </div>

                {/* NEXT */}

                <button
                  disabled={page >= totalPages}
                  onClick={() => {
                    navigate({
                      to: "/",

                      search: (prev) => ({
                        ...prev,
                        page: page + 1,
                      }),
                    });

                    window.scrollTo({
                      top: 0,
                      behavior: "smooth",
                    });
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
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
