import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@backend/supabase/client";
import { useAuth } from "@frontend/hooks/use-auth";
import { toast } from "sonner";
import { track } from "@/lib/analytics/events";
import { EVENTS } from "@/lib/analytics/event-names";


export function useBookmarkedIds() {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: ["bookmarks", "ids", user?.id],
    queryFn: async () => {
      if (!user) return new Set<string>();
      const { data, error } = await supabase
        .from("bookmarks")
        .select("post_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return new Set(data.map((b) => b.post_id));
    },
    enabled: !authLoading && !!user,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useBookmarkedPosts() {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: ["bookmarks", "posts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("bookmarks")
        .select(`
          id,
          created_at,
          post:posts (
            id, title, slug, description, category,
            open_date, deadline, image_url, status
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((b) => b.post !== null);
    },
    enabled: !authLoading && !!user,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useToggleBookmark() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, isBookmarked }: { postId: string; isBookmarked: boolean }) => {
      if (!user) throw new Error("not_authenticated");
      if (isBookmarked) {
        const { error } = await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", postId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("bookmarks")
          .insert({ user_id: user.id, post_id: postId });
        if (error) throw error;
      }
    },
    onMutate: async ({ postId, isBookmarked }) => {
      await queryClient.cancelQueries({ queryKey: ["bookmarks", "ids"] });
      const previous = queryClient.getQueryData<Set<string>>(["bookmarks", "ids", user?.id]);
      queryClient.setQueryData<Set<string>>(
        ["bookmarks", "ids", user?.id],
        (old = new Set()) => {
          const next = new Set(old);
          isBookmarked ? next.delete(postId) : next.add(postId);
          return next;
        }
      );
      return { previous };
    },
    onSuccess: (_, variables) => {
      track(
        variables.isBookmarked
          ? EVENTS.BOOKMARK_REMOVED
          : EVENTS.BOOKMARK_ADDED,
        {
          post_id: variables.postId,
        }
      );

      toast.success(
        variables.isBookmarked
          ? "Dihapus dari simpanan"
          : "Berhasil disimpan! 🔖"
      );

      queryClient.invalidateQueries({
        queryKey: ["bookmarks"],
      });
    },
    onError: (error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["bookmarks", "ids", user?.id], context.previous);
      }
      if ((error as Error).message === "not_authenticated") return;
      toast.error("Gagal menyimpan. Silakan coba lagi.");
    },
  });
}

