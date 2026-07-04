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

> Prinsip: **Tetap $0 sampai MRR stabil.** Jangan bayar sebelum ada pemasukan.
