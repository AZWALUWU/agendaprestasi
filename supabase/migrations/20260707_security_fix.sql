-- ============================================================================
-- Security Fix: Move has_user_role to internal schema
-- ============================================================================
--
-- Masalah:
--   has_user_role() adalah SECURITY DEFINER yang tinggal di schema public.
--   Supabase REST API secara otomatis mengekspos fungsi di schema public
--   via /rest/v1/rpc/has_user_role — artinya siapapun bisa ngecek
--   role user lain tanpa otorisasi.
--
-- Solusi:
--   Pindahkan fungsi ke schema internal yang tidak diekspos REST API.
--   RLS policies tetap bisa manggil internal.has_user_role() tanpa masalah
--   karena PostgreSQL tidak membatasi schema mana yang bisa dipanggil policy.
--
-- Keuntungan:
--   ✅ Fungsi otomatis tidak kelihatan REST API — tanpa REVOKE/GRACE
--   ✅ SECURITY DEFINER tetap aman (dibutuhkan RLS policies)
--   ✅ Schema internal jadi tempat fungsi internal ke depannya
--   ✅ Lebih bersih daripada revoke — fungsi memang bukan publik API
-- ============================================================================

-- ============================================================================
-- 1. Buat schema internal
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS internal;

-- ============================================================================
-- 2. Pindahkan fungsi has_user_role dari public ke internal
-- ============================================================================

ALTER FUNCTION public.has_user_role(_user_id uuid, _roles text[])
SET SCHEMA internal;

-- ============================================================================
-- 3. Update RLS policies — ganti public.has_user_role → internal.has_user_role
-- ============================================================================

-- 3a. user_roles policies
DROP POLICY IF EXISTS "Super admin can insert roles" ON public.user_roles;
CREATE POLICY "Super admin can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  internal.has_user_role(
    auth.uid(),
    ARRAY['super_admin']
  )
);

DROP POLICY IF EXISTS "Super admin can update roles" ON public.user_roles;
CREATE POLICY "Super admin can update roles"
ON public.user_roles
FOR UPDATE
USING (
  internal.has_user_role(
    auth.uid(),
    ARRAY['super_admin']
  )
);

DROP POLICY IF EXISTS "Super admin can delete roles" ON public.user_roles;
CREATE POLICY "Super admin can delete roles"
ON public.user_roles
FOR DELETE
USING (
  internal.has_user_role(
    auth.uid(),
    ARRAY['super_admin']
  )
);

-- 3b. posts policies
DROP POLICY IF EXISTS "Public can read published posts" ON public.posts;
CREATE POLICY "Public can read published posts"
ON public.posts
FOR SELECT
USING (
  status = 'published'
  OR internal.has_user_role(
    auth.uid(),
    ARRAY['admin', 'super_admin']
  )
);

DROP POLICY IF EXISTS "Admin can insert posts" ON public.posts;
CREATE POLICY "Admin can insert posts"
ON public.posts
FOR INSERT
WITH CHECK (
  internal.has_user_role(
    auth.uid(),
    ARRAY['admin', 'super_admin']
  )
);

DROP POLICY IF EXISTS "Admin can update own posts" ON public.posts;
CREATE POLICY "Admin can update own posts"
ON public.posts
FOR UPDATE
USING (
  (
    author_id = auth.uid()
    AND internal.has_user_role(
      auth.uid(),
      ARRAY['admin']
    )
  )
  OR internal.has_user_role(
    auth.uid(),
    ARRAY['super_admin']
  )
);

DROP POLICY IF EXISTS "Admin can delete own posts" ON public.posts;
CREATE POLICY "Admin can delete own posts"
ON public.posts
FOR DELETE
USING (
  (
    author_id = auth.uid()
    AND internal.has_user_role(
      auth.uid(),
      ARRAY['admin']
    )
  )
  OR internal.has_user_role(
    auth.uid(),
    ARRAY['super_admin']
  )
);

-- ============================================================================
-- 4. Verifikasi
-- ============================================================================

-- Cek fungsi sudah pindah:
-- SELECT p.proname, n.nspname
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE p.proname = 'has_user_role';

-- Cek fungsi tidak muncul di REST API:
-- SELECT * FROM information_schema.routines
-- WHERE specific_schema = 'public'
--   AND routine_name = 'has_user_role';

-- ============================================================================
-- Leaked Password Protection (catatan)
-- ============================================================================
--
-- Untuk mengaktifkan: Supabase Dashboard → Authentication → Settings
-- → Leaked Password Protection → Enable
--
-- Tidak relevan saat ini karena hanya pakai Google OAuth.
-- ============================================================================
