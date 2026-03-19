import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface SettingsItemProps {
  icon: React.ElementType;
  label: string;
  description: string;
  onClick?: () => void;
}

export function SettingsItem({
  icon: Icon,
  label,
  description,
  onClick,
}: SettingsItemProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left",
        onClick && "hover:bg-accent transition-colors",
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {onClick && (
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      )}
    </Comp>
  );
}
