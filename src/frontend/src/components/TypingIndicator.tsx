import { useTypingUsers } from "../hooks/useQueries";
import type { ConversationPreview } from "../hooks/useQueries";

interface TypingIndicatorProps {
  conversation: ConversationPreview;
}

export function TypingIndicator({ conversation }: TypingIndicatorProps) {
  const { data: typingPrincipals = [] } = useTypingUsers(conversation.id);

  if (typingPrincipals.length === 0) return null;

  const names = typingPrincipals
    .map((p) => {
      const member = conversation.members.find(
        (m) => m.principal.toString() === p.toString(),
      );
      return member?.name ?? "Someone";
    })
    .slice(0, 3);

  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing`
        : `${names[0]} and others are typing`;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5">
      <div className="flex gap-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-xs text-muted-foreground italic">{label}</span>
    </div>
  );
}
