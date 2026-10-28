# Deploy HI VISION

Panduan deploy produksi: **frontend (static)** + **API Hono** + **Redis** (disarankan).

## Arsitektur

```
Browser ──► Nginx / CDN (static Vite)
               │
               └── /api/* ──► Node API :8787 ──► Redis
```

- Frontend **tidak** mem-proxy stream CCTV; hanya katalog + Share Demo frames.
- Share Demo butuh API yang sama yang bisa diakses HP peserta (HTTPS + URL publik).

## Prasyarat

- Node.js 20+ (atau 22 LTS)
- Redis 7 (Docker atau managed)
- Reverse proxy (Nginx / Caddy) dengan TLS

## Environment

### Frontend (build-time)

Salin [`.env.example`](../.env.example) → `.env.production` (atau set di CI):

| Variabel | Produksi | Keterangan |
| --- | --- | --- |
| `VITE_APP_TITLE` | `HI VISION` | Judul app |
| `VITE_API_URL` | kosong **atau** `https://domain-kamu` | Kosongkan jika Nginx menyatukan `/api` ke origin yang sama. Isi URL absolut hanya jika API di domain/port lain. |

`VITE_*` di-bake saat `npm run build`. Ganti URL → **build ulang**.

### API (runtime)

Salin [`server/.env.example`](../server/.env.example) → `server/.env`:

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `PORT` | `8787` | Port listen API |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Wajib di produksi multi-instance / Share Demo |
| `CACHE_TTL_SECONDS` | `60` | TTL katalog kamera |
| `CACHE_KEY` | `hi-vision:cameras:v1` | Key Redis katalog |

Tanpa Redis, API fallback ke **memory** (hilang saat restart; tidak cocok multi-proses).

## Build

```bash
# di root repo
npm ci
npm --prefix server ci

# frontend
cp .env.example .env.production   # sesuaikan VITE_API_URL
npm run build
# output: dist/

# API tidak perlu compile terpisah (tsx). Pastikan server/.env siap.
```

## Jalankan proses

### 1. Redis

```bash
npm run redis:up
# atau: docker compose up -d redis
```

Managed Redis: set `REDIS_URL=redis://:password@host:6379`.

### 2. API

```bash
cd server
# export env atau pakai .env yang di-load shell/systemd
PORT=8787 REDIS_URL=redis://127.0.0.1:6379 npm run start
```

Health cepat:

```bash
curl -sS https://domain-kamu/api/live
curl -sS https://domain-kamu/api/cameras | head
```

Proses manager contoh (systemd unit singkat):

```ini
[Unit]
Description=HI Vision API
After=network.target redis.service

[Service]
WorkingDirectory=/opt/hi-vision/server
EnvironmentFile=/opt/hi-vision/server/.env
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=3
User=www-data

[Install]
WantedBy=multi-user.target
```

Atau PM2:

```bash
cd /opt/hi-vision/server
pm2 start npm --name hi-vision-api -- run start
pm2 save
```

### 3. Frontend static

Serve folder `dist/` via Nginx (disarankan) atau:

```bash
npm run preview -- --host 0.0.0.0 --port 4173
```

(`preview` hanya untuk smoke test, bukan produksi jangka panjang.)

## Nginx (contoh same-origin)

Satu domain: static + reverse proxy `/api` → API. Frontend **tanpa** `VITE_API_URL`.

```nginx
server {
  listen 443 ssl http2;
  server_name hi-vision.example.com;

  # ssl_certificate ...;
  # ssl_certificate_key ...;

  root /opt/hi-vision/dist;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:8787/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    # WebRTC signaling (Share Demo)
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;
    client_max_body_size 1m;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

HTTP → HTTPS redirect sesuai kebiasaanmu.

## Checklist produksi

- [ ] TLS aktif (kamera HP di Share Demo **wajib HTTPS**, kecuali `localhost`)
- [ ] Redis up; `GET /api/cameras` → `meta.backend: "redis"`
- [ ] `GET /api/live` OK dari HP di jaringan yang sama / publik
- [ ] WebSocket `/api/live/ws` ter-upgrade (cek Nginx `Upgrade` / `Connection`)
- [ ] CORS: jika frontend & API beda origin, pastikan origin FE diizinkan (saat ini API memakai `origin: *` — pertimbangkan ketatkan)
- [ ] Firewall: hanya 80/443 publik; Redis & `:8787` **jangan** expose ke internet
- [ ] Restart policy (systemd/PM2/Docker) untuk API + Redis
- [ ] Share Demo = **WebRTC P2P** (signaling lewat API)
- [ ] `GET /api/live/ice` → `"hasTurn": true` (kalau `false`, layar sering **hitam** di domain publik meski local aman)
- [ ] Firewall UDP/TCP **3478** (dan rentang relay coturn bila dipakai) terbuka ke publik

## WebRTC hitam di production (local aman)

Penyebab tipikal: signaling WSS oke, tapi **media P2P gagal di balik NAT**. Local pakai kandidat LAN; lewat `https://domain` butuh **TURN**.

1. Pasang coturn di VPS (contoh compose profile):

```bash
TURN_USER=hivision TURN_PASS='password-kuat' TURN_REALM=cctv.summict.co.id \
  docker compose --profile turn up -d coturn
```

2. Di `server/.env` (lalu `pm2 restart live-cctv-api --update-env`):

```env
TURN_URLS=turn:cctv.summict.co.id:3478,turn:cctv.summict.co.id:3478?transport=tcp
TURN_USERNAME=hivision
TURN_CREDENTIAL=password-kuat
```

3. Cek: `curl -s https://cctv.summict.co.id/api/live/ice | jq .hasTurn` → harus `true`.

4. Rebuild frontend + hard refresh, share ulang dari HP.

## Share Demo di lapangan

1. Deploy URL publik HTTPS (mis. `https://hi-vision.example.com/live`).
2. Peserta buka tab **Bagikan** di HP (izin kamera) — stream ~30 fps WebRTC.
3. Monitor di tab **Lihat share** / layar proyektor.

HP dan viewer harus mengarah ke **host API yang sama** (same-origin lewat Nginx paling aman) supaya signaling WS jalan.

## Update rilis

```bash
git pull
npm ci && npm --prefix server ci
npm run build
# restart API (pm2 restart hi-vision-api / systemctl restart hi-vision-api)
# ganti dist/ (rsync / symlink atomic)
```

## Batasan yang perlu diketahui ops

- Embed Balitower / portal JSC sering overload — app punya mode outage; jangan mengandalkan probe agresif ke sumber resmi.
- Tidak ada proxy stream CCTV di server ini — beban bandwidth produksi terutama dari **Share Demo JPEG**, bukan feed resmi.
- Status kamera default `unknown`; jangan jual sebagai SLA pemerintah.

Lihat juga: [README](../README.md) · [source-audit](./source-audit.md).
