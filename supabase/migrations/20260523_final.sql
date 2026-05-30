-- ============================================================================
-- FINAL CONSOLIDATED SCHEMA v5
-- agendaprestasi — Beasiswa, Lomba & Event Platform
-- Optimized for Pagination + Scaling
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- CLEANUP: Drop tryout system (safe even if tables do not exist)
-- ============================================================================

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'tryout_subject_timers'
  ) THEN
    DROP POLICY IF EXISTS "Users manage own timers"
    ON public.tryout_subject_timers;

    DROP TABLE public.tryout_subject_timers CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'tryout_answers'
  ) THEN
    DROP POLICY IF EXISTS "Users manage own answers"
    ON public.tryout_answers;

    DROP TABLE public.tryout_answers CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'tryout_sessions'
  ) THEN
    DROP POLICY IF EXISTS "Users manage own sessions"
    ON public.tryout_sessions;

    DROP POLICY IF EXISTS "Users read all submitted sessions for ranking"
    ON public.tryout_sessions;

    DROP TABLE public.tryout_sessions CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'tryout_event_questions'
  ) THEN
    DROP POLICY IF EXISTS "Public read event questions metadata"
    ON public.tryout_event_questions;

    DROP POLICY IF EXISTS "Admin manage event questions"
    ON public.tryout_event_questions;

    DROP TABLE public.tryout_event_questions CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'tryout_events'
  ) THEN
    DROP TRIGGER IF EXISTS update_tryout_events_updated_at
    ON public.tryout_events;

    DROP POLICY IF EXISTS "Public read published events"
    ON public.tryout_events;

    DROP POLICY IF EXISTS "Admin manage events"
    ON public.tryout_events;

    DROP TABLE public.tryout_events CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'questions'
  ) THEN
    DROP TRIGGER IF EXISTS update_questions_updated_at
    ON public.questions;

    DROP POLICY IF EXISTS "Admin manage questions"
    ON public.questions;

    DROP POLICY IF EXISTS "Authenticated read questions"
    ON public.questions;

    DROP TABLE public.questions CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'subjects'
  ) THEN
    DROP POLICY IF EXISTS "Public read subjects"
    ON public.subjects;

    DROP TABLE public.subjects CASCADE;
  END IF;
END $$;

-- ============================================================================
-- STORAGE CLEANUP
-- ============================================================================

DROP POLICY IF EXISTS "Public can read question images"
ON storage.objects;

DROP POLICY IF EXISTS "Admins can upload question images"
ON storage.objects;

DROP POLICY IF EXISTS "Admins can update question images"
ON storage.objects;

DROP POLICY IF EXISTS "Admins can delete question images"
ON storage.objects;

-- ============================================================================
-- CLEANUP: DROP EXISTING POLICIES
-- ============================================================================

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'posts'
  ) THEN
    DROP POLICY IF EXISTS "Public can read published posts"
    ON public.posts;

    DROP POLICY IF EXISTS "Admin can insert posts"
    ON public.posts;

    DROP POLICY IF EXISTS "Admin can update own posts"
    ON public.posts;

    DROP POLICY IF EXISTS "Admin can delete own posts"
    ON public.posts;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
  ) THEN
    DROP POLICY IF EXISTS "Users can read own role"
    ON public.user_roles;

    DROP POLICY IF EXISTS "Super admin can insert roles"
    ON public.user_roles;

    DROP POLICY IF EXISTS "Super admin can update roles"
    ON public.user_roles;

    DROP POLICY IF EXISTS "Super admin can delete roles"
    ON public.user_roles;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'bookmarks'
  ) THEN
    DROP POLICY IF EXISTS "Users can manage own bookmarks"
    ON public.bookmarks;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'app_settings'
  ) THEN
    DROP POLICY IF EXISTS "Anyone can read app_settings"
    ON public.app_settings;
  END IF;
END $$;

DROP POLICY IF EXISTS "Anyone can read post images"
ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload post images"
ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can update post images"
ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can delete post images"
ON storage.objects;

-- ============================================================================
-- 1. APP SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

ALTER TABLE public.app_settings
ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app_settings"
ON public.app_settings
FOR SELECT
USING (true);

