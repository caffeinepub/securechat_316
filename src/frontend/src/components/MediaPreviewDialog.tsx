import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

interface MediaPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null;
  name: string;
  isVideo?: boolean;
}

export function MediaPreviewDialog({
  open,
  onOpenChange,
  url,
  name,
  isVideo,
}: MediaPreviewDialogProps) {
  const [loaded, setLoaded] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (open) setLoaded(false);
  }, [open, url]);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  if (!open || !url) return null;

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.target = "_blank";
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white"
          onClick={handleDownload}
        >
          <Download className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white"
          onClick={() => onOpenChange(false)}
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* File name */}
      <div className="absolute top-4 left-4 z-10">
        <p className="text-white/90 text-sm font-medium truncate max-w-[300px]">
          {name}
        </p>
      </div>

      {/* Media content */}
      <div className="relative z-10 max-w-[90vw] max-h-[85vh]">
        {!loaded && (
          <div className="flex items-center justify-center w-48 h-48">
            <Loader2 className="w-8 h-8 animate-spin text-white/60" />
          </div>
        )}
        {isVideo ? (
          // biome-ignore lint/a11y/useMediaCaption: user-uploaded media without captions
          <video
            src={url}
            controls
            autoPlay
            aria-label={name}
            className={cn(
              "max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl",
              loaded ? "opacity-100" : "opacity-0 h-0",
            )}
            onLoadedData={() => setLoaded(true)}
          />
        ) : (
          <img
            src={url}
            alt={name}
            className={cn(
              "max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl object-contain",
              loaded ? "opacity-100" : "opacity-0 h-0",
            )}
            onLoad={() => setLoaded(true)}
          />
        )}
      </div>
    </div>
  );
}
