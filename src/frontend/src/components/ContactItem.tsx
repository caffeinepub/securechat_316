import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Ban,
  Flag,
  MessageSquare,
  MoreHorizontal,
  UserMinus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useBlockUser,
  useRemoveContact,
  useStartDirectChat,
} from "../hooks/useQueries";
import type { PublicProfile } from "../hooks/useQueries";
import { formatLastSeen, isOnline } from "../utils/formatting";
import { ReportUserDialog } from "./ReportUserDialog";
import { UserAvatar } from "./UserAvatar";

interface ContactItemProps {
  profile: PublicProfile;
  onOpenChat: (conversationId: bigint) => void;
}

export function ContactItem({ profile, onOpenChat }: ContactItemProps) {
  const { mutate: startChat } = useStartDirectChat();
  const { mutate: removeContact } = useRemoveContact();
  const { mutate: blockUser } = useBlockUser();
  const [showReport, setShowReport] = useState(false);

  const handleMessage = () => {
    startChat(profile.principal.toString(), {
      onSuccess: (convId) => onOpenChat(convId),
      onError: () => toast.error("Failed to start chat"),
    });
  };

  return (
    <>
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent transition-colors">
        <div className="relative shrink-0">
          <UserAvatar
            name={profile.name}
            avatarBlob={profile.avatar ?? null}
            className="h-10 w-10"
            fallbackClassName="text-xs"
          />
          {isOnline(profile.lastSeen) && (
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{profile.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {formatLastSeen(profile.lastSeen)}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleMessage}>
              <MessageSquare className="w-4 h-4" />
              Message
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowReport(true)}>
              <Flag className="w-4 h-4" />
              Report
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                blockUser(profile.principal.toString(), {
                  onSuccess: () => toast.success("User blocked"),
                  onError: () => toast.error("Failed to block"),
                })
              }
            >
              <Ban className="w-4 h-4" />
              Block
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                removeContact(profile.principal.toString(), {
                  onSuccess: () => toast.success("Contact removed"),
                  onError: () => toast.error("Failed to remove"),
                })
              }
              className="text-destructive focus:text-destructive"
            >
              <UserMinus className="w-4 h-4" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ReportUserDialog
        open={showReport}
        onOpenChange={setShowReport}
        targetPrincipal={profile.principal.toString()}
        targetName={profile.name}
      />
    </>
  );
}
