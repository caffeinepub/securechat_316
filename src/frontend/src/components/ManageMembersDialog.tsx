import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  ContactStatus,
  useAddGroupMember,
  useContacts,
  useGetPublicKeys,
  usePublishGroupKeys,
} from "../hooks/useQueries";
import {
  deriveDirectChatKey,
  exportKeyPairAsJwk,
  exportPublicKey,
  generateKeyPair,
  importKeyPairFromJwk,
  importPublicKey,
  wrapGroupKey,
} from "../utils/e2ee";
import { getConversationKey, getKeyPair, saveKeyPair } from "../utils/keyStore";
import { UserAvatar } from "./UserAvatar";

interface ManageMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: bigint;
  existingMembers: string[];
}

export function ManageMembersDialog({
  open,
  onOpenChange,
  conversationId,
  existingMembers,
}: ManageMembersDialogProps) {
  const { identity } = useInternetIdentity();
  const { actor } = useActor();
  const { data: contacts = [], isLoading } = useContacts();
  const { mutate: addMember, isPending } = useAddGroupMember();
  const { mutateAsync: getPublicKeys } = useGetPublicKeys();
  const { mutateAsync: publishGroupKeys } = usePublishGroupKeys();

  const accepted = contacts.filter(
    (c) => c[0].status === ContactStatus.Accepted,
  );

  const availableContacts = accepted.filter(
    ([, profile]) => !existingMembers.includes(profile.principal.toString()),
  );

  const handleAdd = (principalStr: string) => {
    addMember(
      { conversationId, member: principalStr },
      {
        onSuccess: async () => {
          // Wrap existing group key for the new member
          try {
            await wrapKeyForNewMember(principalStr);
          } catch (err) {
            console.error("Failed to wrap group key for new member:", err);
          }
          toast.success("Member added");
        },
        onError: () => toast.error("Failed to add member"),
      },
    );
  };

  const wrapKeyForNewMember = async (newMemberPrincipal: string) => {
    const myPrincipal = identity?.getPrincipal().toString();
    if (!myPrincipal || !actor) return;

    // Get our key pair
    let storedKp = await getKeyPair(myPrincipal);
    let myKeyPair: CryptoKeyPair;
    if (storedKp) {
      myKeyPair = await importKeyPairFromJwk(storedKp);
    } else {
      myKeyPair = await generateKeyPair();
      const jwk = await exportKeyPairAsJwk(myKeyPair);
      await saveKeyPair(myPrincipal, jwk);
      const pubRaw = await exportPublicKey(myKeyPair.publicKey);
      await actor.publishPublicKey(pubRaw);
    }

    // Get cached group key
    const cacheKey = `group:${conversationId}`;
    const cachedJwk = await getConversationKey(cacheKey);
    if (!cachedJwk) return;

    const groupKey = await crypto.subtle.importKey(
      "jwk",
      cachedJwk,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    );

    // Fetch new member's public key
    const pubKeys = await getPublicKeys([newMemberPrincipal]);
    if (pubKeys.length === 0) return;

    const [, keyBlob] = pubKeys[0];
    const memberPubKey = await importPublicKey(new Uint8Array(keyBlob as any));
    const pairwiseKey = await deriveDirectChatKey(
      myKeyPair.privateKey,
      memberPubKey,
    );
    const wrapped = await wrapGroupKey(groupKey, pairwiseKey);

    await publishGroupKeys({
      conversationId,
      wrappedKeys: [[newMemberPrincipal, wrapped]],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Members</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[360px]">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && availableContacts.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>All contacts are already in this group.</p>
            </div>
          )}

          {!isLoading &&
            availableContacts.map(([, profile]) => {
              const pStr = profile.principal.toString();
              const justAdded = existingMembers.includes(pStr);
              return (
                <button
                  type="button"
                  key={pStr}
                  onClick={() => handleAdd(pStr)}
                  disabled={isPending || justAdded}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                >
                  <UserAvatar
                    name={profile.name}
                    avatarBlob={profile.avatar ?? null}
                    className="h-9 w-9"
                    fallbackClassName="text-xs"
                  />
                  <span className="text-sm font-medium flex-1 text-left truncate">
                    {profile.name}
                  </span>
                  {justAdded && (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
