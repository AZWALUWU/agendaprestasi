-- 1. Tambah Super Admin pertama (setelah login via Google)
INSERT INTO user_roles (user_id, email, role)
SELECT id, email, 'super_admin'
FROM auth.users
WHERE email = 'email@kamu.com';

-- 2. Tambah Admin biasa (setelah login via Google)
INSERT INTO user_roles (user_id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'email-anggota@gmail.com';

-- 3. Verifikasi daftar admin
SELECT ur.email, ur.role, u.created_at AS first_login
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
ORDER BY u.created_at DESC;

-- 4. Cabut akses admin
DELETE FROM user_roles
WHERE email = 'email-anggota@gmail.com';

-- 5. Upgrade admin biasa menjadi super_admin
UPDATE user_roles
SET role = 'super_admin'
WHERE email = 'email-anggota@gmail.com';
