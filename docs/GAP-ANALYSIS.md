# Free Tier Optimization — Gap Analysis

> Celah dan pengembangan tambahan yang belum di-cover oleh plan
> `docs/superpowers/plans/2026-07-04-free-tier-mitigation.md`.
> Untuk dijadikan bahan pertimbangan setelah plan utama selesai.

---

## Status Coverage

| Area | Plan Saat Ini | Belum Di-Cover |
|------|--------------|----------------|
| Sentry sampling rate via env var | ✅ Task 1 | — |
| KV cache TTL 5m → 1h | ✅ Task 2 | — |
| Monitoring checklist | ✅ Task 3 | — |
| Env vars cleanup | ✅ Task 4 | — |
| Image optimization | ❌ — | 🟡 **Perlu** |
| Brotli/gzip compression di Worker | ❌ — | 🟡 **Perlu** |
| Cache-Control header untuk static assets | ❌ — | 🟡 **Perlu** |
| Bundle size reduction (5.2MB) | ❌ — | 🟢 Opsional |
| Automated free-tier alerts | ❌ — | 🟢 Opsional |
| Query optimization | ❌ — | 🟢 Opsional |
| Load testing sebelum launch | ❌ — | 🟡 **Perlu** |

**Legend:**
- 🟡 **Perlu** — langsung impact ke free tier limits
- 🟢 Opsional — nice to have, bisa dikerjakan nanti

---

## Detail Gap

### 1. Image Optimization

**Problem:** Semua gambar public di `public/` dan post images di Supabase storage
tidak dioptimasi sama sekali.

| Asset | Size Saat Ini | Target |
|-------|--------------|--------|
| `public/agendaprestasi.png` (OG image) | **96 KB** | ~20-30 KB (WebP) |
| `public/favicon.svg` | **129 KB** | ~5-10 KB (minified SVG) |
| Post images (Supabase storage) | Variable | Kompres sebelum upload |

**Impact:**
- OG image (96KB) dimuat di setiap page share — langsung boros bandwidth
- SVG 129KB itu tidak wajar — SVG biasanya < 10KB
- Post images tanpa kompresi bisa cepat habiskan 2GB storage + 5GB bandwidth

**Opsi solusi:**

| Opsi | Biaya | Kerjaan |
|------|-------|---------|
| **A. Manual compress** — Kompres gambar sebelum taruh di `public/` pakai squoosh.app | $0 | Manual, 5 menit |
| **B. Cloudflare Polish** — Aktifkan automatic image optimization di dashboard (free plan included) | $0 | 1x setting, otomatis |
| **C. Image compression pipeline** — Script otomatis di build step yang kompres semua image | $0 | Sedang, perlu setup |

### 2. Brotli/Gzip Compression di Worker

**Problem:** Worker saat ini tidak meng-set `Content-Encoding` header.
Response dari Worker bisa di-compress untuk hemat bandwidth.

**Impact:**
- HTML response (SSR) ~30-50KB → bisa turun ke ~8-15KB dengan Brotli
- JSON response ~5-10KB → bisa turun ke ~2-4KB
- Bandwidth saving: ~60-70%

**Opsi solusi:**

| Opsi | Biaya | Kerjaan |
|------|-------|---------|
| **A. Cloudflare Auto Minify** — Aktifkan Auto Minify + Auto Compression di dashboard | $0 | 1x setting, otomatis |
| **B. Manual Brotli di Worker** — Tambah `Accept-Encoding` handling di `worker.ts` | $0 | Sedang, ~10 baris code |
| **C. Biarkan Cloudflare** — Cloudflare free plan already compresses responses | $0 | 0 kerjaan (already happening) |

**Catatan:** Cloudflare free plan sebenarnya sudah auto-compress responses (Brotli) lewat proxy. Jadi ini mungkin sudah jalan tanpa sadar. Cek dulu.

### 3. Cache-Control Header untuk Static Assets

**Problem:** Worker tidak meng-set `Cache-Control` untuk static assets.
Browser tidak akan cache asset secara agresif.

**Impact:**
- JS/CSS bundle (5.2MB) di-download ulang setiap page load jika tidak di-cache
- Bandwidth boros untuk file yang jarang berubah

