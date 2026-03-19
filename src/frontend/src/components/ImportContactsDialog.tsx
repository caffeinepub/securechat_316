import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAddContactByPrincipal } from "../hooks/useQueries";

interface ImportContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function parsePrincipals(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function isValidPrincipal(text: string): boolean {
  // Basic principal format check: alphanumeric with dashes, typically 5+ chars
  return /^[a-z0-9-]{5,}$/i.test(text);
}

export function ImportContactsDialog({
  open,
  onOpenChange,
}: ImportContactsDialogProps) {
  const [input, setInput] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const { mutateAsync: addContact } = useAddContactByPrincipal();

  const principals = parsePrincipals(input);
  const validPrincipals = principals.filter(isValidPrincipal);

  const handleOpenChange = (isOpen: boolean) => {
    if (isImporting) return;
    onOpenChange(isOpen);
    if (isOpen) {
      setInput("");
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleImport = async () => {
    if (validPrincipals.length === 0) return;
    setIsImporting(true);
    const total = validPrincipals.length;
    setProgress({ current: 0, total });

    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < total; i++) {
      setProgress({ current: i + 1, total });
      try {
        await addContact(validPrincipals[i]);
        succeeded++;
      } catch {
        failed++;
      }
    }

    setIsImporting(false);
    if (failed === 0) {
      toast.success(
        `Sent ${succeeded} contact request${succeeded !== 1 ? "s" : ""}`,
      );
    } else {
      toast.success(
        `Sent ${succeeded} request${succeeded !== 1 ? "s" : ""}, ${failed} failed`,
      );
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Contacts</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-sm">Principal IDs</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">
              Paste one principal ID per line
            </p>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                "xxxxx-xxxxx-xxxxx-xxxxx-xxx\nyyyyy-yyyyy-yyyyy-yyyyy-yyy"
              }
              rows={5}
              className="font-mono text-xs resize-none"
              disabled={isImporting}
            />
          </div>

          {principals.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {validPrincipals.length} valid principal
              {validPrincipals.length !== 1 ? "s" : ""} found
              {principals.length !== validPrincipals.length && (
                <span className="text-destructive">
                  {" "}
                  ({principals.length - validPrincipals.length} invalid)
                </span>
              )}
            </p>
          )}

          {isImporting && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                Importing {progress.current}/{progress.total}...
              </p>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{
                    width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleImport}
            disabled={isImporting || validPrincipals.length === 0}
          >
            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isImporting
              ? `Importing ${progress.current}/${progress.total}...`
              : `Import ${validPrincipals.length > 0 ? validPrincipals.length : ""} Contact${validPrincipals.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
