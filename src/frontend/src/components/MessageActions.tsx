import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, Loader2, Reply, Smile, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAddReaction, useDeleteMessage } from "../hooks/useQueries";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

interface MessageActionsProps {
  conversationId: bigint;
  messageId: bigint;
  isMine: boolean;
  messageContent: string;
  onReply: () => void;
  children: React.ReactNode;
}

export function MessageActions({
  conversationId,
  messageId,
  isMine,
  messageContent,
  onReply,
  children,
}: MessageActionsProps) {
  const { mutate: deleteMessage, isPending: isDeleting } = useDeleteMessage();
  const { mutate: addReaction } = useAddReaction();

  const handleDelete = () => {
    deleteMessage(
      { conversationId, messageId },
      {
        onSuccess: () => toast.success("Message deleted"),
        onError: () => toast.error("Failed to delete"),
      },
    );
  };

  const handleReact = (emoji: string) => {
    addReaction(
      { conversationId, messageId, emoji },
      {
        onError: () => toast.error("Failed to react"),
      },
    );
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageContent);
    toast.success("Copied to clipboard");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={isMine ? "end" : "start"}>
        <DropdownMenuItem onClick={onReply}>
          <Reply className="w-4 h-4" />
          Reply
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Smile className="w-4 h-4 mr-2" />
            React
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="p-1.5">
            <div className="flex gap-1">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className="w-9 h-9 rounded-lg hover:bg-accent flex items-center justify-center text-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuItem onClick={handleCopy}>
          <Copy className="w-4 h-4" />
          Copy
        </DropdownMenuItem>

        {isMine && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-destructive focus:text-destructive"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
