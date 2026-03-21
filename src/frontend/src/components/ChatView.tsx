import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowLeft,
  FileIcon,
  Image as ImageIcon,
  Info,
  Loader2,
  Lock,
  LockOpen,
  Mic,
  Paperclip,
  Send,
  Shield,
  Square,
  Timer,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useE2EE } from "../hooks/useE2EE";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { ExternalBlob, type MessageType } from "../hooks/useQueries";
import {
  useMarkAsRead,
  useMessages,
  useSendMessage,
  useSetTyping,
} from "../hooks/useQueries";
import { ConversationType } from "../hooks/useQueries";
import type { ConversationPreview, Message } from "../hooks/useQueries";
import { useSync } from "../hooks/useSync";
import { isEncryptedMessage } from "../utils/e2ee";
import { formatFileSize } from "../utils/formatting";
import { ChatSkeleton } from "./ChatSkeleton";
import { DisappearingTimerDialog } from "./DisappearingTimerDialog";
import { GroupInfoPanel } from "./GroupInfoPanel";
import { MessageBubble } from "./MessageBubble";
import { SafetyNumberDialog } from "./SafetyNumberDialog";
import { SystemMessage } from "./SystemMessage";
import { TypingIndicator } from "./TypingIndicator";
import { UserAvatar } from "./UserAvatar";

interface ChatViewProps {
  conversation: ConversationPreview;
  onBack: () => void;
}

function formatRecordingTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ChatView({ conversation, onBack }: ChatViewProps) {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString() ?? "";

  const {
    data: messages = [],
    isLoading,
    isError,
  } = useMessages(conversation.id);
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  const { mutate: markAsRead } = useMarkAsRead();
  const { mutate: setTyping } = useSetTyping();

  // DTN sync hook — provides offline detection and outbox count
  const {
    isOnline,
    outboxCount,
    sendMessage: syncSend,
  } = useSync(conversation.id);

  const [text, setText] = useState("");
  const lastTypingSent = useRef(0);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showTimerDialog, setShowTimerDialog] = useState(false);
  const [showSafetyNumber, setShowSafetyNumber] = useState(false);
  const [decryptedContents, setDecryptedContents] = useState<
    Map<bigint, string>
  >(new Map());

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Scroll / new-message notification state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);
  const initialScrollDone = useRef(false);
  const [showNewMsgPill, setShowNewMsgPill] = useState(false);

  // Free tier default: 30s. TODO: wire to subscription tier
  const MAX_RECORDING_SECONDS = 30;

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const name = getConvName(conversation);
  const isGroup =
    conversation.conversationType &&
    conversation.conversationType === ConversationType.Group;

  const {
    encryptionReady,
    isInitializing,
    encrypt,
    decryptMessages,
    myPublicKeyRaw,
  } = useE2EE(conversation);

  // Helper: check if scroll container is near bottom
  const checkIsAtBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  // Scroll to bottom using direct container manipulation (avoids mobile scrollIntoView issues)
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    setShowNewMsgPill(false);
    isAtBottomRef.current = true;
  }, []);

  // Track scroll position
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handleScroll = () => {
      isAtBottomRef.current = checkIsAtBottom();
      if (isAtBottomRef.current) setShowNewMsgPill(false);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [checkIsAtBottom]);

  // Initial scroll to bottom (instant) once messages load
  // Use rAF inside timeout to ensure DOM has painted
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (!isLoading && messages.length > 0 && !initialScrollDone.current) {
      const tid = setTimeout(() => {
        requestAnimationFrame(() => {
          scrollToBottom("instant" as ScrollBehavior);
          initialScrollDone.current = true;
          prevMessageCountRef.current = messages.length;
        });
      }, 80);
      return () => clearTimeout(tid);
    }
  }, [isLoading, messages.length, scrollToBottom]);

  // On new messages after initial load
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (!initialScrollDone.current) return;
    if (messages.length <= prevMessageCountRef.current) {
      prevMessageCountRef.current = messages.length;
      return;
    }
    prevMessageCountRef.current = messages.length;

    if (isAtBottomRef.current) {
      scrollToBottom("smooth");
    } else {
      setShowNewMsgPill(true);
    }
  }, [messages.length]);

  // Mark as read when messages load
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      markAsRead({
        conversationId: conversation.id,
        upToMessageId: lastMsg.id,
      });
    }
  }, [messages.length, conversation.id, markAsRead]);

  // Decrypt messages when they load or key becomes available
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (messages.length === 0) return;
    decryptMessages(messages).then(setDecryptedContents);
  }, [messages, decryptMessages, encryptionReady]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const sendAudioBlob = useCallback(
    async (audioBlob: Blob) => {
      try {
        setUploadProgress(0);
        const arrayBuffer = await audioBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let mediaBlob = ExternalBlob.fromBytes(uint8Array);
        mediaBlob = mediaBlob.withUploadProgress((pct: number) =>
          setUploadProgress(pct),
        );
        const msgType = { Audio: null } as unknown as MessageType;

        sendMessage(
          {
            conversationId: conversation.id,
            content: "",
            messageType: msgType,
            mediaBlob,
            mediaName: `voice-note-${Date.now()}.webm`,
            mediaSize: BigInt(uint8Array.length),
            replyToId: replyTo ? replyTo.id : null,
            mentionedPrincipals: null,
          },
          {
            onSuccess: () => {
              setReplyTo(null);
              setUploadProgress(null);
            },
            onError: () => {
              toast.error("Failed to send voice note");
              setUploadProgress(null);
            },
          },
        );
      } catch {
        toast.error("Failed to prepare voice note");
        setUploadProgress(null);
      }
    },
    [conversation.id, replyTo, sendMessage],
  );

  const stopRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    setRecordingSeconds(0);

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // Stop all stream tracks
        for (const track of stream.getTracks()) track.stop();

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size > 0) {
          sendAudioBlob(audioBlob);
        }
        audioChunksRef.current = [];
      };

      recorder.start(250); // collect in 250ms chunks
      setIsRecording(true);
      setRecordingSeconds(0);

      let elapsed = 0;
      recordingTimerRef.current = setInterval(() => {
        elapsed += 1;
        setRecordingSeconds(elapsed);
        if (elapsed >= MAX_RECORDING_SECONDS) {
          stopRecording();
        }
      }, 1000);
    } catch {
      toast.error(
        "Microphone access denied. Please allow microphone permissions.",
      );
    }
  }, [sendAudioBlob, stopRecording]);

  const getMessageType = useCallback((file: File | null) => {
    if (!file) return { Text: null };
    if (file.type.startsWith("image/")) return { Image: null };
    if (file.type.startsWith("video/")) return { Video: null };
    if (file.type.startsWith("audio/")) return { Audio: null };
    return { File: null };
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed && !pendingFile) return;

    // --- Media / file path: use legacy IC mutation directly ---
    if (pendingFile) {
      let mediaBlob: ExternalBlob | null = null;
      let mediaName: string | null = null;
      let mediaSize: bigint | null = null;
      const msgType = getMessageType(pendingFile) as unknown as MessageType;

      try {
        setUploadProgress(0);
        const arrayBuffer = await pendingFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        mediaBlob = ExternalBlob.fromBytes(uint8Array);
        mediaBlob.withUploadProgress((pct: number) => setUploadProgress(pct));
        mediaName = pendingFile.name;
        mediaSize = BigInt(pendingFile.size);
      } catch {
        toast.error("Failed to prepare file");
        setUploadProgress(null);
        return;
      }

      // Parse @mentions from plaintext before encrypting
      let mentionedPrincipals: string[] | null = null;
      if (encryptionReady && trimmed && conversation.members) {
        const mentionNames = parseMentions(trimmed);
        if (mentionNames.length > 0) {
          mentionedPrincipals = [];
          for (const m of conversation.members) {
            if (mentionNames.some((mn) => m.name.toLowerCase().includes(mn))) {
              mentionedPrincipals.push(m.principal.toString());
            }
          }
        }
      }

      const contentToSend =
        encryptionReady && trimmed ? await encrypt(trimmed) : trimmed;

      sendMessage(
        {
          conversationId: conversation.id,
          content: contentToSend,
          messageType: msgType,
          mediaBlob,
          mediaName,
          mediaSize,
          replyToId: replyTo ? replyTo.id : null,
          mentionedPrincipals: encryptionReady ? mentionedPrincipals : null,
        },
        {
          onSuccess: () => {
            setText("");
            setReplyTo(null);
            setPendingFile(null);
            setUploadProgress(null);
            inputRef.current?.focus();
          },
          onError: () => {
            toast.error("Failed to send message");
            setUploadProgress(null);
          },
        },
      );
      return;
    }

    // --- Text-only path: route through DTN outbox ---
    // Parse @mentions before encrypting
    let mentionedPrincipals: string[] | null = null;
    if (encryptionReady && conversation.members) {
      const mentionNames = parseMentions(trimmed);
      if (mentionNames.length > 0) {
        mentionedPrincipals = [];
        for (const m of conversation.members) {
          if (mentionNames.some((mn) => m.name.toLowerCase().includes(mn))) {
            mentionedPrincipals.push(m.principal.toString());
          }
        }
      }
    }

    // Encrypt if E2EE is ready
    const contentToSend = encryptionReady ? await encrypt(trimmed) : trimmed;

    try {
      await syncSend({
        conversationId: conversation.id,
        content: contentToSend,
        messageType: "Text" as unknown as string,
        recipientHint: conversation.members?.[0]?.principal?.toString(),
        replyToId: replyTo ? replyTo.id : undefined,
        mentionedPrincipals,
      });
      setText("");
      setReplyTo(null);
      inputRef.current?.focus();
    } catch {
      toast.error("Failed to send message");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File must be under 10 MB");
        return;
      }
      setPendingFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleReply = (msg: Message) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  };

  return (
    <>
      {/* Use h-full so the parent AppShell container controls height */}
      <div className="flex flex-col h-full">
        {/* Chat header */}
        <div className="shrink-0 px-3 py-2.5 border-b flex items-center gap-3 bg-background">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={onBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <UserAvatar
            name={name}
            avatarBlob={
              isGroup
                ? ((conversation.groupInfo as { avatar?: ExternalBlob | null })
                    ?.avatar ?? null)
                : (conversation.members?.[0]?.avatar ?? null)
            }
            className="h-9 w-9 shrink-0"
            fallbackClassName={cn(
              "text-xs",
              isGroup
                ? "bg-secondary text-secondary-foreground"
                : "bg-primary/15 text-primary",
            )}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{name}</p>
            {isGroup && conversation.members && (
              <p className="text-[11px] text-muted-foreground">
                {conversation.members.length + 1} members
              </p>
            )}
          </div>
          {encryptionReady && !isGroup && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setShowSafetyNumber(true)}
            >
              <Shield className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => setShowTimerDialog(true)}
          >
            <Timer className="w-4 h-4" />
          </Button>
          {/* Offline badge — shown when device has no network */}
          {!isOnline && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-medium shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
              Offline
            </div>
          )}
          {isGroup && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setShowGroupInfo(true)}
            >
              <Info className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Messages area — relative so new-message pill can be positioned inside */}
        <div className="relative flex-1 min-h-0">
          <div ref={scrollContainerRef} className="h-full overflow-y-auto">
            <div className="px-4 py-3 space-y-1">
              {encryptionReady ? (
                <div className="flex items-center justify-center gap-1.5 py-2 mb-2">
                  <Lock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">
                    Messages are end-to-end encrypted
                  </span>
                </div>
              ) : (
                !isInitializing && (
                  <div className="flex items-center justify-center gap-1.5 py-2 mb-2">
                    <LockOpen className="w-3 h-3 text-destructive" />
                    <span className="text-[11px] text-destructive">
                      Messages are not encrypted — waiting for key exchange
                    </span>
                  </div>
                )
              )}

              {(isLoading ||
                (isInitializing &&
                  messages.some((m) => isEncryptedMessage(m.content)))) && (
                <ChatSkeleton />
              )}

              {isError && (
                <div className="text-destructive text-center py-12 text-sm">
                  Failed to load messages.
                </div>
              )}

              {!isLoading &&
                !isInitializing &&
                !isError &&
                messages.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    No messages yet. Say hello!
                  </div>
                )}

              {!(
                isLoading ||
                (isInitializing &&
                  messages.some((m) => isEncryptedMessage(m.content)))
              ) &&
                messages.map((msg) => {
                  const displayContent =
                    decryptedContents.get(msg.id) ?? msg.content;
                  const isSystem = isSystemMessage(displayContent, msg.content);
                  if (isSystem) {
                    return (
                      <SystemMessage
                        key={Number(msg.id)}
                        text={displayContent}
                      />
                    );
                  }
                  const replyMsg =
                    msg.replyToId != null
                      ? messages.find((m) => m.id === msg.replyToId)
                      : undefined;
                  return (
                    <MessageBubble
                      key={Number(msg.id)}
                      message={msg}
                      displayContent={displayContent}
                      isMine={msg.sender.toString() === myPrincipal}
                      showSender={!!isGroup}
                      senderName={getSenderName(msg, conversation)}
                      conversationId={conversation.id}
                      onReply={() => handleReply(msg)}
                      replyToSenderName={
                        replyMsg
                          ? replyMsg.sender.toString() === myPrincipal
                            ? "You"
                            : getSenderName(replyMsg, conversation)
                          : undefined
                      }
                      replyToContent={
                        replyMsg
                          ? (decryptedContents.get(replyMsg.id) ??
                            replyMsg.content)
                          : undefined
                      }
                    />
                  );
                })}

              {/* Scroll anchor (visual only) */}
              <div ref={bottomRef} className="h-px" />
            </div>
          </div>

          {/* New message floating pill */}
          <AnimatePresence>
            {showNewMsgPill && (
              <motion.button
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                onClick={() => scrollToBottom("smooth")}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg cursor-pointer select-none z-10"
                data-ocid="chat.new_message_pill"
              >
                New message
                <ArrowDown className="w-3 h-3" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Reply preview */}
        {replyTo && (
          <div className="shrink-0 px-3 py-2 border-t bg-accent/50 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-primary">
                Replying to{" "}
                {replyTo.sender.toString() === myPrincipal
                  ? "yourself"
                  : getSenderName(replyTo, conversation)}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {decryptedContents.get(replyTo.id) ?? replyTo.content}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => setReplyTo(null)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* Pending file preview */}
        {pendingFile && (
          <div className="shrink-0 px-3 py-2 border-t bg-accent/50 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {pendingFile.type.startsWith("image/") ? (
                <ImageIcon className="w-4 h-4 text-primary" />
              ) : (
                <FileIcon className="w-4 h-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{pendingFile.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatFileSize(pendingFile.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => setPendingFile(null)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* Upload progress */}
        {uploadProgress !== null && (
          <div className="shrink-0 px-3">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Typing indicator */}
        <TypingIndicator conversation={conversation} />

        {/* Input bar — shrink-0 keeps it pinned; pb clears iOS home indicator */}
        <form
          onSubmit={handleSend}
          className="shrink-0 px-3 py-2.5 border-t bg-background flex items-center gap-2 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
          />

          {isRecording ? (
            /* Recording state */
            <>
              <div className="flex items-center gap-2 flex-1 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
                <span className="inline-flex h-2 w-2 rounded-full bg-destructive animate-pulse shrink-0" />
                <span className="text-sm font-medium text-destructive tabular-nums">
                  {formatRecordingTime(recordingSeconds)}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  / {formatRecordingTime(MAX_RECORDING_SECONDS)}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={stopRecording}
                data-ocid="voice.toggle"
              >
                <Square className="w-4 h-4" fill="currentColor" />
              </Button>
            </>
          ) : (
            /* Normal state */
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending || uploadProgress !== null}
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Input
                ref={inputRef}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  const now = Date.now();
                  if (now - lastTypingSent.current > 3000) {
                    lastTypingSent.current = now;
                    setTyping(conversation.id);
                  }
                }}
                placeholder="Type a message..."
                className="flex-1"
              />
              {/* Mic button - only show when text is empty and no pending file */}
              {!text.trim() && !pendingFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={startRecording}
                  disabled={isSending || uploadProgress !== null}
                  data-ocid="voice.toggle"
                >
                  <Mic className="w-4 h-4" />
                </Button>
              )}
              {/* Send button with DTN outbox badge */}
              <Button
                type="submit"
                size="icon"
                disabled={(!text.trim() && !pendingFile) || isSending}
                className="h-9 w-9 shrink-0 relative"
                data-ocid="chat.submit_button"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {outboxCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-[9px] text-white flex items-center justify-center font-bold">
                    {outboxCount > 9 ? "9+" : outboxCount}
                  </span>
                )}
              </Button>
            </>
          )}
        </form>
      </div>

      {/* Group info panel */}
      {isGroup && (
        <GroupInfoPanel
          open={showGroupInfo}
          onOpenChange={setShowGroupInfo}
          conversationId={conversation.id}
          onLeft={onBack}
        />
      )}

      <DisappearingTimerDialog
        open={showTimerDialog}
        onOpenChange={setShowTimerDialog}
        conversationId={conversation.id}
      />

      {!isGroup && conversation.members?.[0] && (
        <SafetyNumberDialog
          open={showSafetyNumber}
          onOpenChange={setShowSafetyNumber}
          peerName={conversation.members[0].name}
          peerPrincipal={conversation.members[0].principal.toString()}
          myPublicKeyRaw={myPublicKeyRaw}
        />
      )}
    </>
  );
}

function parseMentions(text: string): string[] {
  const mentions: string[] = [];
  const regex = /@(\S+)/g;
  let match: RegExpExecArray | null = regex.exec(text);
  while (match !== null) {
    mentions.push(match[1].toLowerCase());
    match = regex.exec(text);
  }
  return mentions;
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

function isSystemMessage(displayContent: string, rawContent: string): boolean {
  // Encrypted messages are never system messages
  if (rawContent.startsWith("e2e:")) return false;
  const patterns = [
    " joined",
    " left",
    " was removed",
    " was added",
    " created the group",
    " changed the group",
  ];
  return patterns.some((p) => displayContent.includes(p));
}

function getSenderName(msg: Message, conv: ConversationPreview): string {
  const senderStr = msg.sender.toString();
  for (const m of conv.members) {
    if (m.principal.toString() === senderStr) return m.name;
  }
  return "You";
}