-- ============================================================================
-- 2. UPDATED_AT FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. USER ROLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin'
    CHECK (role IN ('super_admin', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
ON public.user_roles(user_id);

-- ============================================================================
-- ROLE CHECK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_user_role(
  _user_id UUID,
  _roles TEXT[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  );
$$;

ALTER TABLE public.user_roles
ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Super admin can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  public.has_user_role(
    auth.uid(),
    ARRAY['super_admin']
  )
);

CREATE POLICY "Super admin can update roles"
ON public.user_roles
FOR UPDATE
USING (
  public.has_user_role(
    auth.uid(),
    ARRAY['super_admin']
  )
);

CREATE POLICY "Super admin can delete roles"
ON public.user_roles
FOR DELETE
USING (
  public.has_user_role(
    auth.uid(),
    ARRAY['super_admin']
  )
);

-- ============================================================================
-- 4. POSTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  title TEXT NOT NULL,

  slug TEXT UNIQUE NOT NULL,

  description TEXT,

  content TEXT,

  category TEXT NOT NULL
    CHECK (
      category IN (
        'scholarship',
        'competition',
        'event'
      )
    ),

  tags TEXT[] DEFAULT '{}',

  deadline DATE,

  open_date DATE,

  announcement_date DATE,

  link TEXT,

  image_url TEXT,

  author_id UUID
    REFERENCES auth.users(id)
    ON DELETE SET NULL,

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (
      status IN (
        'draft',
        'published'
      )
    ),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.posts
ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_posts_updated_at
ON public.posts;

CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE
ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- POSTS INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_posts_author_id
ON public.posts(author_id);

CREATE INDEX IF NOT EXISTS idx_posts_created_at
ON public.posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_category_created_at
ON public.posts(category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_status_created_at
ON public.posts(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_feed_query
ON public.posts(
  status,
  category,
  created_at DESC
);

CREATE INDEX IF NOT EXISTS idx_posts_tags
ON public.posts
USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_posts_title_description_search
ON public.posts
USING GIN (
  to_tsvector(
    'simple',
    coalesce(title, '') || ' ' ||
    coalesce(description, '')
  )
);

-- ============================================================================
-- POSTS POLICIES
-- ============================================================================

CREATE POLICY "Public can read published posts"
ON public.posts
FOR SELECT
USING (
  status = 'published'
  OR public.has_user_role(
    auth.uid(),
    ARRAY['admin', 'super_admin']
  )
);

CREATE POLICY "Admin can insert posts"
ON public.posts
FOR INSERT
WITH CHECK (
  public.has_user_role(
    auth.uid(),
    ARRAY['admin', 'super_admin']
  )
);

CREATE POLICY "Admin can update own posts"
ON public.posts
FOR UPDATE
USING (
  (
    author_id = auth.uid()
    AND public.has_user_role(
      auth.uid(),
      ARRAY['admin']
    )
  )
  OR public.has_user_role(
    auth.uid(),
    ARRAY['super_admin']
  )
);

CREATE POLICY "Admin can delete own posts"
ON public.posts
FOR DELETE
USING (
  (
    author_id = auth.uid()
    AND public.has_user_role(
      auth.uid(),
      ARRAY['admin']
    )
  )
  OR public.has_user_role(
    auth.uid(),
    ARRAY['super_admin']
  )
);

-- ============================================================================
-- 5. BOOKMARKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  post_id UUID NOT NULL
    REFERENCES public.posts(id)
    ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, post_id)
);

ALTER TABLE public.bookmarks
ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own bookmarks"
ON public.bookmarks
FOR ALL
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id
ON public.bookmarks(user_id);

CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id
ON public.bookmarks(post_id);

-- ============================================================================
-- 6. STORAGE
-- ============================================================================

INSERT INTO storage.buckets (
  id,
  name,
  public
)
VALUES (
  'post-images',
  'post-images',
  true
)
ON CONFLICT (id)
DO NOTHING;

CREATE POLICY "Anyone can read post images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'post-images'
);

CREATE POLICY "Authenticated users can upload post images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'post-images'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update post images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'post-images'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete post images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'post-images'
  AND auth.role() = 'authenticated'
);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================