**Opsi solusi:**

| Opsi | Biaya | Kerjaan |
|------|-------|---------|
| **A. Cloudflare Page Rules** — Set cache rule untuk `/assets/*` dengan TTL 1 tahun | $0 | 1x setting di dashboard |
| **B. Worker headers** — Tambah set `Cache-Control: public, max-age=31536000` di Worker untuk static assets | $0 | Mudah, ~5 baris code |

### 4. Bundle Size Reduction

**Problem:** `dist/client/assets/` total 5.2MB.

```
total 5.2M
-rw-rw-r-- ... 2.5K admin-CdPgk_jO.js
-rw-rw-r-- ... 6.7K admin.index-DLN23yjF.js
-rw-rw-r-- ... 2.5K admin.posts._id.edit-D-jj_4D1.js
-rw-rw-r-- ... 1.6K admin.posts.new-Ck7QafqW.js
-rw-rw-r-- ... 1.3K auth.callback-CwP-SI2d.js
... (dan seterusnya)
```

**Impact:**
- 5.2MB initial load = bandwidth boros
- User experience lebih lambat

**Opsi solusi:**

| Opsi | Biaya | Kerjaan |
|------|-------|---------|
| **A. Analisa bundle** — Jalankan `npx vite-bundle-analyzer` atau `rollup-plugin-visualizer` untuk lihat apa yang terbesar | $0 | Satu kali jalan |
| **B. Tree-shaking audit** — Pastikan import cuma ambil yang dipakai (contoh: `lucide-react` import ikon satuan, bukan full library) | $0 | Review imports |
| **C. Code splitting** — TanStack Router sudah code-split otomatis per route | ✅ Already done | — |

### 5. Automated Free-Tier Alerts

**Problem:** Monitoring masih manual (cecklist mingguan). Bisa kelewatan.

**Opsi solusi:**

| Opsi | Biaya | Kerjaan |
|------|-------|---------|
| **A. Cloudflare Email Routing** — Kirim alert via email ketika approaching limit (butuh cron/pages function) | $0 | Sedang, perlu cron job sederhana |
| **B. Sentry webhook** — Sentry bisa kirim alert via email ketika events > 80% limit | $0 | 1x setting di dashboard Sentry |
| **C. Better Uptime / Checkly free** — Monitoring uptime + usage, free tier cukup | $0 | 1x daftar + setting |

### 6. Load Testing Sebelum Launch

**Problem:** Tidak tahu seberapa banyak traffic sebelum kena limit.

**Opsi solusi:**

| Opsi | Biaya | Kerjaan |
|------|-------|---------|
| **A. k6 (Grafana)** — Load testing open source, jalan di CLI | $0 | Satu kali setup, test sederhana |
| **B. Google Lighthouse** — Cek performa + cache recommendations | $0 | Bisa dari Chrome DevTools |
| **C. Apache Bench (ab)** — Simple load test untuk lihat response time | $0 | `ab -n 100 -c 10 https://...` |

---

## Prioritas Rekomendasi

Berdasarkan impact ke free tier:

| Priority | Item | Impact ke Budget | Effort |
|----------|------|-----------------|--------|
| 🥇 **P1** | Kompres `favicon.svg` (129KB → ~5KB) | ✅ Langsung hemat bandwidth | 2 menit |
| 🥇 **P1** | Kompres `agendaprestasi.png` (96KB → ~25KB WebP) | ✅ OG image di-load tiap share | 2 menit |
| 🥇 **P1** | Cek Cloudflare Auto Minify + Brotli sudah aktif | ✅ 0 effort, cek dashboard | 1 menit |
| 🥈 **P2** | Cache-Control headers untuk static assets | ✅ Hemat bandwidth berulang | 1x setting |
| 🥈 **P2** | Image compression sebelum upload ke admin panel | ✅ Cegah storage/bandwidth bocor | Sedang |
| 🥉 **P3** | Load testing (k6) untuk tau limit traffic | ✅ Tau batas aman sebelum publish | Satu kali |
| 🥉 **P3** | Automated free-tier alerts | ✅ Prevent charge tak terduga | Sedang |
| — | Bundle size reduction | 🟢 Nice to have | Review |
