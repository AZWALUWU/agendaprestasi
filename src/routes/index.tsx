import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Search, Sparkles, X } from "lucide-react";
import { fetchPublishedPosts } from "@backend/queries/posts";
import { Navbar } from "@frontend/components/Navbar";
import { PostCard } from "@frontend/components/PostCard";
import { PostCardSkeleton } from "@frontend/components/PostCardSkeleton";
import { useAuth } from "@frontend/hooks/use-auth";

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
  const debouncedSearch = useDebounce(search, 300);
  const { loading: authLoading } = useAuth();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts", category, debouncedSearch],
    queryFn: () => fetchPublishedPosts(category || undefined, debouncedSearch || undefined),
    enabled: !authLoading,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="border-b bg-card px-4 py-12 text-center md:py-20">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Temukan <span className="text-primary">Beasiswa</span>,{" "}
            <span className="text-emerald">Lomba</span> &{" "}
            <span className="text-violet">Event</span> Terbaik
          </h1>
          <p className="mt-4 text-muted-foreground">
            Platform terlengkap untuk mencari beasiswa, kompetisi, dan event terbaru bagi pelajar dan mahasiswa Indonesia.
          </p>
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
        </div>
      </section>

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
            <h3 className="text-lg font-semibold text-muted-foreground">Belum ada postingan</h3>
            <p className="mt-1 text-sm text-muted-foreground/70">
              {search
                ? "Tidak ditemukan hasil untuk pencarian kamu."
                : "Nantikan beasiswa, lomba, dan event terbaru."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}