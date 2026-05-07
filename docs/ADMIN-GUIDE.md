# Panduan Manajemen Admin — Agenda Prestasi

## Role yang tersedia

| Role          | Akses                               |
| ------------- | ----------------------------------- |
| `super_admin` | Kelola semua post + kelola role tim |
| `admin`       | Kelola post milik sendiri saja      |

## Cara menambah anggota tim baru (Google Auth)

1. Minta anggota login ke aplikasi menggunakan akun Google mereka (sekali saja)
2. Buka Supabase Cloud → Database → SQL Editor
3. Jalankan query INSERT di `docs/admin-management.sql`
4. Verifikasi dengan query SELECT

> **Catatan:** anggota HARUS login via Google terlebih dahulu sebelum
> bisa ditambahkan sebagai admin, karena user_id mereka harus
> terdaftar di auth.users dulu.

## Cara mencabut akses

Jalankan query DELETE di `docs/admin-management.sql`

## Cara upgrade admin biasa menjadi super_admin

Jalankan query UPDATE di `docs/admin-management.sql`

## Catatan keamanan

- Jangan pernah share akses Database ke admin biasa
- Hanya Super Admin yang boleh menjalankan query di SQL Editor
- Selalu verifikasi dengan SELECT setelah setiap perubahan role
- RLS (Row Level Security) di database adalah pertahanan utama — frontend hanya UI layer
- Semua logika izin melalui helper `can.*` di `src/lib/permissions.ts`
- `useUserRole()` adalah satu-satunya sumber kebenaran untuk role user
