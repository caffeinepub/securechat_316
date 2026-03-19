import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Check, Loader2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  ContactStatus,
  useContacts,
  useCreateGroup,
  useGetPublicKeys,
  usePublishGroupKeys,
} from "../hooks/useQueries";
import {
  deriveDirectChatKey,
  exportAesKey,
  exportKeyPairAsJwk,
  exportPublicKey,
  generateGroupKey,
  generateKeyPair,
  importKeyPairFromJwk,
  importPublicKey,
  wrapGroupKey,
} from "../utils/e2ee";
import {
  getKeyPair,
  saveConversationKey,
  saveKeyPair,
} from "../utils/keyStore";
import { UserAvatar } from "./UserAvatar";

interface NewGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated: (conversationId: bigint) => void;
}

export function NewGroupDialog({
  open,
  onOpenChange,
  onGroupCreated,
}: NewGroupDialogProps) {
  const { identity } = useInternetIdentity();
  const { actor } = useActor();
  const { data: contacts = [], isLoading } = useContacts();
  const { mutate: createGroup, isPending } = useCreateGroup();
  const { mutateAsync: getPublicKeys } = useGetPublicKeys();
  const { mutateAsync: publishGroupKeys } = usePublishGroupKeys();

  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const accepted = contacts.filter(
    (c) => c[0].status === ContactStatus.Accepted,
  );

  const toggleMember = (principalStr: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(principalStr)) {
        next.delete(principalStr);
      } else {
        next.add(principalStr);
      }
      return next;
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || selected.size === 0) return;

    createGroup(
      {
        name: trimmed,
        members: Array.from(selected),
        avatar: null,
      },
      {
        onSuccess: async (convId) => {
          // Distribute E2EE group key
          try {
            await distributeGroupKey(convId, Array.from(selected));
          } catch (err) {
            console.error("Failed to distribute group key:", err);
          }
          toast.success("Group created");
          onOpenChange(false);
          onGroupCreated(convId);
        },
        onError: () => toast.error("Failed to create group"),
      },
    );
  };

  const distributeGroupKey = async (
    convId: bigint,
    memberPrincipals: string[],
  ) => {
    const myPrincipal = identity?.getPrincipal().toString();
    if (!myPrincipal || !actor) return;

    // Ensure we have our key pair
    let storedKp = await getKeyPair(myPrincipal);
    let myKeyPair: CryptoKeyPair;
    if (storedKp) {
      myKeyPair = await importKeyPairFromJwk(storedKp);
    } else {
      myKeyPair = await generateKeyPair();
      const jwk = await exportKeyPairAsJwk(myKeyPair);
      await saveKeyPair(myPrincipal, jwk);
      storedKp = jwk;
      const pubRaw = await exportPublicKey(myKeyPair.publicKey);
      await actor.publishPublicKey(pubRaw);
    }

    // Generate group key
    const groupKey = await generateGroupKey();

    // Cache it locally
    const groupJwk = await crypto.subtle.exportKey("jwk", groupKey);
    await saveConversationKey(`group:${convId}`, groupJwk);

    // Fetch all member public keys (including self)
    const allMembers = [myPrincipal, ...memberPrincipals];
    const pubKeys = await getPublicKeys(allMembers);

    // Wrap group key for each member
    const wrappedKeys: [string, Uint8Array][] = [];
    for (const [principal, keyBlob] of pubKeys) {
      const pStr = principal.toString();
      const memberPubKey = await importPublicKey(
        new Uint8Array(keyBlob as any),
      );
      const pairwiseKey = await deriveDirectChatKey(
        myKeyPair.privateKey,
        memberPubKey,
      );
      const wrapped = await wrapGroupKey(groupKey, pairwiseKey);
      wrappedKeys.push([pStr, wrapped]);
    }

    if (wrappedKeys.length > 0) {
      await publishGroupKeys({ conversationId: convId, wrappedKeys });
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen) {
      setName("");
      setSelected(new Set());
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>New Group</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
              maxLength={100}
              autoFocus
            />

            {selected.size > 0 && (
              <p className="text-xs text-muted-foreground">
                {selected.size} member{selected.size !== 1 ? "s" : ""} selected
              </p>
            )}

            <ScrollArea className="max-h-[280px]">
              {isLoading && (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {!isLoading && accepted.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No contacts to add. Add contacts first.</p>
                </div>
              )}

              {!isLoading &&
                accepted.map(([, profile]) => {
                  const pStr = profile.principal.toString();
                  const isSelected = selected.has(pStr);
                  return (
                    <button
                      key={pStr}
                      type="button"
                      onClick={() => toggleMember(pStr)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                        isSelected ? "bg-primary/10" : "hover:bg-accent",
                      )}
                    >
                      <UserAvatar
                        name={profile.name}
                        avatarBlob={profile.avatar ?? null}
                        className="h-9 w-9"
                        fallbackClassName={cn(
                          "text-xs",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-primary/15 text-primary",
                        )}
                      />
                      <span className="text-sm font-medium flex-1 text-left truncate">
                        {profile.name}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </button>
                  );
                })}
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={isPending || !name.trim() || selected.size === 0}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
