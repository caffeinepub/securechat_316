import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Check, Copy, Loader2, Search, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useSearchUsers,
  useSendContactRequest,
  useShareId,
} from "../hooks/useQueries";
import type { PublicProfile } from "../hooks/useQueries";
import { UserAvatar } from "./UserAvatar";

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddContactDialog({
  open,
  onOpenChange,
}: AddContactDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicProfile[]>([]);
  const { mutate: search, isPending: isSearching } = useSearchUsers();
  const { mutate: sendRequest, isPending: isSending } = useSendContactRequest();
  const { data: shareId } = useShareId();
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      search(trimmed, {
        onSuccess: (data) => setResults(data),
        onError: () => toast.error("Search failed"),
      });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  const handleAdd = (principalStr: string) => {
    sendRequest(principalStr, {
      onSuccess: () => toast.success("Contact request sent!"),
      onError: (err) => toast.error(err.message || "Failed to send request"),
    });
  };

  const handleCopy = () => {
    if (!shareId) return;
    navigator.clipboard.writeText(shareId);
    setCopied(true);
    toast.success("ID copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen) {
      setQuery("");
      setResults([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div>
          <Label className="text-xs text-muted-foreground">
            Search by name
          </Label>
          <div className="relative mt-1.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Enter a name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {results.map((user) => (
              <div
                key={user.principal.toString()}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent"
              >
                <UserAvatar
                  name={user.name}
                  avatarBlob={user.avatar ?? null}
                  className="h-9 w-9"
                  fallbackClassName="text-xs"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAdd(user.principal.toString())}
                  disabled={isSending}
                  className="gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add
                </Button>
              </div>
            ))}
          </div>
        )}

        {results.length === 0 && query.length >= 2 && !isSearching && (
          <p className="text-sm text-muted-foreground text-center py-3">
            No users found
          </p>
        )}

        <Separator />

        {/* Share ID */}
        <div>
          <Label className="text-xs text-muted-foreground">Your Share ID</Label>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2">
            Share this with others so they can find you
          </p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={shareId ?? "Loading..."}
              className="text-xs font-mono"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <Check className="w-4 h-4 text-primary" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
