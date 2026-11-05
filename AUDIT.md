# AUDIT.md — NextStation / aglaStation System Audit

**Date:** 2026-11-05  
**Role:** Senior Product Designer & Senior Full-Stack Engineer  
**Objective:** Comprehensive end-to-end evaluation of the current state of aglaStation before implementing Phases 1–6.

---

## 1. Executive Summary

aglaStation (NextStation) is envisioned as a Delhi Metro synchronized listening and social commute PWA. Commuters select a line and direction, and everyone in that virtual train car hears the exact same song at the exact same second, advancing synchronously station by station. Commuters can see co-riders, exchange one-on-one chat requests, and discover hyper-local station sponsors.

While the fundamental real-time scaffolding (Socket.io NTP clock sync, state broadcast, basic chat) exists, the current implementation suffers from:
1. **Critical server-side security, room lifecycle, and privacy leaks** (broadcasting chat termination to all users, exposing raw socket IDs as rider IDs, unvalidated room creation, unauthenticated dev triggers).
2. **Generic, template-like UI artifacts** (neon accent glows, dark-mode cyberpunk aesthetic, repetitive "0 aboard" labels, inconsistent typography, and un-anchored route visualization).
3. **Incomplete route and journey progression** (hardcoded 2-minute loops, unused destination station logic, missing terminus-to-terminus reversing behavior, and unvetted music catalogs).

---

## 2. What Exists & Architecture Overview

The monorepo consists of three core packages:
* **`shared/` (`agla-station-shared`)**:
  - `types.ts`: TypeScript interfaces for `MetroLine`, `Station`, `Track`, `RoomStatePayload`, `JoinRoomPayload`, `ChatMessagePayload`, `PresenceUpdatePayload`, etc.
  - `events.ts`: Constant map of socket events (`room:join`, `station:advance`, `chat:request`, etc.).
* **`server/` (`agla-station-server`)**:
  - Built with Express, Socket.io, TypeScript, and `ts-node-dev`.
  - `server.ts` & `config.ts`: HTTP and WebSocket server initialization.
  - `services/roomManager.ts`: Manages active line/direction rooms (`ActiveRoom`) with a default 120s timer advancing station index modulo station count.
  - `services/presenceService.ts`: Tracks active socket IDs, anonymous name generation (`Anonymous Rider #1234`), and room member sets.
  - `services/chatService.ts`: In-memory tracking for chat requests, mutual block sets, active sessions, and simple word-filter moderation.
  - `services/trackService.ts`: Song selection mapped to stations, including support for a 100-track YouTube playlist for the Violet Line (`violet_tracks.json`).
  - `scripts/`: Test verification scripts (`simulate-clients.ts`, `verify-ui.js`, `verify-tabs.js`, `capture.js`).
* **`client/` (`client`)**:
  - Next.js 14 App Router (React 18, Tailwind CSS, Lucide Icons, Framer Motion).
  - PWA support via `manifest.ts`, `sw.js`, and `InstallPrompt.tsx`.
  - `context/SocketContext.tsx`: Manages socket connection and NTP clock offset calculation (`serverTime + rtt / 2 - clientNow`).
  - `hooks/useSync.ts`: Synchronizes room state, current station, track seek position calculation, and handles periodic 30s resync.
  - `hooks/useChat.ts`: Manages chat requests, multiple active DM sessions, unread badges, and blocking.
  - Components: `NowPlayingCard`, `VisualMetroMap`, `SelectionFlow`, `YouTubeAdapter`, `ChatDrawer`, `AudioGateModal`, `StationAdvanceToast`.

---

## 3. What is Broken & Security / Reliability Risks

### 3.1 Server Vulnerabilities & Architectural Defects
1. **Unprotected Dev Control in Production:** `station:advance_manual` socket event is exposed to any connected client without authentication or environment check. Any user can spam station skips for an entire line.
2. **Chat Disconnect Broadcast Leak:** In `server/src/sockets/handler.ts` line 234:
   ```typescript
   io.emit(SOCKET_EVENTS.CHAT_END, { chatId, reason: 'Participant disconnected' });
   ```
   `io.emit` broadcasts private chat terminations globally to every user across all metro lines instead of sending only to the specific chat partner.
3. **Room Switching Memory Leak & Socket Abandonment:** `room:leave` is never handled in socket handlers. When a client switches lines, the old socket room is never left (`socket.leave`), presence in the old room is not cleaned up, and empty rooms remain running on intervals indefinitely.
4. **Unvalidated Room Creation / Invalid Payloads:** `RoomManager.getOrCreateRoom()` accepts arbitrary lineId/direction strings. If an invalid or malicious payload is passed, it creates rogue timer loops. It does not validate station IDs or order against `lines.json`.
5. **Chat Request Spam & Missing Expiration:**
   - Pending chat requests never expire (no 60s TTL cleanup).
   - A single client can spam infinite requests to multiple riders (no limit on max pending requests per user, no rate limit on requests).
   - Cross-room chat targeting is not validated; a user in `yellow:up` can target a user in `violet:down`.
