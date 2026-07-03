import { supabase } from "@backend/supabase/client";
import type { Database } from "@backend/supabase/types";
import { requireAdmin } from "@backend/auth/admin-middleware";

export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type PostInsert = Database["public"]["Tables"]["posts"]["Insert"];
export type PostUpdate = Database["public"]["Tables"]["posts"]["Update"];

const LIST_COLUMNS =
  "id, title, slug, description, category, tags, open_date, deadline, announcement_date, link, author_id, status, created_at, updated_at" as const;

// ponytail: client-side cache invalidation removed — the 5-minute KV TTL
// is sufficient for a content platform. Re-add via server function if
// instant propagation becomes necessary.

// ======================================================
// PUBLIC QUERIES
// ======================================================

export async function fetchPublishedPosts(
  category?: string,
  search?: string,
  tags?: string[],
  page: number = 1,
  limit: number = 12,
) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("posts")
    .select(LIST_COLUMNS, { count: "exact" })
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (category) {
    query = query.eq("category", category);
  }

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,description.ilike.%${search}%`,
    );
  }

  if (tags && tags.length > 0) {
    query = query.contains("tags", tags);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    posts: data ?? [],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  };
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

// ======================================================
// ADMIN QUERIES
// ======================================================

export async function fetchAllPosts(userId: string) {
  await requireAdmin(userId);

  const { data, error } = await supabase
    .from("posts")
    .select(LIST_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}

export async function createPost(
  post: PostInsert & { author_id?: string },
  userId: string,
) {
  await requireAdmin(userId);

  const toInsert = {
    ...post,
    author_id: post.author_id ?? userId,
  };

  const { data, error } = await supabase
    .from("posts")
    .insert(toInsert)
    .select()
    .single();

  if (error) throw error;

  if (!data) {
    throw new Error(
      "Post gagal dibuat — RLS policy memblokir insert. Pastikan session masih aktif.",
    );
  }

  return data;
}

export async function updatePost(
  id: string,
  post: PostUpdate,
  userId: string,
) {
  await requireAdmin(userId);

  const { data, error } = await supabase
    .from("posts")
    .update(post)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deletePost(
  id: string,
  userId: string,
) {
  await requireAdmin(userId);

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function togglePostStatus(
  id: string,
  currentStatus: string,
  userId: string,
) {
  await requireAdmin(userId);

  const newStatus =
    currentStatus === "published"
      ? "draft"
      : "published";

  return updatePost(
    id,
    { status: newStatus } as PostUpdate,
    userId,
  );
}