# Next Steps — Manual Tasks

> Yang **perlu kamu lakukan manual** (dashboard / design / 1x setup) setelah perubahan kode dari GAP-ANALYSIS.md.

---

## 🥇 P1 — Segera

### 1. Ganti `favicon.svg` dengan SVG Asli

**Problem:** `public/favicon.svg` saat ini 128KB karena embed PNG 1254×1254. Favicon SVG seharusnya < 10KB sebagai vector murni.

**Yang perlu dilakukan:**
- Buat ulang favicon sebagai SVG murni (vector paths, bukan embedded PNG)
- Atau minta designer bikin versi SVG yang proper
- Pastikan referensi di `__root.tsx` tetap `/favicon.svg`

### 2. Cek Cloudflare Auto Minify + Brotli

**Link:** cloudflare.com → Speed → Optimization

**Cek:**
- [ ] Auto Minify: HTML, CSS, JS aktif?
- [ ] Brotli compression aktif?
- [ ] Jika belum aktif, nyalakan (free, 1 klik)

---

## 🥈 P2 — Minggu Ini

### 3. Page Rule untuk Cache Static Assets

**Problem:** Browser tidak kirim Cache-Control agresif untuk file di `/assets/*`. File JS/CSS (total 6.5MB) di-download ulang tiap load.

**Yang perlu dilakukan:**
1. Buka cloudflare.com → Rules → Page Rules
2. Buat rule: `*domain*/assets/*`
3. Setting: `Cache Level: Cache Everything` + `Edge Cache TTL: 1 year`
4. (Free plan dapat 3 Page Rules, ini pake 1)

**Impact:** File fingerprinted (admin-BbzCem_a.js dsb) di-cache browser 1 tahun. Hemat bandwidth signifikan.

### 4. Image Compression Sebelum Upload ke Admin

**Problem:** Post images diupload ke Supabase storage tanpa kompresi — bisa cepet habisin 2GB storage + 5GB bandwidth.

**Opsi:**
- **Manual:** Kompres pake [squoosh.app](https://squoosh.app) sebelum upload (gratis)
- **Otomatis:** Integrasi kompresi di admin panel (sedang, perlu coding)

---

## 🥉 P3 — Sebelum Launch

### 5. Load Testing

**Sudah siap:** `scripts/load-test.js` — test sederhana untuk `/api/posts`.

**Yang perlu dilakukan:**
1. Install k6: https://k6.io/docs/get-started/installation/
2. Deploy dulu ke production
3. Jalankan:
   ```bash
   BASE_URL=https://domain.com k6 run scripts/load-test.js
   ```
4. Lihat hasil: p(95) response time, error rate

### 6. Automated Free-Tier Alerts

**Opsi termudah:** Aktifkan email alert di dashboard masing-masing service:

| Service | Cara |
|---------|------|
| **Sentry** | Settings → Billing → Alerts → Set warning at 80% |
| **Supabase** | Project → Billing → Usage → Set email alerts |
| **Cloudflare** | Workers → Metrics → Set notifications |
| **PostHog** | Project → Usage → Set alert limit |

---

## ✅ Sudah Selesai (Dari Plan Ini)

| Item | Status |
|------|--------|
| Sentry sampling rate via env var (default 0 = off) | ✅ `src/lib/sentry/client.ts` |
| KV cache TTL 5m → 1hr | ✅ `worker.ts` |
| Monitoring checklist | ✅ `docs/CHECKLIST-MONITORING.md` |
| `agendaprestasi.webp` (96KB → 17KB) | ✅ `public/agendaprestasi.webp` |
| `.env.example` — tambah env var Sentry | ✅ |
| k6 load test script | ✅ `scripts/load-test.js` |

---

> **Prinsip:** Tetap $0 sampai MRR stabil. Jangan bayar sebelum ada pemasukan.
