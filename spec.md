# SecureChat

## Current State
- Users have a `Profile` type with `name`, `bio`, `avatar`, `lastSeen`, `email`, `emailVerified`, `twoFactorEnabled`
- `searchUsers` performs a case-insensitive name substring match against all users — no visibility filtering
- `addContactByPrincipal` allows adding any user by their II principal text
- Settings page has a "Privacy & Security" section with Blocked Users and Email Verification
- No `discoveryMode` field exists anywhere in the profile

## Requested Changes (Diff)

### Add
- `discoveryMode` variant field to `Profile` type: `#Open | #IdOnly | #Hidden`, default `#IdOnly`
- `updateDiscoveryMode(mode)` backend function so users can change their own setting
- Filtering in `searchUsers`: only return users whose `discoveryMode` is `#Open`
- Filtering in `addContactByPrincipal` / principal lookup: allow finding users whose `discoveryMode` is `#Open` or `#IdOnly`; block `#Hidden` users from being found at all
- `getDiscoveryMode()` query so the frontend can read the current user's setting
- Profile Visibility selector in Settings > Privacy & Security (three options: Open / ID only / Hidden)
- Toast notification in the app when the user saves a new visibility setting

### Modify
- `setProfile` must persist `discoveryMode` (not reset it on profile update)
- `PublicProfile` does NOT expose `discoveryMode` to other users

### Remove
- Nothing removed
 
## Implementation Plan
1. Add `discoveryMode` variant type to backend
2. Add field to `Profile` record with default `#IdOnly` for new and existing users
3. Add `getDiscoveryMode()` query function
4. Add `updateDiscoveryMode(mode)` update function
5. Filter `searchUsers` — only `#Open` users appear in name search
6. Filter principal-based lookup — `#Hidden` users cannot be found even by principal
7. Frontend: add `useDiscoveryMode` query hook and `useUpdateDiscoveryMode` mutation hook
8. Frontend: add visibility selector in Settings Privacy & Security section
9. Frontend: show toast on successful save
