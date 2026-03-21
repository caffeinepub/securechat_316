import type {
  Contact,
  ConversationPreview,
  FileId,
  FileMetadata,
  Message,
  MessageType,
  Profile,
  PublicProfile,
  StatusUpdate,
} from "@/backend";
import {
  ContactStatus,
  ConversationType,
  DiscoveryMode,
  ExternalBlob,
} from "@/backend";
import { Principal } from "@dfinity/principal";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export { ExternalBlob, ContactStatus, ConversationType, DiscoveryMode };
export type {
  FileMetadata,
  FileId,
  Profile,
  PublicProfile,
  Contact,
  ConversationPreview,
  Message,
  MessageType,
  StatusUpdate,
};

// Profile hooks

export function useProfile() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ["profile", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      try {
        const result = await actor.getProfile();
        return result ?? null;
      } catch {
        return null;
      }
    },
    enabled: !!actor && !!identity,
    retry: 0,
  });
}

export function useSetProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();

  return useMutation({
    mutationFn: async ({
      name,
      bio,
      avatar,
    }: {
      name: string;
      bio: string;
      avatar: ExternalBlob | null;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.setProfile(name, bio, avatar);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["profile", identity?.getPrincipal().toString()],
      });
    },
  });
}

export function usePublicProfile(principal: string | null) {
  const { actor } = useActor();

  return useQuery({
    queryKey: ["publicProfile", principal],
    queryFn: async () => {
      if (!actor || !principal) throw new Error("Not ready");
      return actor.getPublicProfile(Principal.fromText(principal));
    },
    enabled: !!actor && !!principal,
  });
}

// Contact hooks

export function useContacts() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ["contacts", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getContacts();
    },
    enabled: !!actor,
  });
}

export function usePendingRequests() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ["pendingRequests", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPendingRequests();
    },
    enabled: !!actor,
  });
}

export function useSendContactRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetPrincipal: string) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.sendContactRequest(Principal.fromText(targetPrincipal));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["pendingRequests"] });
    },
  });
}

export function useAcceptContactRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fromPrincipal: string) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.acceptContactRequest(Principal.fromText(fromPrincipal));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["pendingRequests"] });
    },
  });
}

export function useRejectContactRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fromPrincipal: string) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.rejectContactRequest(Principal.fromText(fromPrincipal));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["pendingRequests"] });
    },
  });
}

export function useRemoveContact() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetPrincipal: string) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.removeContact(Principal.fromText(targetPrincipal));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useBlockUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetPrincipal: string) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.blockUser(Principal.fromText(targetPrincipal));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
    },
  });
}

export function useUnblockUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetPrincipal: string) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.unblockUser(Principal.fromText(targetPrincipal));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
    },
  });
}

export function useBlockedUsers() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ["blockedUsers", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getBlockedUsers();
    },
    enabled: !!actor,
  });
}

export function useReportUser() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({
      target,
      reason,
    }: {
      target: string;
      reason: string;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.reportUser(Principal.fromText(target), reason);
    },
  });
}

export function useSearchUsers() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (query: string) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.searchUsers(query);
    },
  });
}

export function useShareId() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ["shareId", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.getShareId();
    },
    enabled: !!actor && !!identity,
  });
}

// Discovery mode hooks

export function useDiscoveryMode() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ["discoveryMode", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.getDiscoveryMode();
    },
    enabled: !!actor && !!identity,
  });
}

export function useUpdateDiscoveryMode() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();

  return useMutation({
    mutationFn: async (mode: DiscoveryMode) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.updateDiscoveryMode(mode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["discoveryMode", identity?.getPrincipal().toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

// Conversation hooks

export function useConversations() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ["conversations", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getConversations();
    },
    enabled: !!actor,
  });
}

export function useStartDirectChat() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetPrincipal: string) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.startDirectChat(Principal.fromText(targetPrincipal));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useMessages(conversationId: bigint | null) {
  const { actor } = useActor();

  return useQuery({
    queryKey: ["messages", conversationId?.toString()],
    queryFn: async () => {
      if (!actor || conversationId === null) return [];
      return actor.getMessages(conversationId, null, BigInt(50));
    },
    enabled: !!actor && conversationId !== null,
    refetchInterval: 3000,
  });
}

export function useSendMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      messageType,
      mediaBlob,
      mediaName,
      mediaSize,
      replyToId,
      mentionedPrincipals,
    }: {
      conversationId: bigint;
      content: string;
      messageType: MessageType;
      mediaBlob: ExternalBlob | null;
      mediaName: string | null;
      mediaSize: bigint | null;
      replyToId: bigint | null;
      mentionedPrincipals?: string[] | null;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.sendMessage(
        conversationId,
        content,
        messageType,
        mediaBlob,
        mediaName,
        mediaSize,
        replyToId,
        mentionedPrincipals
          ? mentionedPrincipals.map((p) => Principal.fromText(p))
          : null,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.conversationId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useMarkAsRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      upToMessageId,
    }: {
      conversationId: bigint;
      upToMessageId: bigint;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.markAsRead(conversationId, upToMessageId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useDeleteMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      messageId,
    }: {
      conversationId: bigint;
      messageId: bigint;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.deleteMessage(conversationId, messageId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.conversationId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useAddReaction() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      messageId,
      emoji,
    }: {
      conversationId: bigint;
      messageId: bigint;
      emoji: string;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.addReaction(conversationId, messageId, emoji);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.conversationId.toString()],
      });
    },
  });
}

