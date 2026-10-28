# HI VISION — Implementation Blueprint
## Public CCTV & Traffic Monitoring Dashboard

> **Document type:** Agent execution specification  
> **Project:** HI VISION  
> **Purpose:** Build a polished web dashboard that helps users discover and view publicly accessible CCTV feeds around Bundaran HI, Jakarta, and nearby corridors.  
> **Primary principle:** Real functionality and truthful status indicators take priority over visual simulation.

---

## 1. Product Summary

HI VISION is a public CCTV discovery and monitoring interface focused initially on:

- Bundaran HI
- Jalan M.H. Thamrin
- Jalan Jenderal Sudirman
- Dukuh Atas
- Semanggi
- Monas

The product aggregates **publicly accessible camera sources** into one interface. It must not imply that it is an official government product. It must not claim every camera is live or embeddable until verified.

### Product goals

1. Provide a polished live-monitoring dashboard.
2. Let users browse cameras by location and provider.
3. Play authorized streams or embeds directly when supported.
4. Provide a clear, usable fallback to the provider’s original page when direct playback is unavailable.
5. Show camera status only when supported by a real check; otherwise use `unknown`.
6. Make the app responsive and reliable for a public live demo.

### Non-goals for MVP

- Face recognition or identification of people.
- Tracking individuals across cameras.
- Circumventing authentication, DRM, tokens, iframe restrictions, CORS, or provider access controls.
- Recording, redistributing, or proxying CCTV feeds without explicit authorization.
- Claiming official affiliation with Jakarta Smart City, LewatMana, Molecool, Bina Marga, or Jasa Marga.
- Fabricating live feeds, camera counts, traffic statistics, or uptime metrics.

---

## 2. Source Inventory and Verification

Start by auditing sources before implementing the player. A web page URL is **not automatically a direct video-stream URL**.

Potential sources to investigate:

1. LewatMana — Bundaran HI  
   `https://lewatmana.com/cam/272/bundaran-hi/`
2. Jakarta public CCTV portal  
   `https://jakcctv.jakarta.go.id/publik`
3. Molecool Live CCTV  
   `https://www.molecool.id/live-cctv`
4. Bina Marga toll CCTV  
   `https://binamarga.pu.go.id/contents/cctv_tol`

For each source, record:

- Provider and original source URL.
- Camera name and exact/approximate location.
- Whether the page is publicly accessible.
- Whether an official embed or direct stream is explicitly supported.
- Whether login, cookies, temporary tokens, or other access requirements exist.
- Whether attribution or usage conditions apply.
- The date/time it was last manually verified.
- Result: `hls`, `embed`, `external`, or `unavailable`.

Do not scrape private/internal APIs or rely on undocumented endpoints as a production dependency. Do not bypass access controls. If stream terms or permissions are unclear, use an external link.

### Required source audit artifact

Create `docs/source-audit.md` containing a table of each source, verification result, supported integration method, limitations, and date checked. Mark unverified facts clearly.

### Camera availability behavior

- A source page opening successfully does not prove its video is playing.
- An iframe failing does not prove the camera is offline.
- If no valid health check is available, use `unknown`.
- Never ship fake “LIVE” indicators or fabricated uptime.

---

## 3. Recommended Stack

Use the existing repository’s conventions if it already has a working app. If starting from scratch:

- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui where useful
- Lucide React icons
- React Router
- Leaflet + OpenStreetMap tiles for the map
- HLS.js for permitted HLS streams
- Native HTML `<video>` where supported

Do not add a backend for the first MVP unless source auditing proves a backend is required. A static camera registry is sufficient initially. Do not expose secret provider credentials in client-side code.

### Suggested setup

Use the current stable, mutually compatible package versions at implementation time. Do not blindly copy old version pins. Use the package manager already present in the repository; otherwise use npm.

---

## 4. Visual Direction

### Product identity

- **Name:** HI VISION
- **Tagline:** Jakarta Public Camera Monitoring
- **Design style:** Dark, precise, restrained, professional urban monitoring interface.
- Avoid excessive gradients, ornamental animations, generic admin-dashboard styling, or decorative statistics without data.

