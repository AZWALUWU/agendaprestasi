import { Bookmark } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@frontend/hooks/use-auth";
import { useBookmarkedIds, useToggleBookmark } from "@frontend/hooks/useBookmarks";
import { toast } from "sonner";
import { posthog } from "@/lib/posthog/client";

interface BookmarkButtonProps {
  postId: string;
  variant?: "card" | "detail" | "list";
}

export function BookmarkButton({ postId, variant = "card" }: BookmarkButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: bookmarkedIds } = useBookmarkedIds();
  const { mutate: toggleBookmark, isPending } = useToggleBookmark();

  const isBookmarked = bookmarkedIds?.has(postId) ?? false;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    posthog.capture("bookmark_unauthenticated_click", {
      post_id: postId,
    });

    if (!user) {
      toast("Login dulu untuk menyimpan 🔖", {
        duration: 5000,
        action: {
          label: "Masuk",
          onClick: () => navigate({ to: "/login" }),
        },
      });
      return;
    }

    toggleBookmark({ postId, isBookmarked });

    posthog.capture(
      isBookmarked
        ? "bookmark_removed"
        : "bookmark_added",
      {
        post_id: postId,
      }
    );

  };

  if (variant === "card") {
    return (
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`rounded-full p-1.5 backdrop-blur-sm transition-all ${isBookmarked
            ? "bg-primary text-primary-foreground"
            : "bg-background/70 text-muted-foreground hover:text-primary hover:bg-background/90"
          }`}
        aria-label={isBookmarked ? "Hapus bookmark" : "Simpan bookmark"}
      >
        <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
      </button>
    );
  }

  if (variant === "list") {
    return (
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`shrink-0 rounded-full p-2 transition-all ${isBookmarked
            ? "text-primary"
            : "text-muted-foreground hover:text-primary hover:bg-secondary"
          }`}
        aria-label={isBookmarked ? "Hapus bookmark" : "Simpan bookmark"}
      >
        <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
      </button>
    );
  }

  // variant === 'detail'
  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${isBookmarked
          ? "bg-primary/10 text-primary"
          : "bg-secondary text-muted-foreground hover:text-primary hover:bg-secondary/80"
        }`}
      aria-label={isBookmarked ? "Hapus bookmark" : "Simpan bookmark"}
    >
      <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? "fill-current" : ""}`} />
      {isBookmarked ? "Disimpan" : "Simpan"}
    </button>
  );
}
