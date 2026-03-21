# SecureChat -- DTN Phase 1 Steps 7-9

## Current State
Steps 1-6 of DTN Phase 1 are deployed (v50). The backend has all 8 optional DTN fields on `Message`, `getMessagesSince`, and UUID deduplication. Four new frontend files exist: `messageStore.ts`, `dtnEnvelope.ts`, `transport.ts`, `useSync.ts`. These are not yet consumed by `ChatView.tsx`. Dead code still present: `threadStorage.ts`, nested declarations folders, `ui-summary.json`, debug screenshots in `public/assets/`.

## Requested Changes (Diff)

### Add
- Offline badge in `ChatView` header showing when `isOnline === false` from `useSync`
- Outbox count indicator (small badge on send button when outbox has pending items)
- Service worker at `public/sw.js` for offline shell caching
- Service worker registration in `main.tsx`

### Modify
- `ChatView.tsx`: import and initialize `useSync`; route text-only message sends through `buildEnvelope()` + `useSync.sendMessage()`; media/voice/file sends continue using legacy `useSendMessage` (media cannot be DTN-relayed); show offline badge from `isOnline`; show outbox pending count on send button when > 0
- Keep using `useMessages` for message display for now (avoids type mismatch between LocalMessage and Message); `useSync` runs in parallel and populates IndexedDB in the background

### Remove
- `src/utils/threadStorage.ts` (dead code -- threads feature removed)
- `src/declarations/declarations/` nested duplicate folder
- `src/declarations/declarations/declarations/` double-nested duplicate
- `src/ui-summary.json` (build artefact)
- Debug screenshots from `public/assets/`: all .png and .jpg files that are not generated assets

## Implementation Plan
1. Modify `ChatView.tsx`:
   - Import `useSync` from `../hooks/useSync`
   - Import `buildEnvelope` from `../utils/dtnEnvelope`
   - Initialize `useSync` with `conversation.id`
   - In `handleSend`: for text-only messages (no pendingFile), use `buildEnvelope()` + `useSync.sendMessage()` instead of `sendMessage` mutation; for media, keep legacy path
   - Add offline badge in header (amber dot + "Offline" text) when `!isOnline`
   - Show outbox count on send button when `outboxCount > 0`
   - Keep `useMessages` + `useSendMessage` imports; legacy path still needed for media
2. Create `public/sw.js` -- cache-first service worker for app shell assets
3. Add service worker registration to `main.tsx`
4. Delete dead code files (handled outside frontend agent)