### Design tokens

- Main background: `#0B0F14`
- Panel background: `#121922`
- Border: `#263241`
- Primary accent: `#35D0BA`
- Warning: `#F5B942`
- Error: `#F06464`
- Main text: high-contrast neutral white
- Secondary text: muted neutral gray
- Font: Inter or an equivalent clean sans-serif

Use accessible contrast, visible focus states, keyboard-friendly controls, and reduced-motion preferences. The interface should remain readable on a 360px-wide mobile viewport.

### Layout

Desktop:
- Persistent left sidebar.
- Top bar with product identity, local time, and settings/info actions.
- Main content area for camera grid or map.
- Compact bottom/status region for source attribution and last-check details.

Mobile:
- Collapsible navigation or bottom navigation.
- Single-column camera cards.
- Video controls and labels must not overflow.
- Map controls must remain usable without covering important content.

### Camera card states

Every camera card must support:
- Loading
- Playing
- Paused (where applicable)
- Error/unavailable
- External-only
- Unknown status

Use status text and icons, not color alone.

---

## 5. Pages and Routes

Implement the following routes:

### `/` — Live Monitoring Dashboard

Primary demo page.

Features:
- Responsive camera grid with 1-, 2-, and 4-camera layouts where appropriate.
- Camera search.
- Filters by provider, location, and integration type.
- Camera selection and clear active-camera state.
- Click a card to open a larger player/detail view.
- Refresh/retry action for supported player types.
- Provider/source link on every card.
- Clear fallback when playback cannot be embedded.
- A visible notice that streams are supplied by third-party public sources.

Do not autoplay audio. If autoplay is used, it must be muted and follow browser policy. Prefer user-initiated playback.

### `/map` — Camera Map

Features:
- Leaflet map centered on Bundaran HI.
- Camera markers only for verified coordinates.
- Marker popup with name, provider, status, and “View camera” action.
- Filter by provider and location.
- Search/radius control may be added if it can be implemented accurately.
- Mark approximate coordinates as approximate in both UI and data.
- Do not invent camera coordinates.

Suggested initial map center (map center only, not a camera coordinate): approximately Bundaran HI, Jakarta. Verify the map center as needed.

### `/cameras` — Camera Directory

Features:
- Searchable list/table of registered cameras.
- Filters for provider, area, and integration type.
- Sort by name or status.
- Display last-checked time where available.
- External source action.
- Empty and no-results states.

### `/camera/:id` — Camera Detail

Features:
- Main player or explicit external-only fallback.
- Camera name and location.
- Provider attribution.
- Integration type and status.
- Last checked timestamp if real.
- Original-source action.
- Related cameras nearby only when their coordinates are known.

### `/about` — About and Sources

Explain:
- HI VISION is an independent aggregator, not an official government service.
- Sources are operated by third parties.
- Availability and terms can change.
- Link to the original source and provide attribution.
- No claim of official affiliation.

---

## 6. Data Model

Create a typed camera model, for example in `src/types/camera.ts`:

```ts
export type CameraStatus =
  | "online"
  | "offline"
  | "unknown"
  | "restricted"
  | "degraded";

export type CameraSourceType =
  | "hls"
  | "embed"
  | "external";

export interface Camera {
  id: string;
  name: string;
  locationLabel: string;
  area: string;
  provider: string;
  sourceUrl: string;
  sourceType: CameraSourceType;
  status: CameraStatus;
  latitude?: number;
  longitude?: number;
  coordinatesApproximate?: boolean;
  streamUrl?: string;
  embedUrl?: string;
  attribution?: string;
  lastCheckedAt?: string;
  statusNote?: string;
}
```

Rules:
- `sourceUrl` must be the original public provider page.
- `streamUrl` may only be populated when the provider makes the stream available for permitted use and it has been verified.
- `embedUrl` may only be populated when embedding is supported and tested.
- Never commit API keys, credentials, session cookies, or private tokens.
- Do not use a fabricated stream URL.
- Default unverified camera status to `unknown`.
- Do not invent camera names, coordinates, or viewing directions.

