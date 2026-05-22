import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PostForm } from "@frontend/components/PostForm";
import { createPost, type PostInsert } from "@backend/queries/posts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@frontend/hooks/use-auth";
import { supabase } from "@backend/supabase/client";

export const Route = createFileRoute("/admin/posts/new")({
  component: NewPostPage,
});

async function getSessionSafe() {
  const timeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), 5000)
  );
  const sessionPromise = supabase.auth.getSession().then((r) => r.data.session);
  const session = await Promise.race([sessionPromise, timeout]);
  return session;
}

function NewPostPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const mutation = useMutation({
    mutationFn: async (data: PostInsert) => {
      if (!user?.id) throw new Error("Not authenticated");

      const session = await getSessionSafe();
      if (!session) {
        throw new Error("Sesi tidak ditemukan atau timeout — silakan login ulang");
      }

      return createPost({ ...data, author_id: user.id }, user.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success("Post berhasil dibuat!");
      navigate({ to: "/admin" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Buat Post Baru</h1>
      <PostForm onSubmit={(data) => mutation.mutate(data)} loading={mutation.isPending} />
    </div>
  );
}