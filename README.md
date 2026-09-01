# Agenda Prestasi — Scholarships, Competitions & Events

**Platform for finding the latest scholarships, competitions, and events for Indonesian students.**  
Built with [TanStack Start](https://tanstack.com/start/latest) (React SSR) on [Cloudflare Workers](https://workers.cloudflare.com/) with [Supabase](https://supabase.com/) backend.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Database](#database)
- [Role & Permission System](#role--permission-system)
- [Caching](#caching)
- [Development](#development)
- [Deployment](#deployment)
- [Admin Guide](#admin-guide)
- [Monitoring & Analytics](#monitoring--analytics)

---

## Features

### Public Frontend

| Feature | Description |
|---------|-------------|
| **Home** | Main page with published post listings (scholarships/competitions/events). Supports category filtering, tag filtering, text search, and pagination. |
| **Post Detail** | Post detail page with sanitized HTML content, deadline status (green/yellow/red), status badge (upcoming/active/closed), bookmark button, and external links. |
| **Calendar** | Interactive monthly calendar displaying open dates, deadlines, and announcements. Supports category and date type filtering. Includes a monthly list per category. |
| **Profile** | User profile page with account info tab and bookmarks tab (saved posts). |
| **Login** | Google OAuth login via Supabase. |

### Admin Dashboard

| Feature | Description |
|---------|-------------|
| **Post CRUD** | Create, edit, delete posts. Supports draft/published status. |
| **Status Management** | Publish/unpublish posts directly from the table. |
| **Role-based Access** | Super admin manages all posts; regular admin manages only their own. |

### Other Functionalities

| Feature | Description |
|---------|-------------|
| **Bookmark** | Save favorite posts. Optimistic update with rollback on error. |
| **Deadline Tracking** | Visual badges: green (>30 days), yellow (7-30 days), red (≤7 days). |
| **Caching** | Cloudflare KV cache for public post listings, 5-minute TTL. |
| **Rate Limiting** | 60 requests/minute per IP on the Worker side. |
| **Search & Filter** | Case-insensitive search + category filter + multi-tag filter. |
| **Pagination** | Client-side navigation with page buttons. |
| **PWA Ready** | Manifest, icon, and apple-touch-icon are available. |
| **404 Page** | Custom 404 with a link back to the homepage. |
| **Error Boundary** | Sentry error boundary + custom error page. |

---

## Tech Stack

### Framework & Runtime

| Technology | Purpose |
|------------|---------|
| **[TanStack Start](https://tanstack.com/start/latest)** | React SSR framework + file-based routing via TanStack Router |
| **[Cloudflare Workers](https://workers.cloudflare.com/)** | Edge runtime, rate limiting, KV cache |
| **[Supabase](https://supabase.com/)** | PostgreSQL database, Auth (Google OAuth), RLS, Storage |
| **[Vite](https://vitejs.dev/)** | Build tool with TanStack, React, Tailwind, Sentry plugins |

### Frontend

| Technology | Purpose |
|------------|---------|
| **[React 19](https://react.dev/)** | UI library |
| **[TanStack Router](https://tanstack.com/router/latest)** | File-based routing with type safety |
| **[TanStack Query](https://tanstack.com/query/latest)** | Server state management, caching, mutations |
| **[Tailwind CSS v4](https://tailwindcss.com/)** | Utility-first CSS |
| **[shadcn/ui](https://ui.shadcn.com/)** | UI components (Radix UI primitives + Tailwind) |
| **[Lucide React](https://lucide.dev/)** | Icon library |
| **[Recharts](https://recharts.org/)** | Chart library |
| **[date-fns](https://date-fns.org/)** | Date utilities |
| **[DOMPurify](https://github.com/cure53/DOMPurify)** | HTML sanitization (post content) |
| **[React Hook Form](https://react-hook-form.com/)** + **[Zod](https://zod.dev/)** | Form handling & validation |
| **[KaTeX](https://katex.org/)** | LaTeX rendering (LatexPreview component) |

### Monitoring & Analytics

| Technology | Purpose |
|------------|---------|
| **[Sentry](https://sentry.io/)** | Error tracking (Cloudflare + React), source maps |
| **[PostHog](https://posthog.com/)** | Product analytics, session recording, autocapture |

---

## Architecture

The application runs as a **Cloudflare Worker** with SSR (Server-Side Rendering) via TanStack Start. The Worker acts as a proxy that adds rate limiting and KV caching before forwarding requests to the TanStack Start server.

```
Request → Cloudflare Worker → Rate Limit Check → KV Cache Check → SSR (TanStack Start) → Supabase
                              ↑                                                       ↓
                              └──── Cache Miss → Populate KV ──────────────────────────┘
```

### Data Flow

1. **Public browsing**: Worker checks KV cache → on miss, SSR fetches from Supabase → Worker stores in KV (5 minutes)
2. **Search/Filter**: Worker skips cache → SSR queries Supabase directly
3. **Admin CRUD**: SSR goes directly to Supabase → Worker invalidates KV cache
4. **Auth**: Supabase Auth (Google OAuth) → session via Supabase client → role check via RLS + app-level permissions

---

## Project Structure

```
src/
├── backend/
│   ├── auth/
│   │   ├── auth.ts              # Auth functions (signOut, getUserRole, checkIsAdmin)
│   │   ├── admin-middleware.ts   # requireAdmin() — throws if not admin
│   │   └── permissions.ts       # can.* helpers (can.accessAdmin, editPost, deletePost, etc.)
│   ├── queries/
│   │   └── posts.ts             # All Supabase queries: fetchPublishedPosts, fetchPostBySlug, CRUD admin
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
│   │   │   ├── MonthlyListItem.tsx   # Monthly list item (calendar)
│   │   │   └── MonthlyListSection.tsx # Category section (calendar)
│   │   ├── ui/                  # ~40 shadcn/ui components (button, card, dialog, etc.)
│   │   ├── BookmarkButton.tsx   # Bookmark toggle with optimistic update
│   │   ├── Navbar.tsx           # Navigation bar with role-aware menu
│   │   ├── PostCard.tsx         # Post card for the main page
│   │   ├── PostCardSkeleton.tsx # Loading skeleton for PostCard
│   │   ├── PostForm.tsx         # Post create/edit form (admin)
│   │   └── StatusBadge.tsx      # Status badge: Upcoming / Active / Closed
│   ├── hooks/
│   │   ├── use-auth.tsx         # Auth context provider + useAuth hook
│   │   ├── useBookmarks.ts      # Bookmark queries & mutations (useBookmarkedIds, useToggleBookmark)
│   │   ├── useCalendarPosts.ts  # Calendar post queries
│   │   ├── useLogout.ts         # Logout handler
│   │   ├── useUserRole.ts       # User role query (super_admin / admin / public)
│   │   └── use-mobile.tsx       # Mobile detection hook
│   └── lib/
│       ├── formatDate.ts        # Date formatting helpers (Indonesia locale)
│       ├── getAvatarColor.ts    # Avatar color based on email
│       ├── getCategoryConfig.ts # Single source of truth: categories & tags (colors, labels, classes)
│       ├── getInitials.ts       # Extract initials from email
│       ├── getPostStatus.ts     # Determine post status: upcoming / active / closed
│       ├── helpers.ts           # Utilities: slugify, getDeadlineStatus, formatDeadline
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
│   ├── index.tsx                # Home — post listings + search + filter + pagination
│   ├── login.tsx                # Login page (Google OAuth)
│   ├── auth.callback.tsx        # OAuth callback handler
│   ├── calendar.tsx             # Interactive monthly calendar
│   ├── posts.$slug.tsx          # Post detail
│   ├── profile.tsx              # User profile & bookmarks
│   ├── admin.tsx                # Admin layout (guard: role check)
│   ├── admin.index.tsx          # Admin dashboard — post table
│   ├── admin.posts.new.tsx      # Admin — create new post
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

### Tables

| Table | Description |
|-------|-------------|
| `posts` | Main content: scholarships, competitions, events. Status: `draft` / `published`. |
| `user_roles` | User roles: `admin` / `super_admin`. 1:1 relation to `auth.users`. |
| `bookmarks` | Bookmarks per user. Unique constraint `(user_id, post_id)`. |
| `app_settings` | Public key-value settings. |

### Schema Highlights (`supabase/migrations/20260523_final.sql`)

- **Posts**: `id (UUID)`, `title`, `slug (unique)`, `description`, `content`, `category (scholarship|competition|event)`, `tags (TEXT[])`, `deadline`, `open_date`, `announcement_date`, `link`, `image_url`, `author_id`, `status (draft|published)`, `created_at`, `updated_at`
- **Indexes**: Composite indexes for feed queries `(status, category, created_at DESC)`, GIN index for `tags` and `to_tsvector` search, + indexes for `author_id`, `created_at`
- **RLS**: Strict policies — public can only read published posts, admin/super_admin have access according to role
- **Bookmarks**: Row Level Security — users can only manage their own bookmarks
- **Storage**: `post-images` bucket with public read, authenticated write

---

## Role & Permission System

### Roles

| Role | Database Access (RLS) | Application Access |
|------|----------------------|-------------------|
| `super_admin` | Read/Write all posts + manage `user_roles` | Full admin access, can manage any post, can manage roles |
| `admin` | Insert posts + update/delete own posts | Can only edit/delete/publish own posts |
| `public` | Read published posts | Public browsing, bookmarks |

### Permission Helpers (`src/backend/auth/permissions.ts`)

```ts
can.accessAdmin(role)        // admin or super_admin
can.editPost(role, authorId, currentUserId)
can.deletePost(role, authorId, currentUserId)
can.publishPost(role, authorId, currentUserId)
can.manageRoles(role)        // super_admin only
```

### Admin Middleware (`src/backend/auth/admin-middleware.ts`)

`requireAdmin(userId)` — throws if user is not admin/super_admin. Used in all server-side admin queries as a second security layer on top of RLS.

---

## Caching

The caching system uses **Cloudflare KV** with the following strategy:

### Strategy

1. **Read**: Worker intercepts GET `/api/posts` → checks KV → hit returns cached, miss proceeds to SSR then populates KV
2. **Skip cache**: Requests with `search` or `tags` parameters go directly to SSR
3. **Expiry**: Cache valid for 5 minutes, auto-expires — no manual invalidation from the client

### Technical Details

- **TTL**: 300 seconds (5 minutes)
- **Cache key**: `posts:{category}:page:{page}:limit:{limit}`
- **Invalidation**: Deletes 20 common keys (category: all, scholarship, competition, event × page: 1-5)
- **Auth**: Invalidation endpoint protected by `x-cache-secret` header

---

## Development

### Prerequisites

- [Bun](https://bun.sh/) (runtime & package manager)
- [Supabase](https://supabase.com/) account (project + Google OAuth)
- [Cloudflare](https://cloudflare.com/) account (Worker + KV namespace)
- [Sentry](https://sentry.io/) account (optional, for error tracking)
- [PostHog](https://posthog.com/) account (optional, for analytics)

### Setup

```bash
# Clone
git clone <repo-url>
cd agendaprestasi

# Install dependencies
bun install

# Environment variables
cp .env.example .env
# Fill in .env with Supabase, Sentry, PostHog credentials, etc.
```

### Environment Variables (`.env`)

```env
VITE_SUPABASE_URL=           # Supabase project URL
VITE_SUPABASE_ANON_KEY=      # Supabase anon key
VITE_SENTRY_DSN=             # Sentry DSN (optional)
VITE_SENTRY_ORG=             # Sentry org slug
VITE_SENTRY_PROJECT=         # Sentry project name
VITE_SENTRY_AUTH_TOKEN=      # Sentry auth token (build only)
VITE_PUBLIC_POSTHOG_KEY=     # PostHog API key (optional)
VITE_PUBLIC_POSTHOG_HOST=    # PostHog host (optional)
```

### Development

```bash
# Development server (Vite + Cloudflare)
bun run dev
```

Access at `http://localhost:5173` (or the port specified by Vite).

### Build

```bash
# Production build
bun run build

# Development build (source maps, etc.)
bun run build:dev
```

---

## Deployment

### Cloudflare Workers

This project is configured for deployment to Cloudflare Workers via Wrangler.

```bash
# Build + Deploy
./deploy.sh

# Or manually
bun run build
npx wrangler deploy
```

### Supabase Migration

Run the migration file in the Supabase SQL Editor:

```sql
-- Open supabase/migrations/20260523_final.sql
-- Copy entire content → paste in Supabase SQL Editor → Run
```

### Auth Setup (Supabase)

1. Open Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Enter Google Client ID & Client Secret
4. Set redirect URL: `https://{domain}/auth/callback`

### KV Namespace Setup

```bash
npx wrangler kv:namespace create POSTS_CACHE
# Update the id in wrangler.jsonc with the created result
```

---

## Admin Guide

Full documentation for admins: [docs/ADMIN-GUIDE.md](docs/ADMIN-GUIDE.md)

### Quick Reference

1. **Add new admin**: User must log in once via Google → INSERT into `user_roles`
2. **Revoke access**: DELETE from `user_roles`
3. **Upgrade to super_admin**: UPDATE role in `user_roles`
4. **SQL management**: See [docs/admin-management.sql](docs/admin-management.sql)

---

## Monitoring & Analytics

### Sentry (Error Tracking)

- **Cloudflare**: Error tracking in Worker via `@sentry/cloudflare`
- **React**: Error boundary, browser tracing, session replays (on error: 100%, sample: 5%)
- **Filtered**: `ResizeObserver loop limit exceeded` is not sent
- **Context**: PostHog session ID and distinct ID are attached to Sentry events
- **Source maps**: Auto-upload via Sentry Vite Plugin during build

### PostHog (Analytics)

- **Page views**: Custom `$pageview` capture via router
- **Events tracked**: `search_performed`, `post_viewed`, `bookmark_added/removed`, `post_external_click`, `calendar_locked_clicked`, `tag_filter_used`, etc.
- **Session recording**: Enabled with password input masking
- **Person profiles**: Only for identified users (after login)
- **Autocapture**: Enabled
- **Debug mode**: Automatically active in development

---

## Security

- **RLS (Row Level Security)**: All database tables have strict policies
- **Dual auth**: Server-side `requireAdmin()` + client-side `can.*` helpers
- **Rate limiting**: 60 req/min per IP on the Worker
- **HTML sanitization**: All post content is sanitized with DOMPurify before rendering
- **Environment variables**: No secrets on the frontend (only anon key)
- **CORS**: No CORS issues since SSR + Worker are on the same domain
- **Cache invalidation**: Endpoint protected by secret header

---

## Contributing

1. Branch from `main`: `git checkout -b feat/feature-name`
2. Commit with descriptive messages
3. Create a PR to `main`

### Code Conventions

- **Components**: Functional Components + TypeScript
- **Imports**: Use path aliases `@/`, `@backend/`, `@frontend/`
- **Query naming**: `fetch*` for public queries, `use*` for hooks, `handle*` for handlers
- **State**: TanStack Query for server state, React state for UI state
- **CSS**: Tailwind utility classes, avoid custom CSS except for animations/theme
- **Categories/Tags**: Do not hardcode colors/labels — always read from `getCategoryConfig`
