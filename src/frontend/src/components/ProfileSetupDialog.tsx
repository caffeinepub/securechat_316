import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useSetProfile } from "../hooks/useQueries";

interface ProfileSetupDialogProps {
  open: boolean;
}

export function ProfileSetupDialog({ open }: ProfileSetupDialogProps) {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState("");
  const { mutate: setProfile, isPending } = useSetProfile();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }

    setProfile(
      { name: trimmed, bio: bio.trim(), avatar: null },
      {
        onSuccess: () => {},
        onError: (err) => {
          setError(err.message || "Failed to create profile");
        },
      },
    );
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Set up your profile</DialogTitle>
            <DialogDescription>
              Choose a display name to get started. You can add a profile photo
              and more details later in Settings.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="profile-name">Display name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                placeholder="Enter your name"
                className="mt-2"
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="profile-bio">Bio (optional)</Label>
              <Textarea
                id="profile-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short bio about yourself"
                className="mt-2 resize-none"
                rows={2}
                maxLength={500}
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Saving..." : "Continue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
