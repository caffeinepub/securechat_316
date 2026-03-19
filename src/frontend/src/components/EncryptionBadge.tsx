import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

interface EncryptionBadgeProps {
  className?: string;
}

export function EncryptionBadge({ className }: EncryptionBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 text-muted-foreground",
        className,
      )}
    >
      <Lock className="w-3 h-3" />
      <span className="text-[11px]">Encrypted</span>
    </div>
  );
}
