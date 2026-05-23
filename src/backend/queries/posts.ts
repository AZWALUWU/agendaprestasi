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
    // Cache invalidation gagal — TTL akan expire sendiri dalam 5 menit
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
  const { data, error } = await supabase
    .from("posts")
    .update(post)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error("Post gagal diperbarui — RLS policy memblokir update. Pastikan kamu adalah pemilik post ini.");

  invalidatePostsCache();
  return data;
}

export async function deletePost(id: string, userId: string) {
  await requireAdmin(userId);
  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", id);
  if (error) throw error;

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