export function useRemoveReaction() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      messageId,
      emoji,
    }: {
      conversationId: bigint;
      messageId: bigint;
      emoji: string;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.removeReaction(conversationId, messageId, emoji);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.conversationId.toString()],
      });
    },
  });
}

// Group hooks

export function useCreateGroup() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      members,
      avatar,
    }: {
      name: string;
      members: string[];
      avatar: ExternalBlob | null;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.createGroup(
        name,
        members.map((m) => Principal.fromText(m)),
        avatar,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useGroupInfo(conversationId: bigint | null) {
  const { actor } = useActor();

  return useQuery({
    queryKey: ["groupInfo", conversationId?.toString()],
    queryFn: async () => {
      if (!actor || conversationId === null) throw new Error("Not ready");
      return actor.getGroupInfo(conversationId);
    },
    enabled: !!actor && conversationId !== null,
  });
}

export function useUpdateGroup() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      name,
      avatar,
    }: {
      conversationId: bigint;
      name: string | null;
      avatar: ExternalBlob | null;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.updateGroup(conversationId, name, avatar);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["groupInfo", variables.conversationId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useAddGroupMember() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      member,
    }: {
      conversationId: bigint;
      member: string;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.addGroupMember(conversationId, Principal.fromText(member));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["groupInfo", variables.conversationId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useRemoveGroupMember() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      member,
    }: {
      conversationId: bigint;
      member: string;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.removeGroupMember(conversationId, Principal.fromText(member));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["groupInfo", variables.conversationId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useLeaveGroup() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: bigint) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.leaveGroup(conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useDeleteGroup() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: bigint) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.deleteGroup(conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// Status hooks

export function useContactStatuses() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ["contactStatuses", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getContactStatuses();
    },
    enabled: !!actor,
    refetchInterval: 30000,
  });
}

export function useMyStatuses() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ["myStatuses", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyStatuses();
    },
    enabled: !!actor,
  });
}

export function usePostStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      content,
      mediaBlob,
    }: {
      content: string;
      mediaBlob: ExternalBlob | null;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.postStatus(content, mediaBlob);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myStatuses"] });
      queryClient.invalidateQueries({ queryKey: ["contactStatuses"] });
    },
  });
}

export function useDeleteStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (statusId: bigint) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.deleteStatus(statusId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myStatuses"] });
    },
  });
}

export function useReactToStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      statusId,
      emoji,
    }: {
      statusId: bigint;
      emoji: string;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.reactToStatus(statusId, emoji);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contactStatuses"] });
    },
  });
}

export function useStatusProfiles(principalStrings: string[]) {
  const { actor } = useActor();

  const results = useQueries({
    queries: principalStrings.map((p) => ({
      queryKey: ["publicProfile", p],
      queryFn: async () => {
        if (!actor) throw new Error("Not ready");
        return actor.getPublicProfile(Principal.fromText(p));
      },
      enabled: !!actor,
      staleTime: 60000,
    })),
  });

  const profileMap = new Map<string, PublicProfile>();
  principalStrings.forEach((p, i) => {
    if (results[i]?.data) {
      profileMap.set(p, results[i].data);
    }
  });

  return profileMap;
}

// Notification hooks

export function useNotifications() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ["notifications", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getNotifications(BigInt(50));
    },
    enabled: !!actor,
    refetchInterval: 10000,
  });
}

export function useUnreadCount() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ["unreadCount", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getUnreadCount();
    },
    enabled: !!actor,
    refetchInterval: 10000,
  });
}

export function useMarkNotificationsRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (upToId: bigint) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.markNotificationsRead(upToId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
    },
  });
}

export function useToggleNotificationRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: bigint) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.toggleNotificationRead(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
    },
  });
}

// Disappearing message hooks

export function useDisappearingTimer(conversationId: bigint | null) {
  const { actor } = useActor();

  return useQuery({
    queryKey: ["disappearingTimer", conversationId?.toString()],
    queryFn: async () => {
      if (!actor || conversationId === null) throw new Error("Not ready");
      return actor.getDisappearingTimer(conversationId);
    },
    enabled: !!actor && conversationId !== null,
  });
}

export function useSetDisappearingTimer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      timer,
    }: {
      conversationId: bigint;
      timer:
        | { Off: null }
        | { Hours24: null }
        | { Days7: null }
        | { Days30: null };
    }) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.setDisappearingTimer(conversationId, timer as any);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["disappearingTimer", variables.conversationId.toString()],
      });
    },
  });
}

// Typing indicator hooks

