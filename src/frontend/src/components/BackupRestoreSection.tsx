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
import { Download, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useExportUserData, useImportUserData } from "../hooks/useQueries";
import { decryptData, encryptData } from "../utils/crypto";
import { exportAllKeys, importAllKeys } from "../utils/keyStore";

export function BackupRestoreSection() {
  const { mutateAsync: exportData, isPending: isExporting } =
    useExportUserData();
  const { mutateAsync: importData, isPending: isImporting } =
    useImportUserData();

  const [showPasswordDialog, setShowPasswordDialog] = useState<
    "export" | "import" | null
  >(null);
  const [password, setPassword] = useState("");
  const [importFile, setImportFile] = useState<ArrayBuffer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBusy = isExporting || isImporting;

  const handleExport = async () => {
    if (!password) return;
    try {
      const data = await exportData();
      // Include E2EE keys in backup
      const e2eeKeys = await exportAllKeys();
      const backupData = { ...data, e2eeKeys };
      const json = JSON.stringify(backupData, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value,
      );
      const encrypted = await encryptData(json, password);
      const blob = new Blob([encrypted], {
        type: "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `securechat-backup-${new Date().toISOString().slice(0, 10)}.json.enc`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup exported");
      setShowPasswordDialog(null);
      setPassword("");
    } catch {
      toast.error("Failed to export data");
    }
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.arrayBuffer().then((buffer) => {
      setImportFile(buffer);
      setShowPasswordDialog("import");
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImport = async () => {
    if (!password || !importFile) return;
    try {
      const json = await decryptData(importFile, password);
      const data = JSON.parse(json, (_key, value) => {
        // Convert string numbers that were bigints back
        if (
          typeof value === "string" &&
          /^\d+$/.test(value) &&
          value.length > 15
        ) {
          return BigInt(value);
        }
        return value;
      });
      // Restore E2EE keys if present
      if (data.e2eeKeys) {
        await importAllKeys(data.e2eeKeys);
      }
      const result = await importData(data);
      toast.success(
        `Backup restored: ${result.contactsRequested} contact request${result.contactsRequested !== 1n ? "s" : ""} sent`,
      );
      setShowPasswordDialog(null);
      setPassword("");
      setImportFile(null);
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "OperationError"
          ? "Wrong password"
          : "Failed to restore backup";
      toast.error(msg);
    }
  };

  const handleDialogClose = () => {
    if (isBusy) return;
    setShowPasswordDialog(null);
    setPassword("");
    setImportFile(null);
  };

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".enc,.json.enc"
          className="hidden"
          onChange={handleImportFileSelect}
        />
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => {
            setPassword("");
            setShowPasswordDialog("export");
          }}
          disabled={isBusy}
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
        >
          {isImporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          Import
        </Button>
      </div>

      <Dialog
        open={showPasswordDialog !== null}
        onOpenChange={() => handleDialogClose()}
      >
        <DialogContent className="sm:max-w-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (showPasswordDialog === "export") {
                handleExport();
              } else {
                handleImport();
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {showPasswordDialog === "export"
                  ? "Encrypt Backup"
                  : "Decrypt Backup"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="backup-password">Password</Label>
              <Input
                id="backup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  showPasswordDialog === "export"
                    ? "Choose a password"
                    : "Enter your backup password"
                }
                className="mt-1.5"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-2">
                {showPasswordDialog === "export"
                  ? "Your backup will be encrypted with this password."
                  : "Enter the password you used when exporting."}
              </p>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!password || isBusy}>
                {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {showPasswordDialog === "export" ? "Export" : "Import"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
