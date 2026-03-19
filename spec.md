# SecureChat

## Current State
The app has both `:root` (light) and `.dark` (dark) CSS variable sets fully defined in `index.css`. There is no theme switching mechanism -- the app always renders in light mode. SettingsPage has Privacy & Security, Email Service, Data, and About sections plus a logout button.

## Requested Changes (Diff)

### Add
- `ThemeProvider` context (`src/frontend/src/hooks/useTheme.tsx`) that:
  - Manages theme state: `"light"`, `"dark"`, or `"system"`
  - On mount, reads saved preference from `localStorage` (key: `"theme"`); defaults to `"system"` if none saved
  - When `"system"`, applies `dark` class based on `window.matchMedia("(prefers-color-scheme: dark)")` and listens for changes
  - Applies/removes `dark` class on `<html>` element reactively
  - Saves preference to `localStorage` on change
- `ThemeToggle` component (inline in SettingsPage or separate) -- a 3-option toggle (Light / System / Dark) placed in a new "Appearance" section in SettingsPage, above Privacy & Security

### Modify
- `App.tsx`: wrap the app in `ThemeProvider`
- `SettingsPage.tsx`: add Appearance section with the theme toggle

### Remove
- Nothing

## Implementation Plan
1. Create `src/frontend/src/hooks/useTheme.tsx` with `ThemeProvider` and `useTheme` hook
2. Wrap app root in `ThemeProvider` in `App.tsx`
3. Add Appearance section to `SettingsPage.tsx` with a 3-way toggle (Light / System / Dark) using `ToggleGroup`
