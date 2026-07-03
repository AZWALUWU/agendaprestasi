# Cost Analysis & Free Tier Management

> Dokumentasi batas free tier dan potensi biaya untuk semua service yang
> digunakan. Target: **$0 operational cost sampai MRV/MRR stabil.**
> Tidak boleh ada biaya tak terduga — setiap service dimonitor limitnya.

---

## Daftar Isi

- [Cloudflare Workers](#cloudflare-workers)
- [Cloudflare KV](#cloudflare-kv)
- [Supabase](#supabase)
- [Sentry](#sentry)
- [PostHog](#posthog)
- [Domain](#domain)
- [Ringkasan Limit](#ringkasan-limit)
- [Dashboard yang Dipantau](#dashboard-yang-dipantau)
- [Rekomendasi Strategis](#rekomendasi-strategis)

---

## Cloudflare Workers

**Paket:** Free

| Resource | Limit | Notes |
|----------|-------|-------|
| Request/hari | 100k | ≈ 3k/jam, cukup untuk ribuan DAU |
| CPU time | 10ms/request | SSR mungkin perlu optimasi jika banyak hit |
| Workers.dev subdomain | ✅ | Gratis |

**Trigger biaya:** > 100k request/hari → forced upgrade ke paid ($5/bulan)

**Pantau:** Cloudflare Dashboard → Workers & Pages → Usage

---

## Cloudflare KV

**Paket:** Free

| Resource | Limit | Notes |
|----------|-------|-------|
| Read/hari | 100k | Aman — cache hit cuma 1 read per request |
| Write/hari | **1k** | ⚠️ **Paling riskan** — lihat kalkulasi di bawah |
| Delete/hari | 1k | Jarang terjadi |
| Stored data | 1 GB | Post data JSON, aman |

### Kalkulasi Write Limit

Setiap kombinasi `(category, page)` butuh 1 write pertama saat cache miss.
Cache TTL = 300s (5 menit).

**Rumus:** `write/hari = jumlah cache key × (86400 / TTL_detik)`

| Skenario | Cache Key Aktif | Write/hari | Limit | Status |
|----------|----------------|------------|-------|--------|
| Rendah | 3 (all, scholarship, page 1-2) | 864 | 1k | ✅ Aman |
| Sedang | 5 (all + 3 kategori + page 1-2) | 1.440 | 1k | ⚠️ Over |
| Tinggi | 8 (3 kategori × 3 page + all) | 2.304 | 1k | 🛑 Over |

**Mitigasi jika traffic naik:**
1. Naikkan TTL → tiap 1 jam = 24 write/hari/key (bukan 288)
2. Hapus cache key yang jarang diakses
3. Upgrade ke paid plan KV ($0.50/bulan per 1M operasi)

**Realisasi saat ini (traffic rendah):**
2-3 cache key aktif → ~864 write/hari → masih di bawah 1k.

---

## Supabase

**Paket:** Free

| Resource | Limit | Notes |
|----------|-------|-------|
| Database size | 500 MB | ~10.000 post (50KB/post) |
| Bandwidth | **5 GB/bulan** | ⚠️ **Paling riskan** setelah Sentry |
| Monthly Active Users | 50k | Login unik per bulan |
| Storage | 2 GB | Upload image post |
| Edge Functions | 500k invocations | Tidak dipakai |

### Breakdown Bandwidth

Per page load mengirim:
- HTML (SSR): ~30-50KB
- JSON data (posts): ~5-10KB
- JS/CSS bundle: ~200-300KB (cached browser, dihitung sekali)

Estimasi per page view: **~100KB**

| Page View/bulan | Bandwidth | Status |
|----------------|-----------|--------|
| 10.000 | ~1 GB | ✅ Aman |
| 25.000 | ~2.5 GB | ✅ Aman |
| **50.000** | **~5 GB** | ⚠️ **Limit** |
| 100.000 | ~10 GB | 🛑 Kena charge / throttle |

**Harga over limit:** $0.12/GB atau throttle.

**Mitigasi:**
- Cache (KV + CDN) mengurangi hit ke Supabase
- Kompresi HTML di Worker
- Pagination — jangan fetch semua post sekaligus

### Breakdown Storage

Post images di bucket `post-images`.

| Image Quality | Size | Max Images (2 GB) |
|--------------|------|--------------------|
| Foto HP mentah | 3-5 MB | ~400-600 |
| Web optimized | 200-500 KB | ~4.000-10.000 |
| Thumbnail (100KB) | 100 KB | ~20.000 |

**Mitigasi:**
- Kompres gambar sebelum upload (squoosh.app / TinyPNG)
- Format WebP/AVIF, bukan JPEG/PNG
- Jangan upload screenshot mentah

---

## Sentry

**Paket:** Free

| Resource | Limit | Notes |
|----------|-------|-------|
| Events/bulan | **5k** | ⚠️ **Limit paling rendah dari semua service** |
| Users | 1 | Single developer only |

### Hitung Pemakaian

Setiap page view bisa generate:
- 1 error event (kalau ada error) — jarang
- 1 trace event (sesuai sampling rate)
- 1 session replay (sesuai sampling rate)

Rata-rata event per page view:

| Sampling | Events/1k PV | 5k Limit Tercapai Di |
|----------|-------------|----------------------|
| tracesSampleRate = 0.2 (20%) | ~200 | ~25k PV |
| tracesSampleRate = 0.05 (5%) | ~50 | ~100k PV |
| tracesSampleRate = 0 (mati) | ~0 | Kapan saja |

Konfigurasi saat ini:
```ts
tracesSampleRate: DEV ? 1.0 : 0.2,        // 20% → sementara aman
replaysSessionSampleRate: DEV ? 1.0 : 0.05, // 5%
replaysOnErrorSampleRate: 1.0,
```

**20% tracing = 200 event/1k PV.** Limit 5k tercapai di ~25k page view/bulan.

### Rekomendasi

**Jika traffic masih rendah (<5k PV/bulan):** Biarkan saja.

**Jika traffic mulai naik (>10k PV/bulan):** Turunkan jadi:

```ts
tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_SAMPLE_RATE || "0"),
replaysSessionSampleRate: 0,
replaysOnErrorSampleRate: 1.0,
```

Default 0 = tidak ada tracing. Aktifkan manual via env `VITE_SENTRY_SAMPLE_RATE=0.2` kalau lagi debugging.

Atau matikan tracing dan replay di free tier, hidupkan setelah ada MRR.

---

## PostHog

**Paket:** Free

| Resource | Limit | Notes |
|----------|-------|-------|
| Events/bulan | **1 juta** | Sangat longgar untuk startup baru |
| Session recording | Included | Inklusif dalam 1M events |
| Users | Unlimited | ✅ |

**Estimasi:** Startup baru 10k-50k events/bulan. 1M events = ~50x lipat.

**✅ Sangat aman.** Tidak perlu khawatir sampai scale besar.

---

## Domain

| Opsi | Biaya |
|------|-------|
| `*.workers.dev` | **$0** |
| Custom domain (`.com` / `.id`) | ~$10-15/tahun |

Workers dev subdomain gratis. Custom domain bisa nanti setelah ada MRR.

---

## Ringkasan Limit

Diurutkan dari paling riskan ke paling aman:

| Peringkat | Service | Limit | Breakdown |
|-----------|---------|-------|-----------|
| 🥇 **#1** | **Sentry** | **5k events/bulan** | Tercapai di ~25k PV dengan tracing 20% |
| 🥈 **#2** | **Supabase bandwidth** | **5 GB/bulan** | Tercapai di ~50k PV |
| 🥉 **#3** | **Cloudflare KV write** | **1k write/hari** | Tergantung jumlah cache key, ~3-8 key aktif |
| #4 | Supabase storage | 2 GB | Bergantung jumlah & ukuran gambar |
| #5 | Cloudflare Workers | 100k request/hari | ~10k+ DAU |
| #6 | Supabase MAU | 50k user | Sulit tercapai di awal |
| #7 | Supabase DB | 500 MB | ~10.000 post |
| #8 | PostHog | 1M events/bulan | ~100k+ PV |
| ✅ | Semua yang lain | Unlimited/$0 | |

### Total Biaya Minimum

| Service | Biaya Bulanan | Catatan |
|---------|--------------|---------|
| Cloudflare Workers | $0 | Dalam batas free |
| Cloudflare KV | $0 | Dalam batas free |
| Supabase | $0 | Dalam batas free |
| Sentry | $0 | Dalam batas free |
| PostHog | $0 | Dalam batas free |
| Domain | $0 | Pakai `*.workers.dev` |
| **Total** | **$0** | ✅ Selama pantau limit |

---

## Dashboard yang Dipantau

**Jadwal: 1x seminggu (setiap Senin pagi)**

| Dashboard | Link | Yang Dicek |
|-----------|------|------------|
| Cloudflare | cloudflare.com → Workers & Pages | Request count, KV operations |
| Supabase | supabase.com → project → Database | Database size, Bandwidth |
| Supabase → Storage | supabase.com → Storage | Storage used |
| Sentry | sentry.io → Usage | Monthly events remaining |
| PostHog | app.posthog.com → Usage | Monthly events remaining |

### Perkiraan Schedule Awal

- **Minggu 1-4:** Cek semua dashboard setiap hari
- **Bulan 2:** Jika aman, kurangi ke seminggu sekali
- **Bulan 3+:** Cukup seminggu sekali + alert manual

---

## Rekomendasi Strategis

### Jangka Pendek (sekarang)
- ✅ Semua service di free tier — tidak ada biaya
- ✅ Cache aktif (KV, TTL 5 menit) — mengurangi hit ke Supabase

### Jika Traffic Mulai Naik (>5k PV/bulan)
1. Turunkan Sentry sampling rate ke 0 (atau matikan tracing)
2. Monitor KV write — naikkan TTL jika mendekati 1k/hari
3. Kompres gambar sebelum upload ke Supabase

### Jika Mendekati Limit (early warning)
1. Sentry events > 3k/bulan → matikan tracing & replay, aktifkan hanya saat debugging
2. Supabase bandwidth > 3 GB/bulan → periksa apakah caching optimal, kompres HTML response
3. KV write > 700/hari → naikkan TTL dari 300s ke 3600s

### Jika Kena Charge Tak Terduga
1. **Sentry:** Upgrade ke $29/bulan (events naik jadi 100k) — tapi sebaiknya turunkan sampling dulu
2. **Supabase:** Upgrade ke Pro $25/bulan (bandwidth 250 GB, DB 8 GB) — tapi ini signifikan, hindari
3. **Cloudflare:** $5/bulan — paling murah, bisa diakali dengan optimasi

### Prinsip

> **Semua bisa tetap $0** sampai mencapai setidaknya ~25k page view/bulan.
> Limit paling rendah adalah Sentry (5k events) yang setara ~25k PV dengan
> sampling 20%. Turunkan sampling = naikkan kapasitas gratis.

> Setelah punya MRR stabil baru pikirkan upgrade — jangan sebelum itu.
