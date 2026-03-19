import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useReportUser } from "../hooks/useQueries";

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Other" },
];

interface ReportUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPrincipal: string;
  targetName: string;
}

export function ReportUserDialog({
  open,
  onOpenChange,
  targetPrincipal,
  targetName,
}: ReportUserDialogProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const { mutate: reportUser, isPending } = useReportUser();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;

    const fullReason = description.trim()
      ? `${reason}: ${description.trim()}`
      : reason;

    reportUser(
      { target: targetPrincipal, reason: fullReason },
      {
        onSuccess: () => {
          toast.success("Report submitted");
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to submit report"),
      },
    );
  };

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen) {
      setReason("");
      setDescription("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Report {targetName}</DialogTitle>
            <DialogDescription>
              Let us know what happened so we can review this account.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details (optional)"
              rows={3}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending || !reason}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