Create `src/data/cameras.ts` for the initial registry. Seed only source entries that have actually been verified; otherwise clearly mark them unverified and default to external/unknown.

---

## 7. Player and Integration Logic

Create a reusable `CameraPlayer` component with explicit handling for each source type.

### HLS

- Use HLS.js only when a permitted, verified HLS URL exists.
- Detect native HLS support where appropriate.
- Handle loading, playback errors, retry, and cleanup of HLS instances on unmount/source change.
- Do not log sensitive URLs or tokens.
- Do not add a proxy to bypass CORS or provider restrictions.

### Embed

- Use an iframe only when the provider allows embedding.
- Use an appropriate `title`, responsive sizing, and a restrictive `sandbox`/permissions configuration compatible with the provider’s documented requirements.
- Do not attempt to defeat `X-Frame-Options` or Content Security Policy restrictions.
- If embedding is blocked, show the external-source fallback.

### External

- Display a clear source card with provider, location, and a button such as “Open original camera”.
- Open in a new tab using `target="_blank"` and `rel="noopener noreferrer"`.
- Do not represent an external page as an in-app live video.

### Status semantics

Keep player state separate from source availability status. For example, an iframe failing to render does not establish that the source camera is offline.

Show “Last checked” only if an actual check occurred and the timestamp is stored. If no valid check exists, omit it or show “Not checked”.

---

## 8. Camera Status and Refresh

For MVP:
- Status defaults to `unknown`.
- A user-triggered retry is allowed for HLS and embed players.
- External links should not be falsely reported as online based on a page-load guess.
- Do not claim real-time monitoring from a static registry.

If adding automated health checks later:
- Use only provider-approved public health-check mechanisms.
- Respect rate limits and terms.
- Use modest intervals and concurrency.
- Store check time and result.
- Distinguish `page_reachable`, `stream_playable`, and `status_unknown` where appropriate.
- Treat stale checks as stale rather than current.
- Avoid unnecessary requests to third-party sources.

---

## 9. Suggested Project Structure

Adapt this to the existing repository rather than overwriting established conventions.

```text
hi-vision/
├── docs/
│   ├── blueprint.md
│   └── source-audit.md
├── public/
│   └── favicon.svg
├── src/
│   ├── app/
│   │   └── router.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppSidebar.tsx
│   │   │   ├── Topbar.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── camera/
│   │   │   ├── CameraCard.tsx
│   │   │   ├── CameraPlayer.tsx
│   │   │   ├── CameraGrid.tsx
│   │   │   ├── CameraStatus.tsx
│   │   │   └── CameraDetail.tsx
│   │   └── map/
│   │       └── CameraMap.tsx
│   ├── data/
│   │   └── cameras.ts
│   ├── hooks/
│   │   ├── useCameras.ts
│   │   └── useCameraStatus.ts
│   ├── lib/
│   │   ├── camera-utils.ts
│   │   └── stream-utils.ts
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── MapPage.tsx
│   │   ├── CamerasPage.tsx
│   │   ├── CameraDetailPage.tsx
│   │   └── AboutPage.tsx
│   ├── types/
│   │   └── camera.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .env.example
├── package.json
└── README.md
```

---

## 10. Implementation Phases

### Phase 0 — Inspect repository

Before changing files:
1. Inspect the current directory and existing app.
2. Identify package manager, scripts, framework, and current conventions.
3. Preserve working code and avoid destructive rewrites.
4. Confirm whether the project is new or existing.

### Phase 1 — Source audit

1. Open each candidate provider page manually.
2. Verify whether the camera page is accessible.
3. Test supported embedding/streaming only through permitted means.
4. Document the result in `docs/source-audit.md`.
5. If no direct in-app playback is permitted, implement the external fallback and continue. Do not block all progress on stream access.

### Phase 2 — App foundation and design system

1. Set up or adapt React/Vite/TypeScript/Tailwind.
2. Add routing.
3. Define tokens and global styles.
4. Implement sidebar, topbar, and responsive layout.
5. Build loading, error, empty, and unknown states.

### Phase 3 — Camera registry and player

