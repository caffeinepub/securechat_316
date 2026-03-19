import type { StatusUpdate } from "../hooks/useQueries";
import { formatRelativeTime } from "../utils/formatting";
import { UserAvatar } from "./UserAvatar";

interface ContactStatusItemProps {
  status: StatusUpdate;
  onClick: () => void;
}

export function ContactStatusItem({ status, onClick }: ContactStatusItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent transition-colors text-left"
    >
      <UserAvatar
        name={status.author.toString()}
        avatarBlob={null}
        className="h-10 w-10 shrink-0"
        fallbackClassName="text-xs"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{status.content}</p>
        <p className="text-[11px] text-muted-foreground">
          {formatRelativeTime(status.postedAt)}
        </p>
      </div>
      {status.reactions && status.reactions.length > 0 && (
        <div className="flex gap-0.5">
          {status.reactions.slice(0, 3).map(([, emoji]) => (
            <span key={emoji} className="text-sm">
              {emoji}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
