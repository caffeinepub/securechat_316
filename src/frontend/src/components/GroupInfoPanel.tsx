import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Loader2,
  LogOut,
  Settings,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useClearGroupKeys,
  useDeleteGroup,
  useGetPublicKeys,
  useGroupInfo,
  useLeaveGroup,
  usePublishGroupKeys,
  useRemoveGroupMember,
} from "../hooks/useQueries";
import {
  deriveDirectChatKey,
  exportKeyPairAsJwk,
  exportPublicKey,
  generateGroupKey,
  generateKeyPair,
  importKeyPairFromJwk,
  importPublicKey,
  wrapGroupKey,
} from "../utils/e2ee";
import {
  deleteConversationKey,
  getKeyPair,
  saveConversationKey,
  saveKeyPair,
} from "../utils/keyStore";
import { EditGroupDialog } from "./EditGroupDialog";
import { ManageMembersDialog } from "./ManageMembersDialog";
import { UserAvatar } from "./UserAvatar";

interface GroupInfoPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: bigint;
  onLeft: () => void;
}

export function GroupInfoPanel({
  open,
  onOpenChange,
  conversationId,
  onLeft,
}: GroupInfoPanelProps) {
  const { identity } = useInternetIdentity();
  const { actor } = useActor();
  const myPrincipal = identity?.getPrincipal().toString() ?? "";
  const { data: groupInfo, isLoading, isError } = useGroupInfo(conversationId);
  const { mutate: leaveGroup, isPending: isLeaving } = useLeaveGroup();
  const { mutate: deleteGroup, isPending: isDeleting } = useDeleteGroup();
  const { mutate: removeMember, isPending: isRemoving } =
    useRemoveGroupMember();
  const { mutateAsync: clearGroupKeys } = useClearGroupKeys();
  const { mutateAsync: getPublicKeys } = useGetPublicKeys();
  const { mutateAsync: publishGroupKeys } = usePublishGroupKeys();

  const [showEdit, setShowEdit] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isAdmin = groupInfo && groupInfo.admin.toString() === myPrincipal;

  const handleLeave = () => {
    leaveGroup(conversationId, {
      onSuccess: () => {
        toast.success("Left the group");
        onOpenChange(false);
        onLeft();
      },
      onError: () => toast.error("Failed to leave group"),
    });
  };

  const handleRemoveMember = (memberPrincipal: string) => {
    removeMember(
      { conversationId, member: memberPrincipal },
      {
        onSuccess: async () => {
          toast.success("Member removed");
          // Rotate group key — removed member should not decrypt future messages
          try {
            await rotateGroupKey(memberPrincipal);
          } catch (err) {
            console.error("Failed to rotate group key:", err);
          }
        },
        onError: () => toast.error("Failed to remove member"),
      },
    );
  };

  const rotateGroupKey = async (removedPrincipal: string) => {
    if (!actor || !groupInfo) return;

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

    // Clear old keys on backend
    await clearGroupKeys(conversationId);

    // Delete old cached key
    await deleteConversationKey(`group:${conversationId}`);

    // Generate new group key
    const newGroupKey = await generateGroupKey();
    const groupJwk = await crypto.subtle.exportKey("jwk", newGroupKey);
    await saveConversationKey(`group:${conversationId}`, groupJwk);

    // Get remaining members (exclude removed)
    const remainingMembers = groupInfo.members
      .map((m) => m.principal.toString())
      .filter((p) => p !== removedPrincipal);

    // Fetch public keys for remaining members
    const pubKeys = await getPublicKeys(remainingMembers);

    // Wrap new group key for each remaining member
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
      const wrapped = await wrapGroupKey(newGroupKey, pairwiseKey);
      wrappedKeys.push([pStr, wrapped]);
    }

    if (wrappedKeys.length > 0) {
      await publishGroupKeys({ conversationId, wrappedKeys });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-80 sm:w-96 p-0 flex flex-col h-full max-h-dvh overflow-hidden">
          <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0">
            <SheetTitle className="text-left">Group Info</SheetTitle>
          </SheetHeader>

          {isLoading && (
            <div className="flex-1 flex justify-center items-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {isError && (
            <div className="flex-1 flex justify-center items-center text-destructive text-sm">
              Failed to load group info.
            </div>
          )}

          {groupInfo && (
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="px-4 py-4 space-y-5">
                {/* Group header */}
                <div className="flex flex-col items-center text-center">
                  <UserAvatar
                    name={groupInfo.name}
                    avatarBlob={groupInfo.avatar ?? null}
                    className="h-20 w-20 mb-3"
                    fallbackClassName="bg-secondary text-secondary-foreground text-2xl"
                  />
                  <h2 className="text-lg font-semibold">{groupInfo.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {groupInfo.members.length} member
                    {groupInfo.members.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Admin actions */}
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => setShowEdit(true)}
                    >
                      <Settings className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => setShowAddMembers(true)}
                    >
                      <UserPlus className="w-4 h-4" />
                      Add
                    </Button>
                  </div>
                )}

                <Separator />

                {/* Members */}
                <div>
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wider">
                    Members
                  </h3>
                  <div className="space-y-1">
                    {groupInfo.members.map((member) => {
                      const pStr = member.principal.toString();
                      const isSelf = pStr === myPrincipal;
                      const isMemberAdmin = pStr === groupInfo.admin.toString();
                      return (
                        <div
                          key={pStr}
                          className="flex items-center gap-3 px-2 py-2 rounded-lg"
                        >
                          <UserAvatar
                            name={member.name}
                            avatarBlob={member.avatar ?? null}
                            className="h-9 w-9 shrink-0"
                            fallbackClassName="text-xs"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium truncate">
                                {member.name}
                                {isSelf && " (You)"}
                              </span>
                              {isMemberAdmin && (
                                <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                              )}
                            </div>
                          </div>
                          {isAdmin && !isSelf && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveMember(pStr)}
                              disabled={isRemoving}
                            >
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Leave group */}
                <Button
                  variant="ghost"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                  onClick={() => setShowLeaveConfirm(true)}
                >
                  <LogOut className="w-4 h-4" />
                  Leave Group
                </Button>

                {/* Delete group - admin only */}
                {isAdmin && (
                  <>
                    <Separator className="my-2" />
                    <Button
                      variant="ghost"
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 gap-2 font-medium"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Group
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit group dialog */}
      {groupInfo && (
        <EditGroupDialog
          open={showEdit}
          onOpenChange={setShowEdit}
          conversationId={conversationId}
          currentName={groupInfo.name}
        />
      )}

      {/* Add members dialog */}
      <ManageMembersDialog
        open={showAddMembers}
        onOpenChange={setShowAddMembers}
        conversationId={conversationId}
        existingMembers={
          groupInfo?.members.map((m) => m.principal.toString()) ?? []
        }
      />

      {/* Leave confirmation */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave group?</AlertDialogTitle>
            <AlertDialogDescription>
              You will no longer receive messages from this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLeaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave} disabled={isLeaving}>
              {isLeaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLeaving ? "Leaving..." : "Leave"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete group confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the group and all messages. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={() => {
                deleteGroup(conversationId, {
                  onSuccess: () => {
                    toast.success("Group deleted");
                    setShowDeleteConfirm(false);
                    onOpenChange(false);
                    onLeft();
                  },
                  onError: () => {
                    toast.error("Failed to delete group");
                  },
                });
              }}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? "Deleting..." : "Delete Group"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
