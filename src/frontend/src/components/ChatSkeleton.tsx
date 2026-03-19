import { cn } from "@/lib/utils";

const bubbles = [
  { id: "sk-1", mine: false, width: "w-[55%]", lines: 1 },
  { id: "sk-2", mine: true, width: "w-[40%]", lines: 1 },
  { id: "sk-3", mine: false, width: "w-[65%]", lines: 2 },
  { id: "sk-4", mine: true, width: "w-[50%]", lines: 1 },
  { id: "sk-5", mine: false, width: "w-[35%]", lines: 1 },
  { id: "sk-6", mine: true, width: "w-[60%]", lines: 2 },
  { id: "sk-7", mine: false, width: "w-[45%]", lines: 1 },
];

export function ChatSkeleton() {
  return (
    <div className="px-4 py-3 space-y-3">
      {bubbles.map((b, i) => (
        <div
          key={b.id}
          className={cn("flex mb-1", b.mine ? "justify-end" : "justify-start")}
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className={cn("max-w-[75%]", b.width)}>
            <div
              className={cn(
                "rounded-2xl px-3.5 py-2.5 space-y-1.5 animate-pulse",
                b.mine
                  ? "bg-primary/15 rounded-br-md"
                  : "bg-muted rounded-bl-md",
              )}
              style={{ animationDelay: `${i * 150}ms` }}
            >
              {Array.from({ length: b.lines }).map((_, l) => (
                <div
                  key={`${b.id}-line-${l}`}
                  className={cn(
                    "h-3 rounded-full",
                    b.mine ? "bg-primary/15" : "bg-muted-foreground/10",
                    l === b.lines - 1 && b.lines > 1 ? "w-3/4" : "w-full",
                  )}
                />
              ))}
              <div
                className={cn(
                  "h-2 rounded-full w-12 ml-auto",
                  b.mine ? "bg-primary/10" : "bg-muted-foreground/[0.06]",
                )}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
