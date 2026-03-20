import { cn } from "@/lib/utils";
import { Mic, Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Message } from "../hooks/useQueries";
import { formatMessageTime } from "../utils/formatting";

interface VoiceMessageProps {
  message: Message;
  isMine: boolean;
}

function estimateDuration(bytes: bigint | null | undefined): number {
  if (!bytes) return 0;
  // ~16KB/s for opus/webm
  return Math.round(Number(bytes) / 16384);
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceMessage({ message, isMine }: VoiceMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const mediaUrl =
    message.mediaBlob != null
      ? (message.mediaBlob as any).getDirectURL()
      : null;

  const estimatedDuration = estimateDuration(message.mediaSize);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () =>
      setDuration(Math.round(audio.duration) || estimatedDuration);
    const onTimeUpdate = () => setCurrentTime(Math.floor(audio.currentTime));
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [estimatedDuration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !mediaUrl) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const displayDuration = duration || estimatedDuration;
  const progress =
    displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-3 py-2.5 rounded-2xl min-w-[180px] max-w-[260px]",
        isMine
          ? "bg-primary text-primary-foreground rounded-br-md"
          : "bg-muted text-foreground rounded-bl-md",
      )}
    >
      {mediaUrl && (
        // biome-ignore lint/a11y/useMediaCaption: voice note
        <audio ref={audioRef} src={mediaUrl} preload="metadata" />
      )}

      {/* Play/Pause button */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={!mediaUrl}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-opacity",
          isMine
            ? "bg-primary-foreground/20 hover:bg-primary-foreground/30"
            : "bg-primary/10 hover:bg-primary/20",
          !mediaUrl && "opacity-40 cursor-not-allowed",
        )}
      >
        {isPlaying ? (
          <Square className="w-3.5 h-3.5" fill="currentColor" />
        ) : (
          <Play className="w-3.5 h-3.5" fill="currentColor" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        {/* Waveform-like progress bar */}
        <div
          className={cn(
            "h-1.5 rounded-full overflow-hidden mb-1.5",
            isMine ? "bg-primary-foreground/20" : "bg-muted-foreground/20",
          )}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-200",
              isMine ? "bg-primary-foreground/70" : "bg-primary",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div
          className={cn(
            "flex items-center justify-between text-[10px]",
            isMine ? "text-primary-foreground/60" : "text-muted-foreground",
          )}
        >
          <div className="flex items-center gap-1">
            <Mic className="w-2.5 h-2.5" />
            <span>
              {isPlaying || currentTime > 0
                ? formatDuration(currentTime)
                : formatDuration(displayDuration)}
            </span>
          </div>
          <span>{formatMessageTime(message.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}
