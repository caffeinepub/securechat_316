import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface ExportData {
    contacts: Array<ExportContact>;
    exportedAt: bigint;
    profile: {
        bio: string;
        emailVerified: boolean;
        name: string;
        email?: string;
    };
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<HttpHeader>;
}
export interface HttpRequestResult {
    status: bigint;
    body: Uint8Array;
    headers: Array<HttpHeader>;
}
export interface StatusUpdate {
    id: bigint;
    postedAt: bigint;
    content: string;
    expiresAt: bigint;
    author: Principal;
    mediaBlob?: ExternalBlob;
    reactions: Array<[Principal, string]>;
}
export interface Profile {
    bio: string;
    twoFactorEnabled: boolean;
    emailVerified: boolean;
    name: string;
    email?: string;
    lastSeen: bigint;
    avatar?: ExternalBlob;
}
export interface ConversationPreview {
    id: bigint;
    members: Array<PublicProfile>;
    lastMessageTime?: bigint;
    unreadCount: bigint;
    groupInfo?: GroupInfo;
    conversationType: ConversationType;
}
export interface ExportContact {
    status: ContactStatus;
    addedAt: bigint;
    principalText: string;
}
export interface TransformationInput {
    context: Uint8Array;
    response: HttpRequestResult;
}
export interface FileMetadata {
    id: FileId;
    blob: ExternalBlob;
    name: string;
    size: bigint;
    fileType: string;
    uploadDate: bigint;
}
export interface Contact {
    status: ContactStatus;
    principal: Principal;
    addedAt: bigint;
}
export interface HttpHeader {
    value: string;
    name: string;
}
export interface PublicProfile {
    bio: string;
    principal: Principal;
    name: string;
    lastSeen: bigint;
    avatar?: ExternalBlob;
}
export interface GroupInfo {
    admin: Principal;
    name: string;
    avatar?: ExternalBlob;
}
export interface WrappedGroupKey {
    encryptedKey: Uint8Array;
    wrappedBy: Principal;
}
export interface Notification {
    id: bigint;
    kind: NotificationKind;
    read: boolean;
    fromPrincipal?: Principal;
    conversationId?: bigint;
    timestamp: bigint;
}
export interface Message {
    id: bigint;
    deleted: boolean;
    content: string;
    sender: Principal;
    messageType: MessageType;
    conversationId: bigint;
    mediaBlob?: ExternalBlob;
    timestamp: bigint;
    mediaName?: string;
    mediaSize?: bigint;
    replyToId?: bigint;
    reactions: Array<[Principal, string]>;
}
export type FileId = bigint;
export interface EncryptedEmailConfig {
    senderEmail: string;
    encryptedApiKey: Uint8Array;
}
export enum ContactStatus {
    Blocked = "Blocked",
    Accepted = "Accepted",
    Pending = "Pending"
}
export enum ConversationType {
    Group = "Group",
    Direct = "Direct"
}
export enum DisappearingTimer {
    Off = "Off",
    Days30 = "Days30",
    Days7 = "Days7",
    Hours24 = "Hours24"
}
export enum DiscoveryMode {
    Open = "Open",
    Hidden = "Hidden",
    IdOnly = "IdOnly"
}
export enum MessageType {
    File = "File",
    Text = "Text",
    Image = "Image",
    Audio = "Audio",
    Video = "Video"
}
export enum NotificationKind {
    ContactRequest = "ContactRequest",
    StatusReaction = "StatusReaction",
    Mention = "Mention",
    ContactAccepted = "ContactAccepted",
    NewMessage = "NewMessage",
    GroupInvite = "GroupInvite"
}
export interface backendInterface {
    acceptContactRequest(from: Principal): Promise<void>;
    addContactByPrincipal(principalText: string): Promise<void>;
    addGroupMember(conversationId: bigint, member: Principal): Promise<void>;
    addReaction(conversationId: bigint, messageId: bigint, emoji: string): Promise<void>;
    blockUser(target: Principal): Promise<void>;
    clearGroupKeys(conversationId: bigint): Promise<void>;
    createGroupThread(parentGroupId: bigint, name: string): Promise<bigint>;
    getGroupThreads(parentGroupId: bigint): Promise<Array<{ id: bigint; name: string; createdAt: bigint }>>;
    deleteGroupThread(parentGroupId: bigint, threadId: bigint): Promise<void>;
    createGroup(name: string, memberPrincipals: Array<Principal>, avatar: ExternalBlob | null): Promise<bigint>;
    deleteFile(id: FileId): Promise<void>;
    deleteMessage(conversationId: bigint, messageId: bigint): Promise<void>;
    deleteStatus(statusId: bigint): Promise<void>;
    exportUserData(): Promise<ExportData>;
    getAllFiles(): Promise<Array<FileMetadata>>;
    getBlockedUsers(): Promise<Array<PublicProfile>>;
    getContactStatuses(): Promise<Array<StatusUpdate>>;
    getContacts(): Promise<Array<[Contact, PublicProfile]>>;
    getConversations(): Promise<Array<ConversationPreview>>;
    getDisappearingTimer(conversationId: bigint): Promise<DisappearingTimer>;
    getDiscoveryMode(): Promise<DiscoveryMode>;
    getEmailVerificationStatus(): Promise<{
        verified: boolean;
        email?: string;
    }>;
    getEncryptedEmailConfig(): Promise<EncryptedEmailConfig | null>;
    getFile(id: FileId): Promise<FileMetadata>;
    getGroupInfo(conversationId: bigint): Promise<{
        members: Array<PublicProfile>;
        admin: Principal;
        name: string;
        avatar?: ExternalBlob;
    }>;
    getMessages(conversationId: bigint, beforeTimestamp: bigint | null, limit: bigint): Promise<Array<Message>>;
    getMyGroupKey(conversationId: bigint): Promise<WrappedGroupKey | null>;
    getMyStatuses(): Promise<Array<StatusUpdate>>;
    getNotifications(limit: bigint): Promise<Array<Notification>>;
    getPendingRequests(): Promise<Array<[Contact, PublicProfile]>>;
    getProfile(): Promise<Profile | null>;
    getPublicKey(principal: Principal): Promise<Uint8Array | null>;
    getPublicKeys(principals: Array<Principal>): Promise<Array<[Principal, Uint8Array]>>;
    getPublicProfile(target: Principal): Promise<PublicProfile>;
    getShareId(): Promise<string>;
    getTwoFactorStatus(): Promise<{
        emailVerified: boolean;
        email?: string;
        enabled: boolean;
    }>;
    getTypingUsers(conversationId: bigint): Promise<Array<Principal>>;
    getUnreadCount(): Promise<bigint>;
    getVetKdPublicKey(): Promise<Uint8Array>;
    getVetKey(transportPublicKey: Uint8Array): Promise<Uint8Array>;
    importUserData(data: ExportData): Promise<{
        contactsRequested: bigint;
    }>;
    leaveGroup(conversationId: bigint): Promise<void>;
    markAsRead(conversationId: bigint, upToMessageId: bigint): Promise<void>;
    markNotificationsRead(upToId: bigint): Promise<void>;
    postStatus(content: string, mediaBlob: ExternalBlob | null): Promise<bigint>;
    publishGroupKeys(conversationId: bigint, wrappedKeys: Array<[Principal, Uint8Array]>): Promise<void>;
    publishPublicKey(key: Uint8Array): Promise<void>;
    reactToStatus(statusId: bigint, emoji: string): Promise<void>;
    rejectContactRequest(from: Principal): Promise<void>;
    removeContact(target: Principal): Promise<void>;
    removeGroupMember(conversationId: bigint, member: Principal): Promise<void>;
    removeReaction(conversationId: bigint, messageId: bigint, emoji: string): Promise<void>;
    reportUser(target: Principal, reason: string): Promise<void>;
    requestEmailVerification(email: string, apiKey: string, senderEmail: string): Promise<void>;
    requestLoginOtp(apiKey: string, senderEmail: string): Promise<void>;
    searchUsers(searchText: string): Promise<Array<PublicProfile>>;
    sendContactRequest(target: Principal): Promise<void>;
    sendMessage(conversationId: bigint, content: string, messageType: MessageType, mediaBlob: ExternalBlob | null, mediaName: string | null, mediaSize: bigint | null, replyToId: bigint | null, mentionedPrincipals: Array<Principal> | null): Promise<bigint>;
    setDisappearingTimer(conversationId: bigint, timer: DisappearingTimer): Promise<void>;
    setEncryptedEmailConfig(encryptedApiKey: Uint8Array, senderEmail: string): Promise<void>;
    setProfile(name: string, bio: string, avatar: ExternalBlob | null): Promise<void>;
    setTwoFactorEnabled(enabled: boolean): Promise<void>;
    setTyping(conversationId: bigint): Promise<void>;
    startDirectChat(target: Principal): Promise<bigint>;
    toggleNotificationRead(notificationId: bigint): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    unblockUser(target: Principal): Promise<void>;
    updateDiscoveryMode(mode: DiscoveryMode): Promise<void>;
    updateGroup(conversationId: bigint, name: string | null, avatar: ExternalBlob | null): Promise<void>;
    uploadFile(name: string, size: bigint, fileType: string, blob: ExternalBlob): Promise<FileMetadata>;
    verifyEmailOtp(code: string): Promise<void>;
    verifyLoginOtp(code: string): Promise<boolean>;
}
