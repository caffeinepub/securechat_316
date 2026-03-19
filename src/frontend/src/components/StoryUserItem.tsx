import { cn } from "@/lib/utils";
import type {
  ExternalBlob,
  PublicProfile,
  StatusUpdate,
} from "../hooks/useQueries";
import { formatRelativeTime } from "../utils/formatting";
import { StatusRing } from "./StatusRing";

interface StoryUserItemProps {
  authorPrincipal: string;
  profile: PublicProfile | undefined;
  statuses: StatusUpdate[];
  onClick: () => void;
}

export function StoryUserItem({
  authorPrincipal,
  profile,
  statuses,
  onClick,
}: StoryUserItemProps) {
  const name = profile?.name ?? `${authorPrincipal.slice(0, 8)}...`;
  const avatar = (profile?.avatar ?? null) as ExternalBlob | null;
  const latestStatus = statuses[0];
  const statusCount = statuses.length;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl",
        "hover:bg-accent/80 active:bg-accent transition-colors text-left",
      )}
    >
      <StatusRing name={name} avatarBlob={avatar} hasUnviewed size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        <p className="text-[11px] text-muted-foreground">
          {statusCount > 1
            ? `${statusCount} updates`
            : formatRelativeTime(latestStatus.postedAt)}
        </p>
      </div>
      {latestStatus && (
        <p className="text-xs text-muted-foreground shrink-0">
          {formatRelativeTime(latestStatus.postedAt)}
        </p>
      )}
    </button>
  );
}
