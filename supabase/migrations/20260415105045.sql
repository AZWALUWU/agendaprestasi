
-- 1. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  role text CHECK (role IN ('super_admin', 'admin')) NOT NULL DEFAULT 'admin',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. Add author_id to posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users(id);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);

-- 4. Security definer function to check roles (avoids infinite recursion)
CREATE OR REPLACE FUNCTION public.has_user_role(_user_id uuid, _roles text[])
RETURNS boolean
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

-- 5. RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admin can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_user_role(auth.uid(), ARRAY['super_admin']));

CREATE POLICY "Super admin can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_user_role(auth.uid(), ARRAY['super_admin']));

CREATE POLICY "Super admin can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_user_role(auth.uid(), ARRAY['super_admin']));

-- 6. Drop old posts policies
DROP POLICY IF EXISTS "Admin can delete posts" ON public.posts;
DROP POLICY IF EXISTS "Admin can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Admin can update posts" ON public.posts;
DROP POLICY IF EXISTS "Public can read published posts" ON public.posts;

-- 7. New posts policies
CREATE POLICY "Public can read published posts"
  ON public.posts FOR SELECT
  USING (status = 'published' OR public.has_user_role(auth.uid(), ARRAY['admin', 'super_admin']));

CREATE POLICY "Admin can insert posts"
  ON public.posts FOR INSERT
  WITH CHECK (
    public.has_user_role(auth.uid(), ARRAY['admin', 'super_admin'])
    AND (author_id = auth.uid())
  );

CREATE POLICY "Admin can update own posts"
  ON public.posts FOR UPDATE
  USING (
    (author_id = auth.uid() AND public.has_user_role(auth.uid(), ARRAY['admin']))
    OR public.has_user_role(auth.uid(), ARRAY['super_admin'])
  );

CREATE POLICY "Admin can delete own posts"
  ON public.posts FOR DELETE
  USING (
    (author_id = auth.uid() AND public.has_user_role(auth.uid(), ARRAY['admin']))
    OR public.has_user_role(auth.uid(), ARRAY['super_admin'])
  );
