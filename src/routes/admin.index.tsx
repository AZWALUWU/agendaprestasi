import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllPosts, deletePost, togglePostStatus } from "@backend/queries/posts";
import { getCategoryConfig } from "@frontend/lib/getCategoryConfig";
import { useAuth } from "@frontend/hooks/use-auth";
import { useUserRole } from "@frontend/hooks/useUserRole";
import { can } from "@backend/auth/permissions";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@frontend/components/ui/button";
import { Skeleton } from "@frontend/components/ui/skeleton";
import { useState } from "react";

export const Route = createFileRoute("/admin/")({
  component: AdminPostsPage,
});

function AdminPostsPage() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { user } = useAuth();
  const { data: role, isLoading: roleLoading } = useUserRole();
  const currentRole = role ?? "public";
  const currentUserId = user?.id ?? "";

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: () => fetchAllPosts(currentUserId),
    enabled: !!user?.id && !roleLoading && (currentRole === "admin" || currentRole === "super_admin"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      const post = posts?.find((p) => p.id === id);
      const authorId = (post as any)?.author_id as string | null;
      if (!can.deletePost(currentRole, authorId, currentUserId)) {
        throw new Error("Kamu hanya bisa menghapus post milikmu sendiri.");
      }
      if (!currentUserId) throw new Error("Not authenticated");
      return deletePost(id, currentUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success("Post dihapus");
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => {
      const post = posts?.find((p) => p.id === id);
      const authorId = (post as any)?.author_id as string | null;
      if (!can.publishPost(currentRole, authorId, currentUserId)) {
        throw new Error("Kamu hanya bisa mengubah status post milikmu sendiri.");
      }
      if (!currentUserId) throw new Error("Not authenticated");
      return togglePostStatus(id, status, currentUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success("Status diubah");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kelola Posts</h1>
        <Link to="/admin/posts/new">
          <Button><Plus className="mr-1 h-4 w-4" /> Buat Post Baru</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Memuat...</div>
      ) : !posts?.length ? (
        <div className="text-center py-12 text-muted-foreground">Belum ada post. Buat post pertama kamu!</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/50">
                <th className="px-4 py-3 text-left font-medium">Cover</th>
                <th className="px-4 py-3 text-left font-medium">Judul</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Kategori</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Deadline</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => {
                const authorId = (post as any).author_id as string | null;
                const canEdit = can.editPost(currentRole, authorId, currentUserId);
                const canDel = can.deletePost(currentRole, authorId, currentUserId);
                const canPublish = can.publishPost(currentRole, authorId, currentUserId);
                const isOwnPost = authorId === currentUserId;

                return (
                  <tr key={post.id} className="border-b last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      {post.image_url ? (
                        <img src={post.image_url} alt="" className="h-10 w-16 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-16 rounded bg-secondary" />
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="font-medium truncate">{post.title}</div>
                      {!isOwnPost && currentRole === "super_admin" && authorId && (
                        <div className="text-xs text-muted-foreground mt-0.5">oleh admin lain</div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {(() => {
                        const cc = getCategoryConfig(post.category);
                        return (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cc.pillClass}`}>
                            {cc.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {post.deadline ? new Date(post.deadline).toLocaleDateString("id-ID") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        post.status === "published" ? "bg-deadline-green text-deadline-green-foreground" : "bg-deadline-gray text-deadline-gray-foreground"
                      }`}>
                        {post.status === "published" ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {roleLoading ? (
                          <>
                            <Skeleton className="h-8 w-8 rounded-lg" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                          </>
                        ) : (
                          <>
                            {canPublish && (
                              <button
                                onClick={() => toggleMutation.mutate({ id: post.id, status: post.status })}
                                className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                                title={post.status === "published" ? "Unpublish" : "Publish"}
                              >
                                {post.status === "published" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            )}
                            {canEdit && (
                              <Link to="/admin/posts/$id/edit" params={{ id: post.id }} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                                <Pencil className="h-4 w-4" />
                              </Link>
                            )}
                            {canDel && (
                              <button
                                onClick={() => setDeleteId(post.id)}
                                className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Hapus Post?</h3>
            <p className="mt-2 text-sm text-muted-foreground">Tindakan ini tidak bisa dibatalkan.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
