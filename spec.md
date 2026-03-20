# SecureChat

## Current State
Groups can be created and managed by admins. The Group Info panel includes Edit, Add Members, Members list, and Leave Group. There is no way to delete a group entirely. The backend has `leaveGroup` and cleanup logic but no `deleteGroup` function.

## Requested Changes (Diff)

### Add
- `deleteGroup` backend function: admin-only, wipes all group data (conversation, messages, members, threads, group keys, removes from all members' conversation lists)
- `useDeleteGroup` frontend mutation hook
- Delete Group button in GroupInfoPanel, below Leave Group section with a visual separator
- Confirmation AlertDialog before deletion with strong warning copy

### Modify
- `GroupInfoPanel.tsx`: add delete button (admin-only), confirmation dialog, and handler
- `useQueries.ts`: add `useDeleteGroup` mutation

### Remove
- Nothing

## Implementation Plan
1. Add `deleteGroup` public shared function to `main.mo` -- checks caller is admin, removes: conversationMessages, conversationMembers (all members), userConversations entry for each member, groupThreads, group keys, and the conversation itself
2. Add `useDeleteGroup` mutation to `useQueries.ts` calling `actor.deleteGroup(conversationId)`
3. In `GroupInfoPanel.tsx`: import hook, add `showDeleteConfirm` state, add Delete Group button below Leave Group with a `<Separator />` and red destructive styling, add AlertDialog with strong warning message, on confirm call deleteGroup and close panel
