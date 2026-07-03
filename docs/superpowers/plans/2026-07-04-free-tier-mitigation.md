# Free Tier Cost Mitigation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep all operational costs at $0 until MRR stabilizes, by making Sentry sampling configurable, reducing KV writes, and providing monitoring guidance.

**Architecture:** Three independent code changes plus one documentation addition. Sentry env vars control sampling from outside the bundle. KV TTL reduces write operations per day. A monitoring checklist doc gives the user a weekly routine.

**Tech Stack:** Cloudflare Workers, Sentry (browser + cloudflare), Vite env vars

**Priority ranking from COST-ANALYSIS.md:**
| # | Service | Limit | Risk |
|---|---------|-------|------|
| 1 | Sentry | 5k events/bulan | Tercapai di ~25k PV dengan tracing 20% |
| 2 | Supabase bandwidth | 5 GB/bulan | Tercapai di ~50k PV |
| 3 | Cloudflare KV write | 1k write/hari | Tergantung cache key aktif |

## Global Constraints

- All `VITE_` env vars are baked into the client bundle at build time — they are visible to end users (acceptable for sampling rates).
- Sentry DSN is already configured and working — only sampling rates change.
- KV namespace `POSTS_CACHE` already exists — no new Cloudflare resources needed.
- `.env.example` must stay in sync with actual env vars used by the code.
- No new npm dependencies.
- All changes must be git-committed individually.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/sentry/client.ts` | Modify | Read `VITE_SENTRY_SAMPLE_RATE` and `VITE_SENTRY_REPLAY_SAMPLE_RATE` from env; default to 0 |
| `worker.ts` | Modify | Change `CACHE_TTL_SECONDS` from 300 to 3600 |
| `.env.example` | Modify | Add `VITE_SENTRY_SAMPLE_RATE` and `VITE_SENTRY_REPLAY_SAMPLE_RATE` entries |
| `docs/COST-ANALYSIS.md` | Already exists | Reference doc — no changes needed |
| `docs/CHECKLIST-MONITORING.md` | Create | Weekly monitoring checklist for dashboard checks |

---

### Task 1: Sentry Sampling Rate via Env Vars

**Files:**
- Modify: `src/lib/sentry/client.ts` (lines 31-42)
- Modify: `.env.example` (add 2 env vars)

**Interfaces:**
- Consumes: Nothing — env vars read at runtime
- Produces: `VITE_SENTRY_SAMPLE_RATE` (env var, float 0.0–1.0), `VITE_SENTRY_REPLAY_SAMPLE_RATE` (env var, float 0.0–1.0)

- [ ] **Step 1: Read current Sentry client.ts**

Read `src/lib/sentry/client.ts` to confirm current lines around `tracesSampleRate` and `replaysSessionSampleRate`:

```ts
tracesSampleRate:
  import.meta.env.DEV
    ? 1.0
    : 0.2,

replaysSessionSampleRate:
  import.meta.env.DEV
    ? 1.0
    : 0.05,
```

- [ ] **Step 2: Modify Sentry client to read env vars**

Change the sampling config to use `VITE_SENTRY_SAMPLE_RATE` and `VITE_SENTRY_REPLAY_SAMPLE_RATE` with defaults of 0:

Edit `src/lib/sentry/client.ts`:

```ts
    tracesSampleRate: parseFloat(
      import.meta.env.VITE_SENTRY_SAMPLE_RATE ?? "0"
    ),

    replaysSessionSampleRate: parseFloat(
      import.meta.env.VITE_SENTRY_REPLAY_SAMPLE_RATE ?? "0"
    ),
