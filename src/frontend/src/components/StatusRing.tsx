import { cn } from "@/lib/utils";
import type { ExternalBlob } from "../hooks/useQueries";
import { UserAvatar } from "./UserAvatar";

interface StatusRingProps {
  name: string;
  avatarBlob?: ExternalBlob | null;
  hasUnviewed: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

const sizeMap = {
  sm: {
    ring: "w-10 h-10",
    avatar: "h-8 w-8",
    text: "text-[10px]",
    border: "2px",
  },
  md: {
    ring: "w-12 h-12",
    avatar: "h-10 w-10",
    text: "text-xs",
    border: "2px",
  },
  lg: {
    ring: "w-16 h-16",
    avatar: "h-[52px] w-[52px]",
    text: "text-sm",
    border: "3px",
  },
};

export function StatusRing({
  name,
  avatarBlob,
  hasUnviewed,
  size = "md",
  onClick,
}: StatusRingProps) {
  const s = sizeMap[size];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "rounded-full flex items-center justify-center shrink-0 transition-all",
        s.ring,
        hasUnviewed ? "bg-gradient-to-tr from-primary to-chart-5" : "bg-border",
        onClick && "hover:scale-105 active:scale-95",
      )}
      style={{ padding: s.border }}
    >
      <UserAvatar
        name={name}
        avatarBlob={avatarBlob ?? null}
        className={cn(s.avatar, "border-2 border-background")}
        fallbackClassName={s.text}
      />
    </button>
  );
}
