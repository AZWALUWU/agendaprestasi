import { supabase } from "@backend/supabase/client";
import type { Database } from "@backend/supabase/types";
import { requireAdmin } from "@backend/auth/admin-middleware";

export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type PostInsert = Database["public"]["Tables"]["posts"]["Insert"];
export type PostUpdate = Database["public"]["Tables"]["posts"]["Update"];

const LIST_COLUMNS = "id, title, slug, description, category, open_date, deadline, announcement_date, link, image_url, author_id, status, created_at, updated_at" as const;

async function invalidatePostsCache(): Promise<void> {
  const secret = import.meta.env.VITE_CACHE_INVALIDATE_SECRET;
  if (!secret) return;
  try {
    await fetch("/api/cache/invalidate", {
      method: "POST",
      headers: { "x-cache-secret": secret },
    });
  } catch {
    // Cache invalidation gagal — TTL akan expire sendiri
  }
}

async function deleteImageFromStorage(imageUrl: string): Promise<void> {
  try {
    // Extract filename dari URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/post-images/filename.jpg
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split("/");
    const bucketIndex = pathParts.indexOf("post-images");
    if (bucketIndex === -1) return;

    // Ambil semua path setelah nama bucket (handle subfolder jika ada)
    const filePath = pathParts.slice(bucketIndex + 1).join("/");
    if (!filePath) return;

    const { error } = await supabase.storage
      .from("post-images")
      .remove([filePath]);

    if (error) {
      console.error("Failed to delete old image:", error.message);
    }
  } catch {
    // Gagal hapus gambar lama — tidak critical, lanjutkan
  }
}

// Public queries
export async function fetchPublishedPosts(category?: string, search?: string) {
  let query = supabase
    .from("posts")
    .select(LIST_COLUMNS)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);
  if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchPostBySlug(slug: string) {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  return data;
}

// Admin queries
export async function fetchAllPosts(userId: string) {
  await requireAdmin(userId);
  const { data, error } = await supabase
    .from("posts")
    .select(LIST_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createPost(post: PostInsert & { author_id?: string }, userId: string) {
  await requireAdmin(userId);
  const toInsert = { ...post, author_id: post.author_id ?? userId };

  const { data, error } = await supabase
    .from("posts")
    .insert(toInsert)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error("Post gagal dibuat — RLS policy memblokir insert. Pastikan session masih aktif.");

  invalidatePostsCache();
  return data;
}

export async function updatePost(id: string, post: PostUpdate, userId: string) {
  await requireAdmin(userId);

  // Fetch post lama untuk cek image_url
  const { data: existingPost, error: fetchError } = await supabase
    .from("posts")
    .select("image_url")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  // Update post
  const { data, error } = await supabase
    .from("posts")
    .update(post)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error("Post gagal diperbarui — RLS policy memblokir update. Pastikan kamu adalah pemilik post ini.");

  // Hapus gambar lama jika image_url berubah
  if (
    existingPost?.image_url &&
    post.image_url !== undefined &&
    post.image_url !== existingPost.image_url
  ) {
    await deleteImageFromStorage(existingPost.image_url);
  }

  invalidatePostsCache();
  return data;
}

export async function deletePost(id: string, userId: string) {
  await requireAdmin(userId);

  // Fetch image_url sebelum delete untuk cleanup storage
  const { data: existingPost } = await supabase
    .from("posts")
    .select("image_url")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", id);

  if (error) throw error;

  // Hapus gambar dari storage setelah post berhasil dihapus
  if (existingPost?.image_url) {
    await deleteImageFromStorage(existingPost.image_url);
  }

  invalidatePostsCache();
}

export async function togglePostStatus(id: string, currentStatus: string, userId: string) {
  await requireAdmin(userId);
  const newStatus = currentStatus === "published" ? "draft" : "published";
  return updatePost(id, { status: newStatus } as PostUpdate, userId);
}

export async function uploadPostImage(file: File, userId: string) {
  await requireAdmin(userId);
  const ext = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
  const { error } = await supabase.storage
    .from("post-images")
    .upload(fileName, file);
  if (error) throw error;
  const { data: urlData } = supabase.storage
    .from("post-images")
    .getPublicUrl(fileName);
  return urlData.publicUrl;
}