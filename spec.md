# SecureChat - Voice Notes

## Current State
- Chat supports Text, Image, File, Video message types
- Backend already has `#Audio` in the `MessageType` variant and `mediaBlob`/`mediaName`/`mediaSize` fields on Message
- `backend.d.ts` already has `Audio = "Audio"` in the MessageType enum
- Audio messages currently route to `FileMessage` component (download-only) via `isFileType` check
- ChatView accepts `audio/*` files via file input already
- ExternalBlob pattern (fromBytes + getDirectURL) is used for all media uploads
- Three-tier subscription: Free, Plus ($3/mo), Pro ($12/mo)

## Requested Changes (Diff)

### Add
- `VoiceMessage.tsx` component: inline audio player with `<audio controls>`, showing duration and a waveform-style progress bar
- Microphone record button in `ChatView.tsx` message input area (alongside the existing attachment/send buttons)
- Recording UI state: idle → recording (with live timer) → review (play before send) → sending
- Client-side duration enforcement per tier: Free = 30s, Plus = 120s, Pro = 300s (auto-stops recording at limit)
- Uses browser `MediaRecorder` API with `audio/webm;codecs=opus` format
- On stop/send: creates `ExternalBlob.fromBytes(uint8Array)` with `messageType = { Audio: null }`, sends via existing `sendMessage` mutation

### Modify
- `MessageBubble.tsx`: route `messageType === "Audio"` to new `VoiceMessage` component instead of `FileMessage`
- `ChatView.tsx`: add mic button, recording state management, tier-based duration cap

### Remove
- Nothing removed

## Implementation Plan
1. Create `VoiceMessage.tsx` - inline audio player using `<audio>` element, show filename/duration, styled to match existing message bubbles
2. Update `MessageBubble.tsx` - separate Audio from File in type detection, render VoiceMessage for Audio type
3. Update `ChatView.tsx`:
   - Add mic icon button next to send button
   - Manage recording state (idle/recording/reviewing)
   - Use MediaRecorder API to capture audio
   - Show live elapsed timer during recording
   - Auto-stop at tier limit (30s/120s/300s) - use Free tier (30s) as default since subscription system not yet fully wired
   - On send: convert blob to Uint8Array, wrap in ExternalBlob, call sendMessage with Audio type
   - Show upload progress same as existing media
