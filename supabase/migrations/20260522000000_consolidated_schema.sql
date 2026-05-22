-- ============================================================================
-- CONSOLIDATED SCHEMA MIGRATION
-- ============================================================================
-- This file consolidates all previous migrations into one comprehensive schema.
-- Executed only once; subsequent migrations are additive changes.
-- ============================================================================

-- ============================================================================
-- 1. APP SETTINGS & POSTS (Initial schema)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Anyone can read app_settings" ON public.app_settings
  FOR SELECT USING (true);

-- Posts table with all columns
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  content TEXT,
  category TEXT NOT NULL CHECK (category IN ('scholarship', 'competition')),
  deadline DATE,
  open_date DATE,
  announcement_date DATE,
  link TEXT,
  image_url TEXT,
  author_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER IF NOT EXISTS update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 2. USER ROLES & PERMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('super_admin', 'admin')) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Security definer function to check roles (avoids infinite recursion)
CREATE OR REPLACE FUNCTION public.has_user_role(_user_id UUID, _roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can read own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Super admin can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_user_role(auth.uid(), ARRAY['super_admin']));

CREATE POLICY IF NOT EXISTS "Super admin can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_user_role(auth.uid(), ARRAY['super_admin']));

CREATE POLICY IF NOT EXISTS "Super admin can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_user_role(auth.uid(), ARRAY['super_admin']));

-- ============================================================================
-- 3. POSTS POLICIES (with user_roles)
-- ============================================================================

DROP POLICY IF EXISTS "Admin can delete posts" ON public.posts;
DROP POLICY IF EXISTS "Admin can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Admin can update posts" ON public.posts;
DROP POLICY IF EXISTS "Public can read published posts" ON public.posts;

CREATE POLICY IF NOT EXISTS "Public can read published posts"
  ON public.posts FOR SELECT
  USING (status = 'published' OR public.has_user_role(auth.uid(), ARRAY['admin', 'super_admin']));

CREATE POLICY IF NOT EXISTS "Admin can insert posts"
  ON public.posts FOR INSERT
  WITH CHECK (
    public.has_user_role(auth.uid(), ARRAY['admin', 'super_admin'])
    AND (author_id = auth.uid() OR author_id IS NULL)
  );

CREATE POLICY IF NOT EXISTS "Admin can update own posts"
  ON public.posts FOR UPDATE
  USING (
    (author_id = auth.uid() AND public.has_user_role(auth.uid(), ARRAY['admin']))
    OR public.has_user_role(auth.uid(), ARRAY['super_admin'])
  );

CREATE POLICY IF NOT EXISTS "Admin can delete own posts"
  ON public.posts FOR DELETE
  USING (
    (author_id = auth.uid() AND public.has_user_role(auth.uid(), ARRAY['admin']))
    OR public.has_user_role(auth.uid(), ARRAY['super_admin'])
  );

CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);

-- ============================================================================
-- 4. BOOKMARKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can manage own bookmarks" ON public.bookmarks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id ON public.bookmarks(post_id);

-- ============================================================================
-- 5. STORAGE: POST IMAGES
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can read post images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read post images by path" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update post images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete post images" ON storage.objects;

CREATE POLICY IF NOT EXISTS "Anyone can read post images" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-images' AND (auth.role() = 'anon' OR auth.role() = 'authenticated'));

CREATE POLICY IF NOT EXISTS "Authenticated users can upload post images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'post-images' AND auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Authenticated users can update post images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'post-images' AND auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Authenticated users can delete post images" ON storage.objects
  FOR DELETE USING (bucket_id = 'post-images' AND auth.role() = 'authenticated');

-- ============================================================================
-- 6. TRYOUT SYSTEM: SUBJECTS, QUESTIONS, EVENTS, SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  order_index INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.subjects (code, name, duration_minutes, order_index)
VALUES
  ('KPU', 'Kemampuan Penalaran Umum', 30, 1),
  ('KK', 'Kemampuan Kuantitatif', 20, 2),
  ('PPU', 'Pengetahuan dan Pemahaman Umum', 25, 3),
  ('PMM', 'Pemahaman Membaca dan Menulis', 25, 4),
  ('PM', 'Penalaran Matematika', 30, 5),
  ('LBI', 'Literasi Bahasa Indonesia', 25, 6),
  ('LBE', 'Literasi Bahasa Inggris', 25, 7),
  ('PKU', 'Pengetahuan Kuantitatif', 20, 8)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  image_url TEXT,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  option_e TEXT NOT NULL,
  correct_answer TEXT CHECK (correct_answer IN ('A','B','C','D','E')) NOT NULL,
  explanation TEXT,
  explanation_image_url TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy','medium','hard')) DEFAULT 'medium',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER IF NOT EXISTS update_questions_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.tryout_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('draft','published','ended')) DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER IF NOT EXISTS update_tryout_events_updated_at
