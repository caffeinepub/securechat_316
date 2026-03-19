import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Upload, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import {
  ContactStatus,
  useContacts,
  usePendingRequests,
} from "../hooks/useQueries";
import { AddContactDialog } from "./AddContactDialog";
import { ContactItem } from "./ContactItem";
import { ImportContactsDialog } from "./ImportContactsDialog";
import { PendingRequestItem } from "./PendingRequestItem";

interface ContactsPageProps {
  onOpenChat: (conversationId: bigint) => void;
}

export function ContactsPage({ onOpenChat }: ContactsPageProps) {
  const { data: contacts = [], isLoading, isError } = useContacts();
  const { data: pendingRequests = [] } = usePendingRequests();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const accepted = contacts.filter(
    (c) => c[0].status === ContactStatus.Accepted,
  );

  const filtered = searchQuery
    ? accepted.filter((c) =>
        c[1].name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : accepted;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold text-foreground">Contacts</h1>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowImport(true)}
              className="gap-1.5"
            >
              <Upload className="w-4 h-4" />
              Import
            </Button>
            <Button
              size="sm"
              onClick={() => setShowAddContact(true)}
              className="gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              Add
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Pending requests */}
        {pendingRequests.length > 0 && (
          <div className="px-4 mb-4">
            <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wider">
              Pending Requests
              <Badge variant="secondary" className="ml-2 text-[10px]">
                {pendingRequests.length}
              </Badge>
            </h2>
            <div className="space-y-1">
              {pendingRequests.map(([_contact, profile]) => (
                <PendingRequestItem
                  key={profile.principal.toString()}
                  profile={profile}
                />
              ))}
            </div>
          </div>
        )}

        {/* Contacts list */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {isError && (
          <div className="text-destructive text-center py-12 text-sm">
            Failed to load contacts.
          </div>
        )}

        {!isLoading &&
          !isError &&
          filtered.length === 0 &&
          accepted.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-primary/50" />
              </div>
              <p className="text-base font-medium text-foreground mb-1">
                No contacts yet
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Search for users or share your ID to connect
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddContact(true)}
              >
                <UserPlus className="w-4 h-4 mr-1.5" />
                Add Contact
              </Button>
            </div>
          )}

        {!isLoading && !isError && filtered.length > 0 && (
          <div className="px-2">
            {accepted.length > 0 && pendingRequests.length > 0 && (
              <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-2 ml-2 tracking-wider">
                All Contacts
              </h2>
            )}
            {filtered.map(([_contact, profile]) => (
              <ContactItem
                key={profile.principal.toString()}
                profile={profile}
                onOpenChat={onOpenChat}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <AddContactDialog
        open={showAddContact}
        onOpenChange={setShowAddContact}
      />
      <ImportContactsDialog open={showImport} onOpenChange={setShowImport} />
    </div>
  );
}
