import { supabase } from "@backend/supabase/client";
import type { Database } from "@backend/supabase/types";
import { requireAdmin } from "@backend/auth/admin-middleware";

export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type PostInsert = Database["public"]["Tables"]["posts"]["Insert"];
export type PostUpdate = Database["public"]["Tables"]["posts"]["Update"];

// Kolom untuk list page — exclude content untuk hemat bandwidth
const LIST_COLUMNS = "id, title, slug, description, category, open_date, deadline, announcement_date, link, image_url, author_id, status, created_at, updated_at" as const;

// Public queries
export async function fetchPublishedPosts(category?: string, search?: string) {
  let query = supabase
    .from("posts")
    .select(LIST_COLUMNS)           // ← tidak ambil content
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);
  if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchPostBySlug(slug: string) {
  // Detail page — ambil semua kolom termasuk content
  const { data, error } = await supabase
    .from("posts")
    .select("*")                    // ← full data hanya di detail page
    .eq("slug", slug)
    .single();
  if (error) throw error;
  return data;
}

// Admin queries
export async function fetchAllPosts(userId: string) {
  await requireAdmin(userId);
  // Admin list — exclude content juga, tidak perlu di tabel
  const { data, error } = await supabase
    .from("posts")
    .select(LIST_COLUMNS)           // ← tidak ambil content
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
  if (!data) throw new Error(
    "Post gagal dibuat — RLS policy memblokir insert. Pastikan session masih aktif."
  );
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
  if (!data) throw new Error(
    "Post gagal diperbarui — RLS policy memblokir update. Pastikan kamu adalah pemilik post ini."
  );
  return data;
}

export async function deletePost(id: string, userId: string) {
  await requireAdmin(userId);
  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", id);
  if (error) throw error;
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