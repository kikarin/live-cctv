# HI VISION

Dashboard monitoring CCTV publik di sekitar Bundaran HI dan koridor Jakarta.

**Bukan layanan resmi pemerintah.** Stream berasal dari penyedia pihak ketiga.

## Stack

- React + Vite + TypeScript
- Tailwind CSS v4
- React Router
- Leaflet / OpenStreetMap
- HLS.js (siap dipakai jika URL HLS terverifikasi)
- API Hono + Redis cache (katalog jakcctv)

## Menjalankan lokal

```bash
npm install
npm --prefix server install
```

Redis (opsional — kalau tidak ada Docker, API otomatis pakai memory cache):

```bash
npm run redis:up
```

Jalankan API + frontend:

```bash
# terminal 1
npm run dev:api

# terminal 2
npm run dev
```

Atau: `npm run dev:all`

- App: http://localhost:5173/
- API: http://localhost:8787/api/cameras
- Share Demo (HP): http://localhost:5173/live

Build produksi:

```bash
npm run build
npm run preview
```

## Perilaku live (lazy)

- Kartu kamera **tidak** memutar video sampai dipilih.
- Satu preview player aktif per pemilihan (hemat resource).
- Tutup preview = stop load embed.

## API cache

- `GET /api/cameras` — katalog Jakarta Smart City dari `jakcctv.jakarta.go.id/publik/data`
- Cache Redis TTL 60 detik (`CACHE_TTL_SECONDS`), key `hi-vision:cameras:v1`
- Fallback memory jika Redis tidak tersedia
- **Tidak** mem-proxy stream video/embed Balitower

Env: lihat [`.env.example`](.env.example) dan [`server/.env.example`](server/.env.example).

## Fitur MVP

- Dashboard grid (1 / 2 / 4 kolom), pencarian, filter penyedia/area/tipe
- Peta kamera (hanya koordinat yang ada di registry)
- Direktori kamera
- Halaman detail + fallback “buka sumber asli”
- Halaman `/live` — mahasiswa share kondisi demo dari kamera HP; orang lain pantau di web yang sama (frame di-cache Redis)
- Halaman About & atribusi

## Batasan penting

Sumber utama: portal publik **Jakarta Smart City** [`jakcctv.jakarta.go.id/publik`](https://jakcctv.jakarta.go.id/publik). Embed Balitower (port 7028/8011) sering timeout — app mengarahkan ke portal asli.

Status default tetap `unknown`.

Detail: [`docs/source-audit.md`](docs/source-audit.md) · spesifikasi: [`docs/blueprint.md`](docs/blueprint.md)

## Data kamera

- Dinamis (JSC): API cached
- Statis (LewatMana dkk): [`src/data/cameras.ts`](src/data/cameras.ts)
