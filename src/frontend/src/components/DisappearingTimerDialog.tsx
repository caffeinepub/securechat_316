import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Loader2, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  useDisappearingTimer,
  useSetDisappearingTimer,
} from "../hooks/useQueries";

const TIMER_OPTIONS = [
  { label: "Off", value: "Off", description: "Messages persist indefinitely" },
  {
    label: "24 hours",
    value: "Hours24",
    description: "Messages disappear after 1 day",
  },
  {
    label: "7 days",
    value: "Days7",
    description: "Messages disappear after 1 week",
  },
  {
    label: "30 days",
    value: "Days30",
    description: "Messages disappear after 1 month",
  },
] as const;

interface DisappearingTimerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: bigint;
}

export function DisappearingTimerDialog({
  open,
  onOpenChange,
  conversationId,
}: DisappearingTimerDialogProps) {
  const { data: currentTimer } = useDisappearingTimer(conversationId);
  const { mutate: setTimer, isPending } = useSetDisappearingTimer();
  const [selected, setSelected] = useState("Off");

  useEffect(() => {
    if (currentTimer && open) {
      setSelected(currentTimer);
    }
  }, [currentTimer, open]);

  const handleSave = () => {
    const timerValue = { [selected]: null } as any;
    setTimer(
      { conversationId, timer: timerValue },
      {
        onSuccess: () => {
          toast.success(
            selected === "Off"
              ? "Disappearing messages disabled"
              : `Messages will disappear after ${TIMER_OPTIONS.find((o) => o.value === selected)?.label}`,
          );
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to update timer"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-primary" />
            Disappearing Messages
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-1">
          {TIMER_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => setSelected(option.value)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                selected === option.value
                  ? "bg-primary/10 ring-1 ring-primary/30"
                  : "hover:bg-accent",
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                  selected === option.value
                    ? "border-primary"
                    : "border-muted-foreground/30",
                )}
              >
                {selected === option.value && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
