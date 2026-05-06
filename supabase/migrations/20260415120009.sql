-- Unique constraint: one bookmark per user per post
ALTER TABLE public.bookmarks
  ADD CONSTRAINT bookmarks_user_post_unique UNIQUE (user_id, post_id);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id ON public.bookmarks(post_id);
