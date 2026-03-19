import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface AvatarPickerProps {
  name: string;
  currentAvatarUrl: string | null;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
}

export function AvatarPicker({
  name,
  currentAvatarUrl,
  onFileSelect,
  selectedFile,
}: AvatarPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setObjectUrl(null);
  }, [selectedFile]);

  const previewUrl = objectUrl ?? currentAvatarUrl;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image must be under 5 MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    onFileSelect(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemove = () => {
    onFileSelect(null);
  };

  const initials = name ? name.charAt(0).toUpperCase() : "?";
  const hasAvatar = !!previewUrl;

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="relative group"
      >
        <Avatar className="h-20 w-20">
          {previewUrl && <AvatarImage src={previewUrl} alt={name} />}
          <AvatarFallback className="bg-primary/15 text-primary text-2xl font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="w-5 h-5 text-white" />
        </div>
      </button>
      {hasAvatar && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground h-7 gap-1"
          onClick={handleRemove}
        >
          <X className="w-3 h-3" />
          Remove photo
        </Button>
      )}
    </div>
  );
}
