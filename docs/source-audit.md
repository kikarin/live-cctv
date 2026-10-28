# Source Audit — HI VISION

**Audit date:** 2026-10-28 (WIB)  
**Method:** HTTP fetch of public provider pages; no private API scraping; no access-control bypass.  
Jakarta Smart City camera list taken from the public portal’s own `/publik/data` endpoint (same endpoint the portal page calls in-browser).

| Provider | Camera / resource | Source URL | Page accessible? | Direct stream / embed? | Integration | Status used | Limitations | Checked |
|---|---|---|---|---|---|---|---|---|
| Jakarta Smart City | Portal CCTV Publik | https://jakcctv.jakarta.go.id/publik | Yes (200) | Catalog of ~52 public cameras with Balitower embed iframes | `external` (catalog) / `embed` (per camera) | `unknown` | Official public portal. Old host `cctv.jakarta.go.id` does **not** resolve DNS. | 2026-10-28 |
| Jakarta Smart City | Jl. M.H. Thamrin C01 (Dishub) | https://jakcctv.jakarta.go.id/publik | Yes | Public embed `dki-jkt.balitower.co.id:7028/.../embed.html` (HTTP 200, no XFO block observed) | `embed` | `unknown` | Embed page reachable; live video not separately health-checked | 2026-10-28 |
| Jakarta Smart City | Jl. M.H. Thamrin C02 / Simpang C07–C09 | https://jakcctv.jakarta.go.id/publik | Yes | Same Balitower embed pattern | `embed` | `unknown` | Coordinates approximate | 2026-10-28 |
| Jakarta Smart City | UOB Plaza C01 | https://jakcctv.jakarta.go.id/publik | Yes | Balitower embed | `embed` | `unknown` | Near Thamrin / Bundaran HI corridor | 2026-10-28 |
| Jakarta Smart City | Kebon Melati 010, Bendungan Hilir 003, Senayan 001 | https://jakcctv.jakarta.go.id/publik | Yes | `cctv-jsc.balitower.co.id:8011/.../embed.html?proto=hls` | `embed` | `unknown` | HLS-flavored public embed | 2026-10-28 |
| Jakarta Smart City | Gerbang Pemuda C02, Gatot Subroto C11 | https://jakcctv.jakarta.go.id/publik | Yes | Balitower embed | `embed` | `unknown` | Semanggi / Senayan corridor | 2026-10-28 |
| — | Legacy host `cctv.jakarta.go.id` | http(s)://cctv.jakarta.go.id/* | **No** — DNS NXDOMAIN | N/A | — | — | Listed in some third-party articles; not a working official host as of audit | 2026-10-28 |
| LewatMana | Bundaran HI | https://lewatmana.com/cam/272/bundaran-hi/ | Yes (200) | No verified public HLS/embed URL. Page uses Video.js with empty `<source>` until client JS loads. | `external` | `unknown` | In-app playback not verified. Attribution mentions PT MRT Jakarta on page. | 2026-10-28 |
| LewatMana | Jalan M.H. Thamrin | https://lewatmana.com/cam/273/jalan-mh-thamrin/ | Yes (200) | Same as above | `external` | `unknown` | Coordinates approximate | 2026-10-28 |
| LewatMana | Medan Merdeka Selatan | https://lewatmana.com/cam/311/medan-merdeka-selatan/ | Yes (200) | Same as above | `external` | `unknown` | Near Monas; coordinates approximate | 2026-10-28 |
| LewatMana | Cikini Raya | https://lewatmana.com/cam/289/cikini-raya/ | Yes (200) | Same as above | `external` | `unknown` | Approximate near Dukuh Atas corridor | 2026-10-28 |
| LewatMana | Gunung Sahari | https://lewatmana.com/cam/77/gunung-sahari/ | Yes (200) | Same as above | `external` | `unknown` | Approximate | 2026-10-28 |
| Molecool | Live CCTV catalog | https://www.molecool.id/live-cctv | Yes | Full CCTV requires Sign In via mobile app | `external` | `restricted` | Do not bypass login | 2026-10-28 |
| Bina Marga | CCTV Tol portal | https://binamarga.pu.go.id/contents/cctv_tol | Timeout (504) during automated check | Not verified | `external` | `unknown` | No HI-corridor camera verified from this source | 2026-10-28 |

## Summary

- **Playback:** Balitower embed hosts (`dki-jkt.balitower.co.id:7028`, `cctv-jsc.balitower.co.id:8011`) often **timeout** from public/client networks. Registry keeps `embedUrl` for optional retry but defaults JSC cameras to `external` → portal `jakcctv.jakarta.go.id/publik`.
- **Live Demo page:** `/live` with GPS / camera permission / self-declare unlock.
- **API cache:** `GET /api/cameras` caches jakcctv `/publik/data` in Redis (TTL 60s) with memory fallback. Lazy UI: live only when a card is selected.
- **Status:** still `unknown`.
- **Legacy URL:** `cctv.jakarta.go.id` does not resolve; use `jakcctv.jakarta.go.id/publik`.
- **Coordinates:** approximate only; labeled `coordinatesApproximate: true`.
- **Do not claim** official affiliation with Pemprov DKI / Jakarta Smart City.

## Next verification steps

1. Manually confirm each embed plays video in a real browser during demo.
2. Manually confirm LewatMana pages play video.
3. Re-check Bina Marga when reachable.
4. Only add raw `streamUrl` (HLS) after an explicitly permitted public stream URL is confirmed (prefer official embed when already published).
