import { Button } from "@/components/ui/button";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  useAcceptContactRequest,
  useRejectContactRequest,
} from "../hooks/useQueries";
import type { PublicProfile } from "../hooks/useQueries";
import { UserAvatar } from "./UserAvatar";

interface PendingRequestItemProps {
  profile: PublicProfile;
}

export function PendingRequestItem({ profile }: PendingRequestItemProps) {
  const { mutate: accept, isPending: isAccepting } = useAcceptContactRequest();
  const { mutate: reject, isPending: isRejecting } = useRejectContactRequest();
  const isPending = isAccepting || isRejecting;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-accent/50">
      <UserAvatar
        name={profile.name}
        avatarBlob={profile.avatar ?? null}
        className="h-10 w-10 shrink-0"
        fallbackClassName="text-xs"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{profile.name}</p>
        <p className="text-xs text-muted-foreground">Wants to connect</p>
      </div>
      <div className="flex gap-1.5">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() =>
            reject(profile.principal.toString(), {
              onSuccess: () => toast.success("Request rejected"),
              onError: () => toast.error("Failed to reject"),
            })
          }
          disabled={isPending}
        >
          <X className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          className="h-8 w-8"
          onClick={() =>
            accept(profile.principal.toString(), {
              onSuccess: () => toast.success("Contact added!"),
              onError: () => toast.error("Failed to accept"),
            })
          }
          disabled={isPending}
        >
          {isAccepting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
