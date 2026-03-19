import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useBlockedUsers, useUnblockUser } from "../hooks/useQueries";
import { UserAvatar } from "./UserAvatar";

interface BlockedUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BlockedUsersDialog({
  open,
  onOpenChange,
}: BlockedUsersDialogProps) {
  const { data: blockedUsers = [], isLoading } = useBlockedUsers();
  const { mutate: unblock } = useUnblockUser();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Blocked Users</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && blockedUsers.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">
            No blocked users
          </p>
        )}

        {!isLoading && blockedUsers.length > 0 && (
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {blockedUsers.map((user) => (
              <div
                key={user.principal.toString()}
                className="flex items-center gap-3 px-2 py-2 rounded-lg"
              >
                <UserAvatar
                  name={user.name}
                  avatarBlob={user.avatar ?? null}
                  className="h-9 w-9"
                  fallbackClassName="bg-muted text-muted-foreground text-xs"
                />
                <p className="flex-1 text-sm font-medium truncate">
                  {user.name}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    unblock(user.principal.toString(), {
                      onSuccess: () => toast.success("User unblocked"),
                      onError: () => toast.error("Failed to unblock"),
                    })
                  }
                >
                  Unblock
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
