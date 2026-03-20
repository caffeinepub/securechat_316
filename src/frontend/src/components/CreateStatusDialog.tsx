import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ImageIcon, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob, usePostStatus } from "../hooks/useQueries";

interface CreateStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateStatusDialog({
  open,
  onOpenChange,
}: CreateStatusDialogProps) {
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: postStatus, isPending } = usePostStatus();

  const resetImageState = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setContent("");
      resetImageState();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    let mediaBlob: ExternalBlob | null = null;
    if (imageFile) {
      const arrayBuffer = await imageFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      mediaBlob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((pct) =>
        setUploadProgress(pct),
      );
    }

    postStatus(
      { content: trimmed, mediaBlob },
      {
        onSuccess: () => {
          toast.success("Status posted");
          setContent("");
          resetImageState();
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to post status"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Post a Status</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              maxLength={500}
              autoFocus
              rows={4}
              className="resize-none"
              data-ocid="status.textarea"
            />
            {imagePreview && (
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Selected"
                  className="max-h-40 rounded-md object-cover w-full"
                />
                <button
                  type="button"
                  onClick={resetImageState}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80 transition-colors"
                  data-ocid="status.close_button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {isPending && uploadProgress > 0 && uploadProgress < 100 && (
              <div
                className="w-full bg-muted rounded-full h-1.5 overflow-hidden"
                data-ocid="status.loading_state"
              >
                <div
                  className="bg-primary h-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-muted-foreground hover:text-foreground"
                data-ocid="status.upload_button"
              >
                <ImageIcon className="h-4 w-4 mr-1.5" />
                {imageFile ? "Change image" : "Add image"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Visible to your contacts for 24 hours
            </p>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={isPending || !content.trim()}
              data-ocid="status.submit_button"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Posting..." : "Post"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
