# SecureChat

## Current State
GroupThreadsAccordion uses shadcn Accordion component which appears to not render in production (dark mode / mobile). The threads section is invisible to users despite being in the code.

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- Replace `GroupThreadsAccordion` accordion-based UI with a plain always-visible threads section (no collapsible). Keep same functionality: list threads, admin can create/delete, clicking a thread opens it.

### Remove
- Accordion component dependency from GroupThreadsAccordion

## Implementation Plan
- Rewrite `GroupThreadsAccordion.tsx` to use a simple div-based layout instead of shadcn Accordion
- Always show threads list expanded
- Keep all existing logic (useGroupThreads, useCreateGroupThread, useDeleteGroupThread, isAdmin controls, onOpenThread callback)
