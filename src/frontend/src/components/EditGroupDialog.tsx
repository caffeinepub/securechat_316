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
import { useUpdateGroup } from "../hooks/useQueries";

interface EditGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: bigint;
  currentName: string;
}

export function EditGroupDialog({
  open,
  onOpenChange,
  conversationId,
  currentName,
}: EditGroupDialogProps) {
  const [name, setName] = useState(currentName);
  const { mutate: updateGroup, isPending } = useUpdateGroup();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === currentName) return;

    updateGroup(
      {
        conversationId,
        name: trimmed,
        avatar: null,
      },
      {
        onSuccess: () => {
          toast.success("Group updated");
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to update group"),
      },
    );
  };

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen) setName(currentName);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
              maxLength={100}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={
                isPending || !name.trim() || name.trim() === currentName
              }
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
