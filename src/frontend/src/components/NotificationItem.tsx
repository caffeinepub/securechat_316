import { cn } from "@/lib/utils";
import {
  AtSign,
  Heart,
  MessageSquare,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { formatRelativeTime } from "../utils/formatting";

interface NotificationItemProps {
  notification: {
    id: bigint;
    kind: string;
    timestamp: bigint;
    read: boolean;
    conversationId?: bigint;
    fromPrincipal?: unknown;
  };
  onClick: () => void;
}

const NOTIF_CONFIG: Record<
  string,
  { icon: typeof MessageSquare; label: string; color: string }
> = {
  NewMessage: {
    icon: MessageSquare,
    label: "sent you a message",
    color: "text-primary bg-primary/10",
  },
  Mention: {
    icon: AtSign,
    label: "mentioned you",
    color: "text-chart-3 bg-chart-3/10",
  },
  ContactRequest: {
    icon: UserPlus,
    label: "wants to connect",
    color: "text-chart-2 bg-chart-2/10",
  },
  ContactAccepted: {
    icon: UserCheck,
    label: "accepted your request",
    color: "text-emerald-600 bg-emerald-600/10",
  },
  GroupInvite: {
    icon: Users,
    label: "added you to a group",
    color: "text-chart-4 bg-chart-4/10",
  },
  StatusReaction: {
    icon: Heart,
    label: "reacted to your status",
    color: "text-rose-500 bg-rose-500/10",
  },
};

export function NotificationItem({
  notification,
  onClick,
}: NotificationItemProps) {
  const config = NOTIF_CONFIG[notification.kind] ?? NOTIF_CONFIG.NewMessage;
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
        notification.read ? "hover:bg-accent" : "bg-accent/60 hover:bg-accent",
      )}
    >
      <div
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
          config.color,
        )}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm truncate",
            !notification.read && "font-medium",
          )}
        >
          {config.label}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {formatRelativeTime(notification.timestamp)}
        </p>
      </div>
      {!notification.read && (
        <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
      )}
    </button>
  );
}
