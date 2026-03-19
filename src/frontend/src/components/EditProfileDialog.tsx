import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob, useSetProfile } from "../hooks/useQueries";
import { AvatarPicker } from "./AvatarPicker";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  currentBio: string;
  currentAvatar: ExternalBlob | null;
}

export function EditProfileDialog({
  open,
  onOpenChange,
  currentName,
  currentBio,
  currentAvatar,
}: EditProfileDialogProps) {
  const [name, setName] = useState(currentName);
  const [bio, setBio] = useState(currentBio);
  const [error, setError] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const { mutate: setProfile, isPending } = useSetProfile();

  // Resolve current avatar URL
  useEffect(() => {
    if (!currentAvatar) {
      setCurrentAvatarUrl(null);
      return;
    }
    setCurrentAvatarUrl(currentAvatar.getDirectURL());
  }, [currentAvatar]);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen) {
      setName(currentName);
      setBio(currentBio);
      setError("");
      setAvatarFile(null);
      setAvatarRemoved(false);
      setUploadProgress(null);
    }
  };

  const handleFileSelect = (file: File | null) => {
    if (file) {
      setAvatarFile(file);
      setAvatarRemoved(false);
    } else {
      setAvatarFile(null);
      setAvatarRemoved(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }

    let avatar: ExternalBlob | null = null;
    if (avatarFile) {
      try {
        setUploadProgress(0);
        const arrayBuffer = await avatarFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        avatar = ExternalBlob.fromBytes(uint8Array);
        avatar.withUploadProgress((pct: number) => setUploadProgress(pct));
      } catch {
        toast.error("Failed to prepare avatar");
        setUploadProgress(null);
        return;
      }
    } else if (!avatarRemoved && currentAvatar) {
      avatar = currentAvatar;
    }

    setProfile(
      { name: trimmed, bio: bio.trim(), avatar },
      {
        onSuccess: () => {
          toast.success("Profile updated");
          setUploadProgress(null);
          onOpenChange(false);
        },
        onError: (err) => {
          setError(err.message || "Failed to update");
          setUploadProgress(null);
        },
      },
    );
  };

  const displayAvatarUrl = avatarRemoved ? null : currentAvatarUrl;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <AvatarPicker
              name={currentName}
              currentAvatarUrl={displayAvatarUrl}
              onFileSelect={handleFileSelect}
              selectedFile={avatarFile}
            />
            <div>
              <Label htmlFor="edit-name">Display name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                className="mt-1.5"
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="edit-bio">Bio</Label>
              <Textarea
                id="edit-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="mt-1.5 resize-none"
                rows={3}
                maxLength={500}
                placeholder="A short bio about yourself"
              />
            </div>
            {uploadProgress !== null && (
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