```

- [ ] **Step 3: Verify the full file looks correct**

The affected section should now read:

```ts
  Sentry.init({
    dsn,

    environment: import.meta.env.MODE,

    integrations: [
      Sentry.browserTracingIntegration(),

      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    tracesSampleRate: parseFloat(
      import.meta.env.VITE_SENTRY_SAMPLE_RATE ?? "0"
    ),

    replaysSessionSampleRate: parseFloat(
      import.meta.env.VITE_SENTRY_REPLAY_SAMPLE_RATE ?? "0"
    ),

    replaysOnErrorSampleRate: 1.0,

    sendDefaultPii: false,
```

- [ ] **Step 4: Add env vars to `.env.example`**

Edit `.env.example` and add after the Sentry lines:

```env
VITE_SENTRY_SAMPLE_RATE=     # Sentry tracing sample rate 0.0-1.0 (default 0 = off)
VITE_SENTRY_REPLAY_SAMPLE_RATE= # Sentry replay sample rate 0.0-1.0 (default 0 = off)
```

- [ ] **Step 5: Verify build**

```bash
npx tsc --noEmit
```

Expected: No TypeScript errors (parseFloat return type `number` matches Sentry's `tracesSampleRate: number`).

- [ ] **Step 6: Commit**

```bash
git add src/lib/sentry/client.ts .env.example
git commit -m "feat: make Sentry sampling rate configurable via env vars

Default to 0 (off) to avoid hitting 5k event/month free tier limit.
Set VITE_SENTRY_SAMPLE_RATE=0.2 and VITE_SENTRY_REPLAY_SAMPLE_RATE=0.05
in .env when debugging to re-enable.
"
```

---

### Task 2: Increase KV Cache TTL to 1 Hour

**Files:**
- Modify: `worker.ts` (line 17)

**Interfaces:**
- Consumes: Nothing
- Produces: `CACHE_TTL_SECONDS = 3600` (reduces daily writes per key from 288 → 24)

**Rationale from COST-ANALYSIS.md:**
| TTL | Write/hari (3 keys) | Write/hari (5 keys) | Limit | Status |
|-----|--------------------|--------------------|-------|--------|
| 300s (current) | 864 | 1.440 | 1k | ❌ Over at 5 keys |
| 3600s (new) | 72 | 120 | 1k | ✅ Safe even at 10+ keys |

Cache hit rate stays high because:
- Post data rarely changes (admin publishes → new data)
- 1-hour staleness is acceptable for a content platform
- If admin needs instant refresh, they can wait 1 hour or deploy to purge

- [ ] **Step 1: Change CACHE_TTL_SECONDS**

Edit `worker.ts` line 17:

```
Before: const CACHE_TTL_SECONDS = 300;
After:  const CACHE_TTL_SECONDS = 3600;
```

- [ ] **Step 2: Verify the file compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add worker.ts
git commit -m "perf: increase KV cache TTL from 5min to 1hr

Reduces daily KV writes from 288/key to 24/key, keeping well under
the free tier limit of 1k writes/day even with 10+ cache keys.
1-hour staleness is acceptable for a content platform.
"
```

---

### Task 3: Create Weekly Monitoring Checklist

**Files:**
- Create: `docs/CHECKLIST-MONITORING.md`

**Interfaces:**
- Consumes: Information from `docs/COST-ANALYSIS.md`
- Produces: A print-friendly checklist doc

- [ ] **Step 1: Create monitoring checklist doc**

Create `docs/CHECKLIST-MONITORING.md`:

```markdown
# Weekly Monitoring Checklist

> Periksa setiap **Senin pagi** untuk memastikan semua service masih
> dalam batas free tier. Jadwal: minggu pertama tiap hari, bulan kedua
> seminggu sekali, bulan ketiga cukup seminggu sekali + alert manual.

---

## 📋 Checklist Mingguan

### 1. Sentry — Usage

**Link:** https://sentry.io/settings/{org}/billing/usage/

| Cek | Limit | Status |
|-----|-------|--------|
| Events used bulan ini | < 5.000 | ⬜ |
| Events remaining | > 1.000 (early warning) | ⬜ |

**Jika > 4.000:** Tracing/replay masih aktif? Matikan dulu.
**Jika > 5.000:** Upgrade ke plan Developer ($29/bln) atau matikan tracing.

---

### 2. Supabase — Bandwidth

**Link:** supabase.com → Project → Database → Usage

| Cek | Limit | Status |
|-----|-------|--------|
| Bandwidth used | < 5 GB | ⬜ |
| Database size | < 500 MB | ⬜ |
| Storage used | < 2 GB | ⬜ |

**Jika bandwidth > 3 GB:** Cek apakah cache berfungsi. Naikkan TTL KV jika perlu.
**Jika storage > 1.5 GB:** Kompres gambar sebelum upload.

---

### 3. Supabase — Monthly Active Users

| Cek | Limit | Status |
|-----|-------|--------|
| MAU | < 50.000 | ⬜ |

**Jika > 40.000:** Limit masih jauh untuk startup awal. Pantau saja.

---

### 4. Cloudflare Workers — Usage

**Link:** cloudflare.com → Workers & Pages → {app} → Metrics

| Cek | Limit | Status |
|-----|-------|--------|
| Requests/hari (30d avg) | < 100.000 | ⬜ |
| CPU time/request | < 10ms | ⬜ |

**Jika > 80.000 request/hari:** Optimasi cache atau upgrade Workers ($5/bln).

---

### 5. Cloudflare KV — Operations

**Link:** cloudflare.com → Workers & Pages → KV → {namespace}

| Cek | Limit | Status |
|-----|-------|--------|
| Read/hari | < 100.000 | ⬜ |
| Write/hari | < 1.000 | ⬜ |

**Jika write > 800:** Naikkan TTL lebih tinggi atau kurangi jumlah cache key.

---

### 6. PostHog — Usage

**Link:** app.posthog.com → Project → Usage

| Cek | Limit | Status |
|-----|-------|--------|
| Events/bulan | < 1.000.000 | ⬜ |

**Sangat longgar.** Cukup pantau jika traffic sudah > 50k PV/bulan.

---

## 🚨 Emergency Contacts

| Service | Jika Kena Charge | Opsi |
|---------|-----------------|------|
| **Sentry** | $29/bln → Developer plan (100k events) | Matikan tracing dulu |
| **Supabase** | $25/bln → Pro (250 GB bandwidth, 8 GB DB) | Cache lebih agresif |
| **Cloudflare** | $5/bln → Workers Paid | Paling murah, bisa diakali |

---

## 📝 Catatan

- **Minggu 1:** Cek tiap hari — catat angka baseline
- **Bulan 2:** Kurangi ke seminggu sekali
- **Bulan 3+:** Cukup seminggu sekali + pantau notifikasi email dari masing-masing service
- **Custom domain:** Beli setelah ada MRR ($10-15/tahun untuk .com atau .id)

> Prinsip: Tetap $0 sampai MRR stabil. Jangan bayar sebelum ada pemasukan.
```

- [ ] **Step 2: Commit**

```bash
git add docs/CHECKLIST-MONITORING.md
git commit -m "docs: add weekly monitoring checklist for free tier limits"
```

---

### Task 4: Update .env.example Final Cleanup

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Verify final .env.example**

Open `.env.example` and confirm it includes:

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxxxxx

# Sentry
VITE_SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.ingest.de.sentry.io/xxxxxxxxxxxx
VITE_SENTRY_SAMPLE_RATE=     # 0.0-1.0 (default 0 = off, set 0.2 for 20% tracing)
VITE_SENTRY_REPLAY_SAMPLE_RATE= # 0.0-1.0 (default 0 = off, set 0.05 for 5% replay)

# PostHog
VITE_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxx
VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

- [ ] **Step 2: Verify no stale VITE_ vars remain**

```bash
grep -rn "VITE_CACHE_INVALIDATE_SECRET\|VITE_SENTRY_ORG\|VITE_SENTRY_PROJECT\|VITE_SENTRY_AUTH_TOKEN" .env.example
```

Expected: No output (those were removed earlier or never belonged in `.env.example`).

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "chore: update env example with Sentry sampling rate vars"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ Sentry 5k events limit → Task 1 (env-controllable sampling, default 0)
- ✅ Cloudflare KV 1k writes limit → Task 2 (TTL 5min → 1hr)
- ✅ Supabase bandwidth → Mitigated by Task 2 (more cache hits, fewer Supabase calls)
- ✅ Supabase storage → Mentioned in checklist (Task 3) as weekly check
- ✅ Monitoring → Task 3 (checklist doc)
- ✅ Sentry env vars documented → Task 4 (.env.example)

**2. Placeholder scan:**
- No TBD, TODO, or "fill in details" placeholders
- All code blocks contain real implementations
- All commands have expected output specified

**3. Type consistency:**
- Sentry `tracesSampleRate` expects `number` → `parseFloat()` returns `number` ✓
- Sentry `replaysSessionSampleRate` expects `number` → same pattern ✓
- `CACHE_TTL_SECONDS` is `const number` → 300 vs 3600, same type ✓
