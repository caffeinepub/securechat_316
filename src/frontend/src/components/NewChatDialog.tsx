import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import {
  ContactStatus,
  useContacts,
  useStartDirectChat,
} from "../hooks/useQueries";
import { UserAvatar } from "./UserAvatar";

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatStarted: (conversationId: bigint) => void;
}

export function NewChatDialog({
  open,
  onOpenChange,
  onChatStarted,
}: NewChatDialogProps) {
  const { data: contacts = [], isLoading } = useContacts();
  const { mutate: startChat, isPending } = useStartDirectChat();

  const accepted = contacts.filter(
    (c) => c[0].status === ContactStatus.Accepted,
  );

  const handleStartChat = (principalStr: string) => {
    startChat(principalStr, {
      onSuccess: (convId) => {
        onOpenChange(false);
        onChatStarted(convId);
      },
      onError: () => toast.error("Failed to start chat"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Chat</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[360px]">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && accepted.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No contacts yet. Add contacts first.</p>
            </div>
          )}

          {!isLoading &&
            accepted.map(([_contact, profile]) => (
              <button
                type="button"
                key={profile.principal.toString()}
                onClick={() => handleStartChat(profile.principal.toString())}
                disabled={isPending}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
              >
                <UserAvatar
                  name={profile.name}
                  avatarBlob={profile.avatar ?? null}
                  className="h-9 w-9"
                  fallbackClassName="text-xs"
                />
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile.name}</p>
                  {profile.bio && (
                    <p className="text-xs text-muted-foreground truncate">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </button>
            ))}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