BEFORE UPDATE ON public.tryout_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.tryout_event_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.tryout_events(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) NOT NULL,
  question_id UUID REFERENCES public.questions(id) NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  UNIQUE(event_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.tryout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id UUID REFERENCES public.tryout_events(id) ON DELETE CASCADE NOT NULL,
  current_subject_id UUID REFERENCES public.subjects(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  total_score NUMERIC(6,2),
  status TEXT CHECK (status IN ('in_progress','submitted')) DEFAULT 'in_progress'
);

CREATE TABLE IF NOT EXISTS public.tryout_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.tryout_sessions(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) NOT NULL,
  selected_answer TEXT CHECK (selected_answer IN ('A','B','C','D','E')),
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.tryout_subject_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.tryout_sessions(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  UNIQUE(session_id, subject_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_event_questions_event ON public.tryout_event_questions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_questions_subject ON public.tryout_event_questions(event_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.tryout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_event ON public.tryout_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_answers_session ON public.tryout_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_timers_session ON public.tryout_subject_timers(session_id);

-- ============================================================================
-- 7. TRYOUT RLS POLICIES
-- ============================================================================

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tryout_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tryout_event_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tryout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tryout_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tryout_subject_timers ENABLE ROW LEVEL SECURITY;

-- Subjects: public read
CREATE POLICY IF NOT EXISTS "Public read subjects" ON public.subjects
  FOR SELECT USING (true);

-- Questions: admin manage, authenticated read
CREATE POLICY IF NOT EXISTS "Admin manage questions" ON public.questions
  FOR ALL USING (public.has_user_role(auth.uid(), ARRAY['admin','super_admin']))
  WITH CHECK (public.has_user_role(auth.uid(), ARRAY['admin','super_admin']));

CREATE POLICY IF NOT EXISTS "Authenticated read questions" ON public.questions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Tryout events
CREATE POLICY IF NOT EXISTS "Public read published events" ON public.tryout_events
  FOR SELECT USING (status = 'published' OR public.has_user_role(auth.uid(), ARRAY['admin','super_admin']));

CREATE POLICY IF NOT EXISTS "Admin manage events" ON public.tryout_events
  FOR ALL USING (public.has_user_role(auth.uid(), ARRAY['admin','super_admin']))
  WITH CHECK (public.has_user_role(auth.uid(), ARRAY['admin','super_admin']));

-- Event questions: public read metadata
CREATE POLICY IF NOT EXISTS "Public read event questions metadata" ON public.tryout_event_questions
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Admin manage event questions" ON public.tryout_event_questions
  FOR ALL USING (public.has_user_role(auth.uid(), ARRAY['admin','super_admin']))
  WITH CHECK (public.has_user_role(auth.uid(), ARRAY['admin','super_admin']));

-- Sessions: users own
CREATE POLICY IF NOT EXISTS "Users manage own sessions" ON public.tryout_sessions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users read all submitted sessions for ranking" ON public.tryout_sessions
  FOR SELECT USING (status = 'submitted' AND auth.uid() IS NOT NULL);

-- Answers: users own
CREATE POLICY IF NOT EXISTS "Users manage own answers" ON public.tryout_answers
  FOR ALL USING (
    session_id IN (SELECT id FROM public.tryout_sessions WHERE user_id = auth.uid())
  )
  WITH CHECK (
    session_id IN (SELECT id FROM public.tryout_sessions WHERE user_id = auth.uid())
  );

-- Timers: users own
CREATE POLICY IF NOT EXISTS "Users manage own timers" ON public.tryout_subject_timers
  FOR ALL USING (
    session_id IN (SELECT id FROM public.tryout_sessions WHERE user_id = auth.uid())
  )
  WITH CHECK (
    session_id IN (SELECT id FROM public.tryout_sessions WHERE user_id = auth.uid())
  );

-- ============================================================================
-- 8. STORAGE: QUESTION IMAGES
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can read question images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload question images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update question images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete question images" ON storage.objects;

CREATE POLICY IF NOT EXISTS "Public can read question images" ON storage.objects
  FOR SELECT USING (bucket_id = 'question-images');

CREATE POLICY IF NOT EXISTS "Admins can upload question images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'question-images'
    AND public.has_user_role(auth.uid(), ARRAY['admin','super_admin'])
  );

CREATE POLICY IF NOT EXISTS "Admins can update question images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'question-images'
    AND public.has_user_role(auth.uid(), ARRAY['admin','super_admin'])
  );

CREATE POLICY IF NOT EXISTS "Admins can delete question images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'question-images'
    AND public.has_user_role(auth.uid(), ARRAY['admin','super_admin'])
  );

-- ============================================================================
-- END OF CONSOLIDATED SCHEMA
-- ============================================================================
