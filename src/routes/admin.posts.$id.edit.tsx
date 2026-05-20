import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PostForm } from "@frontend/components/PostForm";
import { updatePost, type PostUpdate } from "@backend/queries/posts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@backend/supabase/client";
import { useAuth } from "@frontend/hooks/use-auth";
import { useUserRole } from "@frontend/hooks/useUserRole";
import { can } from "@backend/auth/permissions";
import { toast } from "sonner";
import { Skeleton } from "@frontend/components/ui/skeleton";
import { useEffect } from "react";

export const Route = createFileRoute("/admin/posts/$id/edit")({
  component: EditPostPage,
});

function EditPostPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: role, isLoading: roleLoading } = useUserRole();
  const currentRole = role ?? "public";
  const currentUserId = user?.id ?? "";

  const { data: post, isLoading } = useQuery({
    queryKey: ["admin-post", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("posts").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  // Guard: redirect if no permission to edit this post
  useEffect(() => {
    if (!isLoading && !roleLoading && post) {
      if (!can.editPost(currentRole, post.author_id, currentUserId)) {
        toast.error("Kamu hanya bisa mengedit post milikmu sendiri.");
        navigate({ to: "/admin" });
      }
    }
  }, [isLoading, roleLoading, post, currentRole, currentUserId, navigate]);

  const mutation = useMutation({
    mutationFn: (data: PostUpdate) => {
      if (!can.editPost(currentRole, post?.author_id ?? null, currentUserId)) {
        throw new Error("Kamu hanya bisa mengedit post milikmu sendiri.");
      }
      if (!currentUserId) throw new Error("Not authenticated");
      return updatePost(id, data, currentUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success("Post berhasil diperbarui!");
      navigate({ to: "/admin" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || roleLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!post) {
    return <div className="text-center py-12 text-muted-foreground">Post tidak ditemukan</div>;
  }

  if (!can.editPost(currentRole, post.author_id, currentUserId)) {
    return null;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Edit Post</h1>
      <PostForm initialData={post} onSubmit={(data) => mutation.mutate(data)} loading={mutation.isPending} />
    </div>
  );
}
