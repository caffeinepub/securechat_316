import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Loader2, MessageSquare, Plus, Search, Users } from "lucide-react";
import { useState } from "react";
import { useConversations } from "../hooks/useQueries";
import { ConversationItem, getConversationName } from "./ConversationItem";
import { NewChatDialog } from "./NewChatDialog";
import { NewGroupDialog } from "./NewGroupDialog";

interface ChatsPageProps {
  onOpenChat: (conversationId: bigint) => void;
}

export function ChatsPage({ onOpenChat }: ChatsPageProps) {
  const { data: conversations = [], isLoading, isError } = useConversations();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);

  const sorted = [...conversations].sort((a, b) => {
    const timeA = a.lastMessageTime ? Number(a.lastMessageTime) : 0;
    const timeB = b.lastMessageTime ? Number(b.lastMessageTime) : 0;
    return timeB - timeA;
  });

  const filtered = searchQuery
    ? sorted.filter((c) => {
        const name = getConversationName(c);
        return name.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : sorted;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold text-foreground">Chats</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowNewChat(true)}>
                <MessageSquare className="w-4 h-4" />
                Direct Chat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowNewGroup(true)}>
                <Users className="w-4 h-4" />
                Group Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {isError && (
          <div className="text-destructive text-center py-12 text-sm">
            Failed to load conversations.
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-primary/50" />
            </div>
            <p className="text-base font-medium text-foreground mb-1">
              No conversations yet
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Start a chat with one of your contacts
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowNewChat(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Start a Chat
            </Button>
          </div>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <div className="px-2">
            {filtered.map((conv) => (
              <ConversationItem
                key={Number(conv.id)}
                conversation={conv}
                onClick={() => onOpenChat(conv.id)}
              />
            ))}
          </div>
        )}
      </div>

      <NewChatDialog
        open={showNewChat}
        onOpenChange={setShowNewChat}
        onChatStarted={onOpenChat}
      />
      <NewGroupDialog
        open={showNewGroup}
        onOpenChange={setShowNewGroup}
        onGroupCreated={onOpenChat}
      />
    </div>
  );
}
