import { cn } from "@/lib/utils";
import {
  Download,
  FileArchive,
  FileAudio,
  FileIcon,
  FileText,
  FileVideo,
} from "lucide-react";
import type { Message } from "../hooks/useQueries";
import { formatFileSize, formatMessageTime } from "../utils/formatting";

interface FileMessageProps {
  message: Message;
  isMine: boolean;
  onClick: () => void;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf", "doc", "docx", "txt", "rtf"].includes(ext)) return FileText;
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return FileArchive;
  if (["mp3", "wav", "ogg", "m4a", "flac"].includes(ext)) return FileAudio;
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) return FileVideo;
  return FileIcon;
}

export function FileMessage({ message, isMine, onClick }: FileMessageProps) {
  const name = message.mediaName ?? "File";
  const Icon = getFileIcon(name);

  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden max-w-[280px]",
        isMine
          ? "bg-primary text-primary-foreground rounded-br-md"
          : "bg-muted text-foreground rounded-bl-md",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-3 px-3.5 py-3 transition-colors text-left",
          isMine ? "hover:bg-primary/90" : "hover:bg-muted/80",
        )}
      >
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            isMine ? "bg-primary-foreground/15" : "bg-primary/10",
          )}
        >
          <Icon
            className={cn(
              "w-5 h-5",
              isMine ? "text-primary-foreground" : "text-primary",
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{name}</p>
          {message.mediaSize !== null && message.mediaSize !== undefined && (
            <p
              className={cn(
                "text-[11px]",
                isMine ? "text-primary-foreground/60" : "text-muted-foreground",
              )}
            >
              {formatFileSize(message.mediaSize)}
            </p>
          )}
        </div>
        <Download
          className={cn(
            "w-4 h-4 shrink-0",
            isMine ? "text-primary-foreground/60" : "text-muted-foreground",
          )}
        />
      </button>
      {message.content && message.content !== "" && (
        <div className="px-3.5 pb-2 -mt-1">
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
      )}
      <p
        className={cn(
          "text-[10px] px-3.5 pb-2 text-right",
          isMine ? "text-primary-foreground/60" : "text-muted-foreground",
        )}
      >
        {formatMessageTime(message.timestamp)}
      </p>
    </div>
  );
}
