import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useReactToStatus } from "../hooks/useQueries";
import type { ExternalBlob, StatusUpdate } from "../hooks/useQueries";
import { formatRelativeTime } from "../utils/formatting";
import { UserAvatar } from "./UserAvatar";

const QUICK_REACTIONS = [
  "\ud83d\udc4d",
  "\u2764\ufe0f",
  "\ud83d\ude02",
  "\ud83d\ude2e",
  "\ud83d\udd25",
];
const AUTO_ADVANCE_MS = 6000;

interface StatusViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statuses: StatusUpdate[];
  initialIndex?: number;
  authorName?: string;
  authorAvatar?: ExternalBlob | null;
}

export function StatusViewer({
  open,
  onOpenChange,
  statuses,
  initialIndex = 0,
  authorName,
  authorAvatar,
}: StatusViewerProps) {
  const [current, setCurrent] = useState(initialIndex);
  const { mutate: reactToStatus } = useReactToStatus();
  const { identity } = useInternetIdentity();
  const [localStatuses, setLocalStatuses] = useState(statuses);
  const [poppedEmoji, setPoppedEmoji] = useState<string | null>(null);
  const popTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // Sync local state when props change (e.g. query refetch)
  useEffect(() => {
    setLocalStatuses(statuses);
  }, [statuses]);

  const status = localStatuses[current];
  const total = localStatuses.length;

  const goNext = useCallback(() => {
    if (current < total - 1) {
      setCurrent((c) => c + 1);
    } else {
      onOpenChange(false);
    }
  }, [current, total, onOpenChange]);

  const goPrev = useCallback(() => {
    if (current > 0) {
      setCurrent((c) => c - 1);
    }
  }, [current]);

  // Reset on open
  useEffect(() => {
    if (open) setCurrent(initialIndex);
  }, [open, initialIndex]);

  // Auto-advance timer
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(goNext, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [open, current, goNext]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, goNext, goPrev, onOpenChange]);

  const handleReact = (emoji: string) => {
    if (!status) return;

    // Pop animation
    clearTimeout(popTimerRef.current);
    setPoppedEmoji(emoji);
    popTimerRef.current = setTimeout(() => setPoppedEmoji(null), 300);

    // Optimistic update
    const principal = identity?.getPrincipal();
    if (principal) {
      setLocalStatuses((prev) =>
        prev.map((s) =>
          s.id === status.id
            ? {
                ...s,
                reactions: [
                  ...s.reactions,
                  [principal, emoji] as [typeof principal, string],
                ],
              }
            : s,
        ),
      );
    }

    reactToStatus(
      { statusId: status.id, emoji },
      {
        onSuccess: () => toast(`Reacted with ${emoji}`, { duration: 1500 }),
        onError: () => {
          toast.error("Failed to react");
          setLocalStatuses(statuses);
        },
      },
    );
  };

  if (!status) return null;

  const displayName = authorName ?? "Status";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 bg-slate-900 border-none overflow-hidden [&>button]:hidden">
        {/* Progress bars */}
        <div className="flex gap-1 px-3 pt-3">
          {localStatuses.map((s, i) => (
            <div
              key={String(s.id)}
              className="flex-1 h-0.5 rounded-full bg-white/20 overflow-hidden"
            >
              <div
                className={cn(
                  "h-full bg-white rounded-full transition-all",
                  i < current && "w-full",
                  i === current && "animate-status-progress",
                  i > current && "w-0",
                )}
                style={
                  i === current
                    ? {
                        animation: `status-progress ${AUTO_ADVANCE_MS}ms linear forwards`,
                      }
                    : undefined
                }
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-2 pb-3">
          <UserAvatar
            name={displayName}
            avatarBlob={authorAvatar ?? null}
            className="h-8 w-8"
            fallbackClassName="bg-white/15 text-white text-xs"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {displayName}
            </p>
            <p className="text-[11px] text-white/50">
              {formatRelativeTime(status.postedAt)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="relative min-h-[280px] flex items-center justify-center px-8 py-6">
          {/* Tap zones for prev/next */}
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-0 top-0 w-1/3 h-full z-10"
            aria-label="Previous"
          />
          <button
            type="button"
            onClick={goNext}
            className="absolute right-0 top-0 w-1/3 h-full z-10"
            aria-label="Next"
          />

          <p className="text-white text-xl text-center leading-relaxed font-medium">
            {status.content}
          </p>

          {/* Navigation hints */}
          {current > 0 && (
            <ChevronLeft className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          )}
          {current < total - 1 && (
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          )}
        </div>

        {/* Reaction badges for current status */}
        {status.reactions.length > 0 && (
          <div className="flex justify-center gap-1 px-4 -mt-2 mb-1">
            {status.reactions.slice(0, 5).map(([, emoji]) => (
              <span
                key={emoji}
                className="text-sm bg-white/10 rounded-full px-1.5 py-0.5"
              >
                {emoji}
              </span>
            ))}
            {status.reactions.length > 5 && (
              <span className="text-xs text-white/50 self-center ml-1">
                +{status.reactions.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Quick reactions */}
        <div className="flex justify-center gap-2 px-4 pb-5">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              type="button"
              key={emoji}
              onClick={() => handleReact(emoji)}
              className={cn(
                "w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg transition-colors",
                poppedEmoji === emoji && "animate-emoji-pop",
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
