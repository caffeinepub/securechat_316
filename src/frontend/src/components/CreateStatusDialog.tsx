import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { usePostStatus } from "../hooks/useQueries";

interface CreateStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateStatusDialog({
  open,
  onOpenChange,
}: CreateStatusDialogProps) {
  const [content, setContent] = useState("");
  const { mutate: postStatus, isPending } = usePostStatus();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    postStatus(
      { content: trimmed, mediaBlob: null },
      {
        onSuccess: () => {
          toast.success("Status posted");
          setContent("");
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to post status"),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (isOpen) setContent("");
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Post a Status</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              maxLength={500}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              Visible to your contacts for 24 hours
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending || !content.trim()}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Posting..." : "Post"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