1. Define types and seed verified source metadata.
2. Build `CameraCard`, `CameraGrid`, and `CameraPlayer`.
3. Implement HLS, permitted embed, and external variants.
4. Add retry, loading, and error handling.
5. Add source attribution and original-source actions.

### Phase 4 — Directory and map

1. Build camera directory and filters.
2. Add Leaflet map.
3. Render only verified coordinates.
4. Connect map selection to camera detail.
5. Test mobile map interactions.

### Phase 5 — Quality and deployment

1. Run lint and TypeScript checks.
2. Run production build.
3. Test all routes and error states.
4. Test at desktop and mobile widths.
5. Verify external links and attribution.
6. Verify no fake stream or status is presented as real.
7. Add README setup instructions and known limitations.
8. Deploy to the configured hosting provider if credentials and permissions are available; otherwise provide deployment instructions.

---

## 11. Acceptance Criteria

The MVP is complete only when:

- [ ] App starts locally using documented commands.
- [ ] Production build passes.
- [ ] Dashboard, map, directory, detail, and about routes work.
- [ ] Camera list is driven by typed data, not duplicated hardcoded UI.
- [ ] Search and provider/location filters work.
- [ ] Camera cards handle loading, error, unknown, external, and playable states.
- [ ] At least one real camera is shown in-app **if a provider-supported stream/embed is available**.
- [ ] Every unsupported camera has a functional original-source fallback.
- [ ] The UI does not fabricate video, online status, last-checked timestamps, counts, or traffic metrics.
- [ ] Map only uses verified coordinates and labels approximate coordinates.
- [ ] All provider sources are attributed.
- [ ] The interface is usable at 360px mobile width and desktop.
- [ ] No secrets or private tokens are present in client code.
- [ ] No access-control circumvention, unauthorized recording, or person-identification feature exists.
- [ ] `docs/source-audit.md` documents verified sources and limitations.
- [ ] README documents setup, architecture, source limitations, and deployment.

If no provider currently supports direct playback, the app can still pass the structural MVP criteria using a clear external-source fallback, but the final report must explicitly say that in-dashboard live playback remains unverified or unavailable.

---

## 12. Testing Checklist

### Functional
- Search by camera name and area.
- Filter by provider and source type.
- Navigate from map marker to camera detail.
- Open provider source in a new tab.
- Handle invalid/missing camera IDs.
- Test each player state.
- Verify layout changes for 1/2/4-camera modes.

### Accessibility and responsive behavior
- Keyboard navigation and visible focus.
- Buttons have accessible labels.
- Iframes have descriptive titles.
- Status is not communicated by color alone.
- No horizontal overflow at 360px.
- Reduced-motion preference is respected.

### Reliability
- Simulate a broken HLS URL in development only.
- Test blocked iframe fallback.
- Test provider unreachable and unknown status.
- Verify cleanup of media player resources.
- Confirm no endless retry loops or excessive network polling.

### Security and privacy
- No secrets in source code.
- External links use `noopener noreferrer`.
- No proxying to bypass provider restrictions.
- No face recognition or identity tracking.
- No recording or redistribution without authorization.

---

## 13. Deliverables from the Execution Agent

At completion, provide:

1. Working application code.
2. `docs/source-audit.md` with source-by-source findings.
3. Updated `README.md`.
4. Summary of implemented features.
5. Exact local run/build/test commands and their results.
6. List of actual camera sources tested, their integration mode, and limitations.
7. Known issues and recommended next steps.
8. Deployment URL only if deployment was actually completed.

Do not report tests as passed unless they were run. Do not claim live stream support without testing the actual permitted source in the target browser.

---

## 14. Execution Instruction

**Begin by inspecting the repository and auditing the CCTV sources. Then implement the MVP end-to-end.**

Make reasonable implementation decisions without pausing for nonessential questions. Preserve existing project conventions where possible. Prioritize a complete, polished, functional dashboard over unnecessary complexity. Never replace real stream integration with fake footage or fabricated live data. If a source cannot be embedded legitimately, implement a clear external-source fallback and document the limitation.
