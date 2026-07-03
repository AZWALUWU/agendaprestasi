# Agenda Prestasi — Beasiswa, Lomba & Event

**Platform pencarian beasiswa, kompetisi, dan event terbaru untuk pelajar dan mahasiswa Indonesia.**  
Dibangun dengan [TanStack Start](https://tanstack.com/start/latest) (React SSR) di atas [Cloudflare Workers](https://workers.cloudflare.com/) dengan backend [Supabase](https://supabase.com/).

![OG Image](/agendaprestasi.png)

---

## Daftar Isi

- [Fitur](#fitur)
- [Tech Stack](#tech-stack)
- [Arsitektur](#arsitektur)
- [Struktur Proyek](#struktur-proyek)
- [Database](#database)
- [Sistem Role & Permission](#sistem-role--permission)
- [Caching](#caching)
- [Development](#development)
- [Deployment](#deployment)
- [Admin Guide](#admin-guide)
- [Monitoring & Analytics](#monitoring--analytics)

---

## Fitur

### Frontend Public

| Fitur | Deskripsi |
|-------|-----------|
| **Beranda** | Halaman utama dengan daftar post (beasiswa/lomba/event) yang sudah dipublikasikan. Mendukung filter kategori, filter tag, pencarian teks, dan pagination. |
| **Detail Post** | Halaman detail post dengan konten HTML yang sudah di-sanitize, status deadline (hijau/kuning/merah), badge status (akan datang/berlangsung/berakhir), tombol bookmark, dan link eksternal. |
| **Kalender** | Kalender bulanan interaktif yang menampilkan tanggal buka, deadline, dan pengumuman. Mendukung filter kategori dan tipe tanggal. Dilengkapi daftar bulanan per kategori. |
| **Profil** | Halaman profil pengguna dengan tab informasi akun dan tab bookmark (post yang disimpan). |
| **Login** | Login via Google OAuth melalui Supabase. |

### Admin Dashboard

| Fitur | Deskripsi |
|-------|-----------|
| **CRUD Post** | Buat, edit, hapus post. Mendukung status draft/published. |
| **Manajemen Status** | Publish/unpublish post langsung dari tabel. |
| **Role-based Access** | Super admin kelola semua post; admin biasa hanya post milik sendiri. |

### Fungsionalitas Lain

| Fitur | Deskripsi |
|-------|-----------|
| **Bookmark** | Simpan post favorit. Optimistic update dengan rollback on error. |
| **Deadline Tracking** | Visual badge: hijau (>30 hari), kuning (7-30 hari), merah (≤7 hari). |
| **Caching** | Cloudflare KV cache untuk daftar post publik, TTL 5 menit. |
| **Rate Limiting** | 60 request/menit per IP di sisi Worker. |
| **Search & Filter** | Pencarian case-insensitive + filter kategori + filter multi-tag. |
| **Pagination** | Client-side navigasi dengan page buttons. |
| **PWA Ready** | Manifest, icon, dan apple-touch-icon sudah tersedia. |
| **404 Page** | Custom 404 dengan link kembali ke beranda. |
| **Error Boundary** | Sentry error boundary + custom error page. |

---

## Tech Stack

### Framework & Runtime

| Teknologi | Kegunaan |
|-----------|----------|
| **[TanStack Start](https://tanstack.com/start/latest)** | React SSR framework + file-based routing via TanStack Router |
| **[Cloudflare Workers](https://workers.cloudflare.com/)** | Edge runtime, rate limiting, KV cache |
| **[Supabase](https://supabase.com/)** | Database PostgreSQL, Auth (Google OAuth), RLS, Storage |
| **[Vite](https://vitejs.dev/)** | Build tool dengan plugin TanStack, React, Tailwind, Sentry |

### Frontend

| Teknologi | Kegunaan |
|-----------|----------|
| **[React 19](https://react.dev/)** | UI library |
| **[TanStack Router](https://tanstack.com/router/latest)** | File-based routing dengan type safety |
| **[TanStack Query](https://tanstack.com/query/latest)** | Server state management, caching, mutations |
| **[Tailwind CSS v4](https://tailwindcss.com/)** | Utility-first CSS |
| **[shadcn/ui](https://ui.shadcn.com/)** | UI components (Radix UI primitives + Tailwind) |
| **[Lucide React](https://lucide.dev/)** | Icon library |
| **[Recharts](https://recharts.org/)** | Chart library |
| **[date-fns](https://date-fns.org/)** | Date utilities |
| **[DOMPurify](https://github.com/cure53/DOMPurify)** | HTML sanitization (konten post) |
| **[React Hook Form](https://react-hook-form.com/)** + **[Zod](https://zod.dev/)** | Form handling & validation |
| **[KaTeX](https://katex.org/)** | LaTeX rendering (LatexPreview component) |

### Monitoring & Analytics

| Teknologi | Kegunaan |
|-----------|----------|
| **[Sentry](https://sentry.io/)** | Error tracking (Cloudflare + React), source maps |
| **[PostHog](https://posthog.com/)** | Product analytics, session recording, autocapture |

---

## Arsitektur

Aplikasi berjalan sebagai **Cloudflare Worker** dengan SSR (Server-Side Rendering) via TanStack Start. Worker bertindak sebagai proxy yang menambahkan rate limiting dan KV caching sebelum meneruskan request ke server TanStack Start.

```
Request → Cloudflare Worker → Rate Limit Check → KV Cache Check → SSR (TanStack Start) → Supabase
                              ↑                                                       ↓
                              └──── Cache Miss → Populate KV ──────────────────────────┘
```

### Alur Data

1. **Public browsing**: Worker cek KV cache → jika miss, SSR fetch dari Supabase → Worker simpan ke KV (5 menit)
2. **Search/Filter**: Worker skip cache → SSR langsung query ke Supabase
3. **Admin CRUD**: SSR langsung ke Supabase → Worker invalidate KV cache
4. **Auth**: Supabase Auth (Google OAuth) → session via Supabase client → role check via RLS + app-level permissions

---

## Struktur Proyek

```
src/
├── backend/
│   ├── auth/
│   │   ├── auth.ts              # Auth functions (signOut, getUserRole, checkIsAdmin)
│   │   ├── admin-middleware.ts   # requireAdmin() — throws jika bukan admin
│   │   └── permissions.ts       # can.* helpers (can.accessAdmin, editPost, deletePost, dll.)
│   ├── queries/
│   │   └── posts.ts             # Semua query Supabase: fetchPublishedPosts, fetchPostBySlug, CRUD admin
│   └── supabase/
│       ├── client.ts            # Supabase browser client
│       ├── client.server.ts     # Supabase server client
│       └── types.ts             # Database type definitions (generated)
│
├── frontend/
│   ├── components/
│   │   ├── admin/
│   │   │   └── LatexPreview.tsx # LaTeX preview component
│   │   ├── calendar/
│   │   │   ├── MonthlyListItem.tsx   # Item daftar bulanan (kalender)
│   │   │   └── MonthlyListSection.tsx # Section per kategori (kalender)
│   │   ├── ui/                  # ~40 shadcn/ui components (button, card, dialog, dll.)
│   │   ├── BookmarkButton.tsx   # Bookmark toggle dengan optimistic update
│   │   ├── Navbar.tsx           # Navigation bar dengan role-aware menu
│   │   ├── PostCard.tsx         # Card post untuk halaman utama
│   │   ├── PostCardSkeleton.tsx # Loading skeleton untuk PostCard
│   │   ├── PostForm.tsx         # Form create/edit post (admin)
│   │   └── StatusBadge.tsx      # Badge status: Akan Datang / Berlangsung / Telah Berakhir
│   ├── hooks/
│   │   ├── use-auth.tsx         # Auth context provider + useAuth hook
│   │   ├── useBookmarks.ts      # Bookmark queries & mutations (useBookmarkedIds, useToggleBookmark)
│   │   ├── useCalendarPosts.ts  # Query post untuk kalender
│   │   ├── useLogout.ts         # Logout handler
│   │   ├── useUserRole.ts       # Query role user (super_admin / admin / public)
│   │   └── use-mobile.tsx       # Mobile detection hook
│   └── lib/
│       ├── formatDate.ts        # Date formatting helpers (Indonesia locale)
│       ├── getAvatarColor.ts    # Warna avatar berdasarkan email
│       ├── getCategoryConfig.ts # Single source of truth: kategori & tags (warna, label, class)
│       ├── getInitials.ts       # Ambil inisial dari email
│       ├── getPostStatus.ts     # Tentukan status post: upcoming / active / closed
│       ├── helpers.ts           # Utility: slugify, getDeadlineStatus, formatDeadline
│       ├── latex.tsx            # LaTeX rendering component
│       └── utils.ts             # shadcn/ui utility (cn)
│
├── lib/
│   ├── analytics/
│   │   ├── event-names.ts       # Event name constants
│   │   └── events.ts            # track() wrapper
│   ├── posthog/
│   │   └── client.ts            # PostHog init & client
│   └── sentry/
│       ├── capture.ts           # Sentry error capture helper
│       ├── client.ts            # Sentry init (browser)
│       └── react-query.ts       # Sentry + React Query integration
│
├── routes/
│   ├── __root.tsx               # Root layout: QueryClient, AuthProvider, Sentry, SEO head
│   ├── index.tsx                # Beranda — daftar post + search + filter + pagination
│   ├── login.tsx                # Halaman login (Google OAuth)
│   ├── auth.callback.tsx        # OAuth callback handler
│   ├── calendar.tsx             # Kalender bulanan interaktif
│   ├── posts.$slug.tsx          # Detail post
│   ├── profile.tsx              # Profil & bookmark pengguna
│   ├── admin.tsx                # Admin layout (guard: cek role)
│   ├── admin.index.tsx          # Admin dashboard — tabel post
│   ├── admin.posts.new.tsx      # Admin — buat post baru
│   └── admin.posts.$id.edit.tsx # Admin — edit post
│
├── routeTree.gen.ts             # Auto-generated route tree (TanStack Router)
├── router.tsx                   # Router setup: QueryClient, error handling
├── styles.css                   # Tailwind CSS v4 + CSS variables (oklch theme) + animation
└── types/
    └── global.d.ts              # Global type declarations

worker.ts                        # Cloudflare Worker: entry point, rate limit, KV cache
vite.config.ts                   # Vite build config
wrangler.jsonc                   # Wrangler config (KV binding, assets, compatibility)
```

---

## Database

### Tabel

| Tabel | Deskripsi |
|-------|-----------|
| `posts` | Konten utama: beasiswa, lomba, event. Status: `draft` / `published`. |
| `user_roles` | Role user: `admin` / `super_admin`. Relasi 1:1 ke `auth.users`. |
| `bookmarks` | Bookmark per user. Unique constraint `(user_id, post_id)`. |
| `app_settings` | Key-value settings publik. |

### Schema Highlight (`supabase/migrations/20260523_final.sql`)

- **Posts**: `id (UUID)`, `title`, `slug (unique)`, `description`, `content`, `category (scholarship|competition|event)`, `tags (TEXT[])`, `deadline`, `open_date`, `announcement_date`, `link`, `image_url`, `author_id`, `status (draft|published)`, `created_at`, `updated_at`
- **Indexes**: Composite indexes untuk feed query `(status, category, created_at DESC)`, GIN index untuk `tags` dan `to_tsvector` search, + indexes untuk `author_id`, `created_at`
- **RLS**: Policies ketat — public hanya baca post published, admin/super_admin punya akses sesuai role
- **Bookmarks**: Row Level Security — user hanya bisa manage bookmark milik sendiri
- **Storage**: Bucket `post-images` public read, authenticated write

---

## Sistem Role & Permission

### Role

| Role | Akses Database (RLS) | Akses Aplikasi |
|------|---------------------|----------------|
| `super_admin` | Read/Write semua post + kelola `user_roles` | Akses penuh admin, bisa kelola post siapa pun, bisa kelola role |
| `admin` | Insert post + update/delete post milik sendiri | Hanya bisa edit/hapus/publish post milik sendiri |
| `public` | Read post published | Baca publik, bookmark |

### Permission Helpers (`src/backend/auth/permissions.ts`)

```ts
can.accessAdmin(role)        // admin atau super_admin
can.editPost(role, authorId, currentUserId)
can.deletePost(role, authorId, currentUserId)
can.publishPost(role, authorId, currentUserId)
can.manageRoles(role)        // hanya super_admin
```

### Admin Middleware (`src/backend/auth/admin-middleware.ts`)

`requireAdmin(userId)` — throw jika user bukan admin/super_admin. Digunakan di semua query admin sisi server sebagai lapisan keamanan kedua di atas RLS.

---

## Caching

Sistem caching menggunakan **Cloudflare KV** dengan strategi:

### Write-through Cache

1. **Read**: Worker intercept GET `/api/posts` → cek KV → hit return cached, miss lanjut ke SSR
2. **Write**: Setelah admin create/update/delete post → Worker panggil `/api/cache/invalidate` → hapus 20 key cache (5 kategori × 4 halaman)
3. **Skip cache**: Request dengan parameter `search` atau `tags` langsung ke SSR

### Detail Teknis

- **TTL**: 300 detik (5 menit)
- **Cache key**: `posts:{category}:page:{page}:limit:{limit}`
- **Invalidasi**: Hapus 20 key umum (category: all, scholarship, competition, event × page: 1-5)
- **Auth**: Endpoint invalidasi dilindungi `x-cache-secret` header

---

## Development

### Prerequisites

- [Bun](https://bun.sh/) (runtime & package manager)
- Akun [Supabase](https://supabase.com/) (proyek + Google OAuth)
- Akun [Cloudflare](https://cloudflare.com/) (Worker + KV namespace)
- Akun [Sentry](https://sentry.io/) (opsional, untuk error tracking)
- Akun [PostHog](https://posthog.com/) (opsional, untuk analytics)

### Setup

```bash
# Clone
git clone <repo-url>
cd agendaprestasi

# Install dependencies
bun install

# Environment variables
cp .env.example .env
# Isi .env dengan kredensial Supabase, Sentry, PostHog, dll.
```

### Environment Variables (`.env`)

```env
VITE_SUPABASE_URL=           # Supabase project URL
VITE_SUPABASE_ANON_KEY=      # Supabase anon key
VITE_SENTRY_DSN=             # Sentry DSN (opsional)
VITE_SENTRY_ORG=             # Sentry org slug
VITE_SENTRY_PROJECT=         # Sentry project name
VITE_SENTRY_AUTH_TOKEN=      # Sentry auth token (build only)
VITE_PUBLIC_POSTHOG_KEY=     # PostHog API key (opsional)
VITE_PUBLIC_POSTHOG_HOST=    # PostHog host (opsional)
VITE_CACHE_INVALIDATE_SECRET= # Secret untuk invalidate KV cache
```

### Development

```bash
# Development server (Vite + Cloudflare)
bun run dev
```

Akses di `http://localhost:5173` (atau port yang ditentukan Vite).

### Build

```bash
# Production build
bun run build

# Development build (source maps, dll.)
bun run build:dev
```

---

## Deployment

### Cloudflare Workers

Proyek ini sudah dikonfigurasi untuk deploy ke Cloudflare Workers via Wrangler.

```bash
# Build + Deploy
./deploy.sh

# Atau manual
bun run build
npx wrangler deploy
```

### Supabase Migration

Jalankan file migrasi di Supabase SQL Editor:

```sql
-- Buka supabase/migrations/20260523_final.sql
-- Copy seluruh isi → paste di Supabase SQL Editor → Run
```

### Setup Auth (Supabase)

1. Buka Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Masukkan Google Client ID & Client Secret
4. Set redirect URL: `https://{domain}/auth/callback`

### Setup KV Namespace

```bash
npx wrangler kv:namespace create POSTS_CACHE
# Update id di wrangler.jsonc dengan hasil create
```

---

## Admin Guide

Dokumentasi lengkap untuk admin: [docs/ADMIN-GUIDE.md](docs/ADMIN-GUIDE.md)

### Quick Reference

1. **Tambah admin baru**: User harus login sekali via Google → INSERT di `user_roles`
2. **Cabut akses**: DELETE dari `user_roles`
3. **Upgrade ke super_admin**: UPDATE role di `user_roles`
4. **SQL management**: Lihat [docs/admin-management.sql](docs/admin-management.sql)

---

## Monitoring & Analytics

### Sentry (Error Tracking)

- **Cloudflare**: Error tracking di Worker via `@sentry/cloudflare`
- **React**: Error boundary, browser tracing, session replays (on error: 100%, sample: 5%)
- **Filtered**: `ResizeObserver loop limit exceeded` tidak dikirim
- **Context**: PostHog session ID dan distinct ID dilampirkan ke event Sentry
- **Source maps**: Auto-upload via Sentry Vite Plugin saat build

### PostHog (Analytics)

- **Page views**: Custom `$pageview` capture via router
- **Events tracked**: `search_performed`, `post_viewed`, `bookmark_added/removed`, `post_external_click`, `calendar_locked_clicked`, `tag_filter_used`, dll.
- **Session recording**: Aktif dengan masking input password
- **Person profiles**: Hanya untuk identified users (setelah login)
- **Autocapture**: Enabled
- **Debug mode**: Aktif otomatis di development

---

## Keamanan

- **RLS (Row Level Security)**: Semua tabel di database punya policies ketat
- **Dual auth**: Server-side `requireAdmin()` + client-side `can.*` helpers
- **Rate limiting**: 60 req/min per IP di Worker
- **HTML sanitization**: Semua konten post di-sanitize dengan DOMPurify sebelum di-render
- **Environment variables**: Tidak ada secret di frontend (hanya anon key)
- **CORS**: Tidak ada CORS issues karena SSR + Worker di domain yang sama
- **Cache invalidation**: Endpoint dilindungi secret header

---

## Contributing

1. Branch dari `main`: `git checkout -b feat/nama-fitur`
2. Commit dengan pesan deskriptif
3. Buat PR ke `main`

### Code Conventions

- **Component**: Functional Component + TypeScript
- **Imports**: Gunakan path alias `@/`, `@backend/`, `@frontend/`
- **Query naming**: `fetch*` untuk query publik, `use*` untuk hook, `handle*` untuk handler
- **State**: TanStack Query untuk server state, React state untuk UI state
- **CSS**: Tailwind utility classes, hindari CSS custom kecuali untuk animation/theme
- **Kategori/Tag**: Jangan hardcode warna/label — selalu baca dari `getCategoryConfig`
