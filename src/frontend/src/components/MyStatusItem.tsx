import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { PublicProfile, StatusUpdate } from "../hooks/useQueries";
import { useDeleteStatus } from "../hooks/useQueries";
import { formatRelativeTime } from "../utils/formatting";

interface MyStatusItemProps {
  status: StatusUpdate;
  reactorProfiles: Map<string, PublicProfile>;
}

export function MyStatusItem({ status, reactorProfiles }: MyStatusItemProps) {
  const { mutate: deleteStatus, isPending } = useDeleteStatus();

  const reactionGroups = new Map<string, number>();
  for (const [, emoji] of status.reactions) {
    reactionGroups.set(emoji, (reactionGroups.get(emoji) ?? 0) + 1);
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-accent/50">
      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{status.content}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[11px] text-muted-foreground">
            {formatRelativeTime(status.postedAt)}
          </p>
          {status.reactions.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground cursor-default">
                    {Array.from(reactionGroups.entries())
                      .slice(0, 3)
                      .map(([emoji, count]) => (
                        <span key={emoji}>
                          {emoji}
                          {count > 1 && count}
                        </span>
                      ))}
                    <span className="ml-0.5">
                      {status.reactions.length === 1
                        ? "1 reaction"
                        : `${status.reactions.length} reactions`}
                    </span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <div className="space-y-0.5">
                    {status.reactions.map(([principal, emoji]) => {
                      const name = reactorProfiles.get(
                        principal.toString(),
                      )?.name;
                      return (
                        <p key={principal.toString()} className="text-xs">
                          {emoji}{" "}
                          {name ?? `${principal.toString().slice(0, 12)}...`}
                        </p>
                      );
                    })}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={() =>
          deleteStatus(status.id, {
            onSuccess: () => toast.success("Status deleted"),
            onError: () => toast.error("Failed to delete"),
          })
        }
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}