6. **Privacy Leakage in Presence Updates:**
   - The user's raw `socket.id` is sent to other clients as their user identifier.
   - Boarding station IDs (`rider.stationId`) are broadcast in presence payloads to all clients, allowing physical tracking of users.
7. **Trivial Moderation & Memory-Only Reports:**
   - Word filter is a rudimentary list of 5 static English words (`['badword', 'curse', 'abuse', 'hate', 'spam']`). Hindi/Hinglish profanities and Unicode leetspeak/substitutions are completely unhandled.
   - Reports are stored in an in-memory array (`this.reports = []`) and discarded on restart. No mute threshold (e.g. 3 reports $\rightarrow$ mute session).
8. **CORS and Configuration Vulnerabilities:**
   - `CORS_ORIGIN` defaults to `*` wildcard in `server/src/config.ts`.
   - No connection rate-limiting or join rate-limiting.

### 3.2 Journey & Audio Sync Bugs
1. **Destination Station Ignored:** Client sends `destStationId` during boarding, but neither the server nor client tracks arrival at the destination. The rider loops continuously past their station.
2. **Infinite 2-Minute Modulo Loop:** The train runs on a rigid, hardcoded 120-second timer and abruptly wraps from the terminus back to index 0 rather than honoring terminus reversal or individual station segment durations.
3. **Audio Cutoff & Desync on Mobile:**
   - Songs are abruptly truncated or looped without taking into account station travel time (`startOffsetSec` and `playSec` are missing).
   - YouTube mobile browser restrictions cause "Video unavailable" errors on raw IPs or copyright-restricted tracks. No client-to-server error reporting (`track:error`) or automated fallback mechanism exists.
4. **Artificial / Zero Presence Counters:** Per-station listener counts show `0 aboard` or awkward empty indicators.

---

## 4. What is Generic-Looking (Design & UI Audit)

1. **AI-Generated / Cyberpunk Dark Mode Cliches:**
   - Dark backgrounds with high-contrast neon borders (`#00A650`, glowing green badges, bright yellow gradients).
   - Excessive micro-borders (`border-[#2A2A2A]`), small floating pill cards with drop shadows that look like generic SaaS dashboards rather than rapid-transit signage.
2. **Unauthentic Delhi Metro Visual Language:**
   - Real DMRC signage uses high-contrast, clean wayfinding panels: bold Devanagari script placed prominently with English beneath in clean sans-serif (e.g., Kruti Dev / Noto Sans Devanagari paired with clean Helvetica/Noto sans).
   - Real trains use physical LED/strip dynamic maps that show solid illuminated segments for passed stations and blinking/distinct segments for upcoming stations. The current UI uses a generic SVG bezier curve or zigzag listing that looks like a web design exercise.
3. **Inconsistent Typography:**
   - Mixed font families without dedicated Devanagari font stacks.
   - Monospace and tracked-out micro-labels ("NOW PLAYING", "LINE", "STATION").
4. **Poor Mobile Ergonomics:**
   - Tap targets under 44px on key controls (switching tabs, audio unlock, chat buttons).
   - Key information is scattered across nested modals and drawers rather than an intuitive vertical one-handed layout.
5. **Generic States & Copy:**
   - Copy reads like standard web templates ("Select Line", "Join the ride", "Online/Offline") rather than the calm, authoritative voice of Delhi Metro public information systems ("Next Station: Rajiv Chowk / अगला स्टेशन: राजीव चौक", "Platform doors will open on the left").

---

## 5. Implementation Roadmap (Phases 1 to 6)

* **Phase 1: Server Fixes & Hardening** — Dev gates, scoped chat disconnects, room:leave handling, line/station validation, request limits & TTL, Unicode/Hinglish moderation, persistent reports store, privacy masking (opaque IDs), production CORS & rate limits.
* **Phase 2: Journey Logic** — Destination arrival state, station countdowns, interstation schedules, terminus reversal, `startOffsetSec`/`playSec`, and automated fallback on track errors.
* **Phase 3: Data Integrity** — Complete 10 Delhi Metro lines with official DMRC station lists, interchange IDs, accurate DMRC line hex colors, and curated royalty-free/independent music catalogue.
* **Phase 4: Hyper-Local Sponsors & Analytics** — `sponsors.json`, discreet station arrival sponsor card, and privacy-preserving aggregate telemetry.
* **Phase 5: Metro-Authentic UI/UX Redesign** — Delivery-style vertical live route strip, equal Devanagari typography, contrast-compliant DMRC color palettes, platform display player, mobile one-handed layout, authentic system states.
* **Phase 6: Verification & Hardening** — Updating automated test scripts, multi-client simulation (20+ riders), room-switching validation, and production build checks.
