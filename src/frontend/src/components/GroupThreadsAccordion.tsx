import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hash, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  useCreateGroupThread,
  useDeleteGroupThread,
  useGroupThreads,
} from "../hooks/useQueries";

interface GroupThreadsAccordionProps {
  parentGroupId: bigint;
  isAdmin: boolean;
  onOpenThread: (threadConversationId: bigint) => void;
  /** unreadCounts keyed by conversationId string */
  unreadCounts?: Record<string, number>;
}

export function GroupThreadsAccordion({
  parentGroupId,
  isAdmin,
  onOpenThread,
  unreadCounts = {},
}: GroupThreadsAccordionProps) {
  const { data: threads = [], isLoading } = useGroupThreads(parentGroupId);
  const { mutate: createThread, isPending: isCreating } =
    useCreateGroupThread();
  const { mutate: deleteThread, isPending: isDeleting } =
    useDeleteGroupThread();

  const [showInput, setShowInput] = useState(false);
  const [newThreadName, setNewThreadName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = () => {
    const name = newThreadName.trim();
    if (!name) return;
    createThread(
      { parentGroupId, name },
      {
        onSuccess: () => {
          setNewThreadName("");
          setShowInput(false);
        },
      },
    );
  };

  const handleDelete = (threadId: string) => {
    setDeletingId(threadId);
    deleteThread(
      { parentGroupId, threadId },
      {
        onSettled: () => setDeletingId(null),
      },
    );
  };

  return (
    <div data-ocid="group.threads.panel">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Threads
        </h3>
        {isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setShowInput((v) => !v)}
            data-ocid="group.threads.open_modal_button"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Inline new-thread input */}
      {showInput && isAdmin && (
        <div className="flex gap-2 mb-2" data-ocid="group.threads.dialog">
          <Input
            autoFocus
            placeholder="Thread name…"
            value={newThreadName}
            onChange={(e) => setNewThreadName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setShowInput(false);
                setNewThreadName("");
              }
            }}
            className="h-8 text-sm"
            data-ocid="group.threads.input"
          />
          <Button
            size="sm"
            className="h-8 px-3"
            onClick={handleCreate}
            disabled={isCreating || !newThreadName.trim()}
            data-ocid="group.threads.submit_button"
          >
            {isCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
          </Button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2
            className="h-4 w-4 animate-spin text-muted-foreground"
            data-ocid="group.threads.loading_state"
          />
        </div>
      )}

      {/* Empty state */}
      {threads.length === 0 && !isLoading && (
        <p
          className="text-xs text-muted-foreground py-2 px-1"
          data-ocid="group.threads.empty_state"
        >
          {isAdmin
            ? "No threads yet. Tap + to create one."
            : "No threads in this group yet."}
        </p>
      )}

      {/* Thread list */}
      <div className="space-y-0.5">
        {threads.map((thread, idx) => {
          const unread = unreadCounts[thread.id] ?? 0;
          const isBusy = isDeleting && deletingId === thread.id;
          return (
            <div
              key={thread.id}
              className="flex items-center gap-1 group/thread rounded-lg hover:bg-accent px-1"
              data-ocid={`group.threads.item.${idx + 1}`}
            >
              <button
                type="button"
                className="flex-1 flex items-center gap-2 py-2 text-left"
                onClick={() => onOpenThread(BigInt(thread.id))}
              >
                <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm truncate flex-1">{thread.name}</span>
                {unread > 0 && (
                  <Badge
                    variant="default"
                    className="h-4 min-w-4 px-1 text-[10px] font-bold rounded-full"
                  >
                    {unread > 99 ? "99+" : unread}
                  </Badge>
                )}
              </button>
              {isAdmin && (
                <button
                  type="button"
                  className="opacity-0 group-hover/thread:opacity-100 transition-opacity p-1 rounded hover:text-destructive"
                  onClick={() => handleDelete(thread.id)}
                  disabled={isBusy}
                  data-ocid={`group.threads.delete_button.${idx + 1}`}
                >
                  {isBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
