import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import type { Message } from "../hooks/useQueries";
import { formatMessageTime } from "../utils/formatting";

interface ImageMessageProps {
  message: Message;
  isMine: boolean;
  onClick: () => void;
}

export function ImageMessage({ message, isMine, onClick }: ImageMessageProps) {
  const [loaded, setLoaded] = useState(false);
  const url = message.mediaBlob
    ? (message.mediaBlob as any).getDirectURL()
    : null;

  if (!url) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "block rounded-2xl overflow-hidden max-w-[260px] relative group",
        isMine ? "rounded-br-md" : "rounded-bl-md",
      )}
    >
      {!loaded && (
        <div className="w-[260px] h-[180px] bg-muted flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}
      <img
        src={url}
        alt={message.mediaName ?? "Image"}
        className={cn(
          "max-w-[260px] max-h-[320px] object-cover transition-opacity",
          loaded ? "opacity-100" : "opacity-0 h-0",
        )}
        onLoad={() => setLoaded(true)}
      />
      {/* Gradient overlay with timestamp */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-1.5">
        <p className="text-[10px] text-white/80 text-right">
          {formatMessageTime(message.timestamp)}
        </p>
      </div>
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      {message.content && message.content !== "" && (
        <div
          className={cn(
            "px-3 py-1.5 text-sm text-left",
            isMine
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground",
          )}
        >
          {message.content}
        </div>
      )}
    </button>
  );
}
