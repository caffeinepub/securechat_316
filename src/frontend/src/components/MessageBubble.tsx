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
import { cn } from "@/lib/utils";
import { Download, Lock, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import type { Message } from "../hooks/useQueries";
import { isEncryptedMessage } from "../utils/e2ee";
import { formatFileSize, formatMessageTime } from "../utils/formatting";
import { FileMessage } from "./FileMessage";
import { ImageMessage } from "./ImageMessage";
import { MessageActions } from "./MessageActions";

interface MessageBubbleProps {
  message: Message;
  displayContent?: string;
  isMine: boolean;
  showSender: boolean;
  senderName: string;
  conversationId: bigint;
  onReply: () => void;
  replyToSenderName?: string;
  replyToContent?: string;
}

function isImageType(msg: Message): boolean {
  return msg.messageType === "Image";
}

function isVideoType(msg: Message): boolean {
  return msg.messageType === "Video";
}

function isFileType(msg: Message): boolean {
  return msg.messageType === "File" || msg.messageType === "Audio";
}

export function MessageBubble({
  message,
  displayContent,
  isMine,
  showSender,
  senderName,
  conversationId,
  onReply,
  replyToSenderName,
  replyToContent,
}: MessageBubbleProps) {
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const hasMedia =
    message.mediaBlob !== null && message.mediaBlob !== undefined;
  const isImage = isImageType(message) || isVideoType(message);
  const isFile = isFileType(message);
  const content = displayContent ?? message.content;
  const encrypted = isEncryptedMessage(message.content);
  const decryptFailed = encrypted && content === "[Unable to decrypt]";

  const mediaUrl =
    hasMedia && message.mediaBlob
      ? (message.mediaBlob as any).getDirectURL()
      : null;
  const mediaName = message.mediaName ?? "File";

  const handleDownload = () => {
    if (!mediaUrl) return;
    const a = document.createElement("a");
    a.href = mediaUrl;
    a.download = mediaName;
    a.target = "_blank";
    a.click();
    setShowDownloadDialog(false);
  };

  if (message.deleted) {
    return (
      <div
        className={cn("flex mb-1", isMine ? "justify-end" : "justify-start")}
      >
        <div className="px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-xs italic max-w-[75%]">
          Message deleted
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex mb-1 animate-message-in group",
        isMine ? "justify-end" : "justify-start",
      )}
    >
      <div className="max-w-[75%] relative">
        {showSender && !isMine && (
          <p className="text-[10px] font-semibold text-primary ml-3 mb-0.5">
            {senderName}
          </p>
        )}

        {/* Reply reference */}
        {message.replyToId !== null && message.replyToId !== undefined && (
          <div
            className={cn(
              "px-3 py-1 mb-0.5 rounded-t-xl text-[11px] border-l-2",
              isMine
                ? "bg-primary/20 border-primary-foreground/30 text-primary-foreground/70"
                : "bg-muted/80 border-primary text-muted-foreground",
            )}
          >
            {replyToSenderName && (
              <span className="font-semibold">{replyToSenderName}</span>
            )}
            <p className="truncate opacity-80">
              {replyToContent ?? "Replied to a message"}
            </p>
          </div>
        )}

        <div className="flex items-end gap-1">
          {/* Actions button (shown on hover) */}
          {isMine && (
            <MessageActions
              conversationId={conversationId}
              messageId={message.id}
              isMine={isMine}
              messageContent={message.content}
              onReply={onReply}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </MessageActions>
          )}

          {hasMedia && isImage ? (
            <ImageMessage
              message={message}
              isMine={isMine}
              onClick={() => setShowDownloadDialog(true)}
            />
          ) : hasMedia && isFile ? (
            <FileMessage
              message={message}
              isMine={isMine}
              onClick={() => setShowDownloadDialog(true)}
            />
          ) : (
            <div
              className={cn(
                "px-3.5 py-2 rounded-2xl text-sm leading-relaxed",
                isMine
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md",
              )}
            >
              <p
                className={cn(
                  "whitespace-pre-wrap break-words",
                  decryptFailed && "italic opacity-70",
                )}
              >
                {content}
              </p>
              <div
                className={cn(
                  "flex items-center justify-end gap-1 mt-1",
                  isMine
                    ? "text-primary-foreground/60"
                    : "text-muted-foreground",
                )}
              >
                {encrypted && <Lock className="w-2.5 h-2.5" />}
                <span className="text-[10px]">
                  {formatMessageTime(message.timestamp)}
                </span>
              </div>
            </div>
          )}

          {/* Actions button for received messages */}
          {!isMine && (
            <MessageActions
              conversationId={conversationId}
              messageId={message.id}
              isMine={isMine}
              messageContent={message.content}
              onReply={onReply}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </MessageActions>
          )}
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div
            className={cn(
              "flex gap-1 mt-0.5",
              isMine ? "justify-end" : "justify-start",
            )}
          >
            {groupReactions(message.reactions).map(([emoji, count]) => (
              <span
                key={emoji}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-muted text-xs"
              >
                {emoji}
                {count > 1 && (
                  <span className="text-[10px] text-muted-foreground">
                    {count}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {hasMedia && (
        <AlertDialog
          open={showDownloadDialog}
          onOpenChange={setShowDownloadDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Download file</AlertDialogTitle>
              <AlertDialogDescription className="flex flex-col gap-1">
                <span className="font-medium text-foreground truncate">
                  {mediaName}
                </span>
                {message.mediaSize !== null &&
                  message.mediaSize !== undefined && (
                    <span className="text-muted-foreground">
                      {formatFileSize(message.mediaSize)}
                    </span>
                  )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDownload}>
                <Download className="h-4 w-4" />
                Download
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function groupReactions(reactions: [unknown, string][]): [string, number][] {
  const map = new Map<string, number>();
  for (const [, emoji] of reactions) {
    map.set(emoji, (map.get(emoji) ?? 0) + 1);
  }
  return Array.from(map.entries());
}