export function useTypingUsers(conversationId: bigint | null) {
  const { actor } = useActor();

  return useQuery({
    queryKey: ["typingUsers", conversationId?.toString()],
    queryFn: async () => {
      if (!actor || conversationId === null) return [];
      return actor.getTypingUsers(conversationId);
    },
    enabled: !!actor && conversationId !== null,
    refetchInterval: 2000,
  });
}

export function useSetTyping() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (conversationId: bigint) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.setTyping(conversationId);
    },
  });
}

// Encrypted email config hooks (vetKD)

export function useGetEncryptedEmailConfig() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ["encryptedEmailConfig", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      const result = await actor.getEncryptedEmailConfig();
      return result ?? null;
    },
    enabled: !!actor && !!identity,
  });
}

export function useSetEncryptedEmailConfig() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      encryptedApiKey,
      senderEmail,
    }: {
      encryptedApiKey: Uint8Array;
      senderEmail: string;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.setEncryptedEmailConfig(encryptedApiKey, senderEmail);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["encryptedEmailConfig"] });
    },
  });
}

// Email verification hooks

export function useEmailVerificationStatus() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ["emailVerificationStatus", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.getEmailVerificationStatus();
    },
    enabled: !!actor && !!identity,
  });
}

export function useRequestEmailVerification() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({
      email,
      apiKey,
      senderEmail,
    }: {
      email: string;
      apiKey: string;
      senderEmail: string;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.requestEmailVerification(email, apiKey, senderEmail);
    },
  });
}

export function useVerifyEmailOtp() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.verifyEmailOtp(code);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailVerificationStatus"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

// Two-factor authentication hooks

export function useTwoFactorStatus() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ["twoFactorStatus", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.getTwoFactorStatus();
    },
    enabled: !!actor && !!identity,
    staleTime: Number.POSITIVE_INFINITY,
    retry: 0,
  });
}

export function useSetTwoFactorEnabled() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.setTwoFactorEnabled(enabled);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["twoFactorStatus"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useRequestLoginOtp() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({
      apiKey,
      senderEmail,
    }: {
      apiKey: string;
      senderEmail: string;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.requestLoginOtp(apiKey, senderEmail);
    },
  });
}

export function useVerifyLoginOtp() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (code: string) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.verifyLoginOtp(code);
    },
  });
}

// Contact import hook

export function useAddContactByPrincipal() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (principalText: string) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.addContactByPrincipal(principalText);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["pendingRequests"] });
    },
  });
}

// Data export/import hooks

export function useExportUserData() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.exportUserData();
    },
  });
}

export function useImportUserData() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      profile: {
        name: string;
        bio: string;
        email: string | null;
        emailVerified: boolean;
      };
      contacts: Array<{
        principalText: string;
        status: unknown;
        addedAt: bigint;
      }>;
      exportedAt: bigint;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.importUserData(data as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["pendingRequests"] });
    },
  });
}

// File hooks (from template)

export function useGetAllFiles() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<FileMetadata[]>({
    queryKey: ["files", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllFiles();
    },
    enabled: !!actor,
  });
}

export function useUploadFile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();

  return useMutation({
    mutationFn: async ({
      name,
      size,
      fileType,
      blob,
    }: {
      name: string;
      size: bigint;
      fileType: string;
      blob: ExternalBlob;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.uploadFile(name, size, fileType, blob);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["files", identity?.getPrincipal().toString()],
      });
    },
  });
}

export function useDeleteFile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();

  return useMutation({
    mutationFn: async (id: FileId) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.deleteFile(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["files", identity?.getPrincipal().toString()],
      });
    },
  });
}

// E2EE hooks

export function usePublishPublicKey() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (key: Uint8Array) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.publishPublicKey(key);
    },
  });
}

export function useGetPublicKey(principal: string | null) {
  const { actor } = useActor();

  return useQuery({
    queryKey: ["publicKey", principal],
    queryFn: async () => {
      if (!actor || !principal) throw new Error("Not ready");
      const result = await actor.getPublicKey(Principal.fromText(principal));
      return result ?? null;
    },
    enabled: !!actor && !!principal,
  });
}

export function useGetPublicKeys() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (principals: string[]) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.getPublicKeys(principals.map((p) => Principal.fromText(p)));
    },
  });
}

export function usePublishGroupKeys() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({
      conversationId,
      wrappedKeys,
    }: {
      conversationId: bigint;
      wrappedKeys: [string, Uint8Array][];
    }) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.publishGroupKeys(
        conversationId,
        wrappedKeys.map(
          ([p, k]) => [Principal.fromText(p), k] as [Principal, Uint8Array],
        ),
      );
    },
  });
}

export function useGetMyGroupKey(conversationId: bigint | null) {
  const { actor } = useActor();

  return useQuery({
    queryKey: ["myGroupKey", conversationId?.toString()],
    queryFn: async () => {
      if (!actor || conversationId === null) throw new Error("Not ready");
      const result = await actor.getMyGroupKey(conversationId);
      return result ?? null;
    },
    enabled: !!actor && conversationId !== null,
  });
}

export function useClearGroupKeys() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: bigint) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.clearGroupKeys(conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myGroupKey"] });
    },
  });
}
