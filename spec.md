# RelayNet

## Current State
- `index.html` has `<title>SecureChat</title>` — wrong brand name shows in browser tab
- `AppShell.tsx` desktop sidebar uses a teal `Lock` icon as the logo — no RelayNet identity
- `SettingsPage.tsx` About section label reads "SecureChat" with generic description
- `index.css` app shell CSS variables use teal/green palette (--primary: teal, sidebar: deep teal) — inconsistent with the dark ops aesthetic of the landing page which uses amber/ochre accents on near-black slate
- `LandingPage.tsx` is already correctly branded RelayNet ✓

## Requested Changes (Diff)

### Add
- RelayNet ops color palette across the app shell: near-black background, dark slate surfaces, amber/ochre primary accent (matching landing page `oklch(0.72 0.12 85)` amber)
- RelayNet wordmark / relay logo icon in the desktop sidebar (replacing Lock icon)

### Modify
- `index.html`: `<title>SecureChat</title>` → `<title>RelayNet</title>`
- `AppShell.tsx` desktop sidebar logo: `Lock` icon in teal square → relay CSS icon (matching landing nav) with no background pill; optionally add small "RELAYNET" mono wordmark below
- `SettingsPage.tsx` About section: label "SecureChat" → "RelayNet"; description "Private messaging on the Internet Computer" → "Unkillable communication infrastructure"
- `index.css` CSS variable tokens: update both `:root` (light) and `.dark` blocks — primary accent from teal to amber/ochre, sidebar from deep-teal to near-black slate; keep readability and contrast intact

### Remove
- Nothing removed

## Implementation Plan
1. Update `index.html` title to "RelayNet"
2. Update `index.css` CSS variable tokens — light mode primary to amber, dark mode primary to amber, sidebar background to near-black slate family, sidebar accent to amber tint
3. Update `AppShell.tsx` sidebar logo — replace Lock icon + teal square with the relay-logo-icon CSS element (already defined in index.css) plus a small mono wordmark
4. Update `SettingsPage.tsx` About section label and description
