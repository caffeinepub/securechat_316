import { cn } from "@/lib/utils";
import { ConversationType } from "../hooks/useQueries";
import type { ConversationPreview, ExternalBlob } from "../hooks/useQueries";
import { formatTimestamp, isOnline } from "../utils/formatting";
import { UserAvatar } from "./UserAvatar";

interface ConversationItemProps {
  conversation: ConversationPreview;
  onClick: () => void;
}

export function getConversationName(conv: ConversationPreview): string {
  const gi = conv.groupInfo;
  if (gi && "name" in gi) {
    return (gi as { name: string }).name;
  }
  if (conv.members && conv.members.length > 0) {
    return conv.members[0].name;
  }
  return "Chat";
}

export function ConversationItem({
  conversation,
  onClick,
}: ConversationItemProps) {
  const name = getConversationName(conversation);
  const unread = Number(conversation.unreadCount);
  const isGroup = conversation.conversationType === ConversationType.Group;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors duration-100",
        "hover:bg-accent text-left",
        unread > 0 && "bg-accent/50",
      )}
    >
      <div className="relative shrink-0">
        <UserAvatar
          name={name}
          avatarBlob={
            isGroup
              ? ((conversation.groupInfo as { avatar?: ExternalBlob | null })
                  ?.avatar ?? null)
              : (conversation.members?.[0]?.avatar ?? null)
          }
          className="h-11 w-11"
          fallbackClassName={cn(
            "text-sm",
            isGroup
              ? "bg-secondary text-secondary-foreground"
              : "bg-primary/15 text-primary",
          )}
        />
        {!isGroup &&
          conversation.members?.[0]?.lastSeen &&
          isOnline(conversation.members[0].lastSeen) && (
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
          )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-sm truncate",
              unread > 0
                ? "font-semibold text-foreground"
                : "font-medium text-foreground",
            )}
          >
            {name}
          </span>
          {conversation.lastMessageTime && (
            <span
              className={cn(
                "text-[11px] shrink-0",
                unread > 0
                  ? "text-primary font-medium"
                  : "text-muted-foreground",
              )}
            >
              {formatTimestamp(conversation.lastMessageTime)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground truncate">
            {conversation.lastMessageTime
              ? formatTimestamp(conversation.lastMessageTime)
              : "No messages yet"}
          </span>
          {unread > 0 && (
            <span className="shrink-0 min-w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1.5">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
