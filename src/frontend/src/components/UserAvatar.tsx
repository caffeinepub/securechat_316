import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import type { ExternalBlob } from "../hooks/useQueries";

interface UserAvatarProps {
  name: string;
  avatarBlob: ExternalBlob | null;
  className?: string;
  fallbackClassName?: string;
}

export function UserAvatar({
  name,
  avatarBlob,
  className,
  fallbackClassName,
}: UserAvatarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!avatarBlob) {
      setAvatarUrl(null);
      return;
    }
    setAvatarUrl(avatarBlob.getDirectURL());
  }, [avatarBlob]);

  const initials = name.charAt(0).toUpperCase();

  return (
    <Avatar className={className}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
      <AvatarFallback
        className={cn(
          "bg-primary/15 text-primary font-semibold",
          fallbackClassName,
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
