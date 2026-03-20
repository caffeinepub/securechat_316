/**
 * Thread storage utility — stores parent group → thread conversation relationships
 * in localStorage. Threads are regular group conversations; we just track which
 * conversations are "threads" under which parent group.
 */

export interface ThreadEntry {
  id: string; // conversationId as string
  name: string;
  createdAt: number;
}

const STORAGE_KEY = "securechat_group_threads";

function load(): Record<string, ThreadEntry[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(data: Record<string, ThreadEntry[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

export function getThreads(parentGroupId: string): ThreadEntry[] {
  const data = load();
  return data[parentGroupId] ?? [];
}

export function addThread(parentGroupId: string, thread: ThreadEntry): void {
  const data = load();
  const existing = data[parentGroupId] ?? [];
  data[parentGroupId] = [...existing, thread];
  save(data);
}

export function removeThread(parentGroupId: string, threadId: string): void {
  const data = load();
  if (!data[parentGroupId]) return;
  data[parentGroupId] = data[parentGroupId].filter((t) => t.id !== threadId);
  save(data);
}

/** Returns the parentGroupId for a given thread conversationId, if any */
export function getParentGroupId(threadConversationId: string): string | null {
  const data = load();
  for (const [parentId, threads] of Object.entries(data)) {
    if (threads.some((t) => t.id === threadConversationId)) {
      return parentId;
    }
  }
  return null;
}

/** Returns all known thread conversationIds (for filtering in the chat list) */
export function getAllThreadIds(): Set<string> {
  const data = load();
  const ids = new Set<string>();
  for (const threads of Object.values(data)) {
    for (const t of threads) {
      ids.add(t.id);
    }
  }
  return ids;
}
