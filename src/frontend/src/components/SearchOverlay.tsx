import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ArrowRight, Loader2, Search, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  ContactStatus,
  useContacts,
  useConversations,
  useSearchUsers,
} from "../hooks/useQueries";
import type {
  ConversationPreview,
  ExternalBlob,
  PublicProfile,
} from "../hooks/useQueries";
import { UserAvatar } from "./UserAvatar";

interface SearchOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChat: (conversationId: bigint) => void;
}

export function SearchOverlay({
  open,
  onOpenChange,
  onOpenChat,
}: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: contacts = [] } = useContacts();
  const { data: conversations = [] } = useConversations();
  const {
    mutate: searchUsers,
    data: userResults,
    isPending: isSearchingUsers,
  } = useSearchUsers();

  const isSearching = isSearchingUsers;

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) return;
    const timer = setTimeout(() => {
      searchUsers(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchUsers]);

  // Filter contacts locally
  const matchedContacts =
    query.length >= 2
      ? contacts
          .filter(
            (c) =>
              c[0].status === ContactStatus.Accepted &&
              c[1].name.toLowerCase().includes(query.toLowerCase()),
          )
          .slice(0, 5)
      : [];

  // Filter conversations locally
  const matchedConversations =
    query.length >= 2
      ? conversations
          .filter((c) => {
            const name = getConvName(c);
            return name.toLowerCase().includes(query.toLowerCase());
          })
          .slice(0, 5)
      : [];

  const handleSelectChat = (conversationId: bigint) => {
    onOpenChange(false);
    onOpenChat(conversationId);
  };

  const hasResults =
    matchedContacts.length > 0 ||
    matchedConversations.length > 0 ||
    (userResults && userResults.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 [&>button]:hidden">
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts and chats..."
            className="border-none shadow-none focus-visible:ring-0 px-0 h-auto"
            autoFocus
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => setQuery("")}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {query.length < 2 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Type at least 2 characters to search
            </div>
          )}

          {query.length >= 2 && isSearching && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {query.length >= 2 && !isSearching && !hasResults && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No results found
            </div>
          )}

          {query.length >= 2 && !isSearching && hasResults && (
            <div className="py-2">
              {/* Contacts */}
              {matchedContacts.length > 0 && (
                <div className="px-4 mb-3">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 tracking-wider">
                    Contacts
                  </h3>
                  {matchedContacts.map(([, profile]) => (
                    <SearchContactItem
                      key={profile.principal.toString()}
                      profile={profile}
                    />
                  ))}
                </div>
              )}

              {/* Conversations */}
              {matchedConversations.length > 0 && (
                <div className="px-4 mb-3">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 tracking-wider">
                    Chats
                  </h3>
                  {matchedConversations.map((conv) => (
                    <button
                      type="button"
                      key={Number(conv.id)}
                      onClick={() => handleSelectChat(conv.id)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <UserAvatar
                        name={getConvName(conv)}
                        avatarBlob={
                          (conv.groupInfo as { avatar?: ExternalBlob | null })
                            ?.avatar ??
                          conv.members?.[0]?.avatar ??
                          null
                        }
                        className="h-8 w-8"
                        fallbackClassName="text-xs"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {getConvName(conv)}
                        </p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* User results from search */}
              {userResults &&
                userResults.length > 0 &&
                matchedContacts.length === 0 && (
                  <div className="px-4 mb-3">
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 tracking-wider">
                      Users
                    </h3>
                    {userResults.map((user) => (
                      <SearchContactItem
                        key={user.principal.toString()}
                        profile={user}
                      />
                    ))}
                  </div>
                )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function SearchContactItem({ profile }: { profile: PublicProfile }) {
  return (
    <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
      <UserAvatar
        name={profile.name}
        avatarBlob={profile.avatar ?? null}
        className="h-8 w-8"
        fallbackClassName="text-xs"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{profile.name}</p>
        {profile.bio && (
          <p className="text-xs text-muted-foreground truncate">
            {profile.bio}
          </p>
        )}
      </div>
    </div>
  );
}

function getConvName(conv: ConversationPreview): string {
  const gi = conv.groupInfo;
  if (gi && "name" in gi) {
    return (gi as { name: string }).name;
  }
  if (conv.members && conv.members.length > 0) {
    return conv.members[0].name;
  }
  return "Chat";
}
