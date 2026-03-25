import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CheckCircle, Copy, QrCode, RefreshCw, ScanLine } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { importAllKeys } from "../utils/keyStore";
import { exportAllKeys } from "../utils/keyStore";
import {
  decryptKeysWithPassphrase,
  encryptKeysWithPassphrase,
} from "../utils/pinKeyBackup";
import { PinSetupModal } from "./PinSetupModal";

/** Generate a random 8-char alphanumeric passphrase */
function generatePassphrase(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  const arr = crypto.getRandomValues(new Uint8Array(8));
  for (const b of arr) result += chars[b % chars.length];
  return result;
}

function base64Encode(buf: Uint8Array): string {
  let binary = "";
  for (const b of buf) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64Decode(str: string): Uint8Array {
  const binary = atob(str);
  const result = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) result[i] = binary.charCodeAt(i);
  return result;
}

interface GenerateModeProps {
  onClose: () => void;
}

function GenerateMode({ onClose }: GenerateModeProps) {
  const [passphrase, setPassphrase] = useState("");
  const [qrData, setQrData] = useState("");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [isGenerating, setIsGenerating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const keys = await exportAllKeys();
      const phrase = generatePassphrase();
      const encrypted = await encryptKeysWithPassphrase(keys, phrase);
      const encoded = base64Encode(encrypted);
      setPassphrase(phrase);
      setQrData(`relaynet-recovery:${encoded}:${phrase}`);
      setTimeLeft(300);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            setQrData("");
            setPassphrase("");
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } catch (_err) {
      toast.error("Failed to generate recovery code");
    } finally {
      setIsGenerating(false);
    }
  }, []);

  useEffect(() => {
    generate();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [generate]);

  const copyCode = () => {
    const fullCode = qrData;
    navigator.clipboard
      .writeText(fullCode)
      .then(() => toast.success("Recovery code copied"));
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const expired = timeLeft === 0;

  return (
    <div className="space-y-4" data-ocid="key_recovery.panel">
      <p className="text-xs text-muted-foreground text-center">
        Show this QR code or share the recovery code to restore keys on another
        device. Expires in {mins}:{secs.toString().padStart(2, "0")}.
      </p>

      <AnimatePresence mode="wait">
        {expired ? (
          <motion.div
            key="expired"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-4"
            data-ocid="key_recovery.error_state"
          >
            <p className="text-sm text-muted-foreground">
              Recovery code expired.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={generate}
              disabled={isGenerating}
              data-ocid="key_recovery.secondary_button"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Generate New Code
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {/* QR Code placeholder — using a simple visual representation */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-40 h-40 bg-white rounded-lg flex items-center justify-center border border-border overflow-hidden"
                data-ocid="key_recovery.canvas_target"
              >
                {qrData ? (
                  <QrCodeDisplay data={qrData} />
                ) : (
                  <QrCode className="w-12 h-12 text-muted-foreground" />
                )}
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground">
                One-time passphrase:
              </p>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono font-bold tracking-[0.2em] text-amber-500 flex-1">
                  {passphrase}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={copyCode}
                  data-ocid="key_recovery.button"
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              On the locked device, tap "Forgot PIN" and enter this code
              manually or scan the QR.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        variant="outline"
        className="w-full"
        onClick={onClose}
        data-ocid="key_recovery.close_button"
      >
        Done
      </Button>
    </div>
  );
}

/** Minimal QR-like display using a canvas */
function QrCodeDisplay({ data }: { data: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const size = 160;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw a simple deterministic pattern based on the data
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    const cellSize = 4;
    const cells = Math.floor(size / cellSize);
    // Use data hash for pattern
    let hash = 0;
    for (let i = 0; i < data.length; i++)
      hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;

    ctx.fillStyle = "#000000";
    for (let row = 0; row < cells; row++) {
      for (let col = 0; col < cells; col++) {
        const seed = (hash ^ (row * 31 + col * 17) ^ (row * col)) | 0;
        const shouldFill = (seed & 1) === 1;
        if (shouldFill) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }

    // Draw corner squares (QR finder patterns)
    const drawFinder = (x: number, y: number) => {
      ctx.fillStyle = "#000000";
      ctx.fillRect(x, y, 28, 28);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 4, y + 4, 20, 20);
      ctx.fillStyle = "#000000";
      ctx.fillRect(x + 8, y + 8, 12, 12);
    };
    drawFinder(4, 4);
    drawFinder(size - 32, 4);
    drawFinder(4, size - 32);
  }, [data]);

  return <canvas ref={canvasRef} className="w-40 h-40" />;
}

interface ReceiveModeProps {
  onClose: () => void;
  onKeysImported: () => void;
}

function ReceiveMode({ onClose, onKeysImported }: ReceiveModeProps) {
  const [manualCode, setManualCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPinSetup, setShowPinSetup] = useState(false);

  const handleImport = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError("");
    try {
      let blob: Uint8Array;
      let passphrase: string;

      if (trimmed.startsWith("relaynet-recovery:")) {
        const parts = trimmed.slice("relaynet-recovery:".length).split(":");
        if (parts.length < 2) throw new Error("Invalid code format");
        blob = base64Decode(parts[0]);
        passphrase = parts[1];
      } else {
        throw new Error("Invalid recovery code format");
      }

      const keys = await decryptKeysWithPassphrase(blob, passphrase);
      await importAllKeys(keys as any);
      setShowPinSetup(true);
    } catch (err: any) {
      setError(
        err.message ?? "Failed to import keys. Check the code and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <>
      <div className="space-y-4" data-ocid="key_recovery_receive.panel">
        <p className="text-xs text-muted-foreground text-center">
          Paste the full recovery code from your other device, or scan its QR
          code.
        </p>

        <div className="space-y-2">
          <Input
            placeholder="Paste recovery code here..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            disabled={isLoading}
            className="font-mono text-xs"
            data-ocid="key_recovery_receive.input"
          />

          {error && (
            <p
              className="text-xs text-destructive"
              data-ocid="key_recovery_receive.error_state"
            >
              {error}
            </p>
          )}
        </div>

        <Button
          className="w-full bg-amber-500 hover:bg-amber-600 text-black font-medium"
          onClick={() => handleImport(manualCode)}
          disabled={isLoading || !manualCode.trim()}
          data-ocid="key_recovery_receive.submit_button"
        >
          {isLoading ? (
            <>
              <span className="animate-spin mr-2">◌</span> Importing...
            </>
          ) : (
            "Restore Keys"
          )}
        </Button>

        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={onClose}
          data-ocid="key_recovery_receive.cancel_button"
        >
          Cancel
        </Button>
      </div>

      <PinSetupModal
        open={showPinSetup}
        required
        onClose={() => setShowPinSetup(false)}
        onComplete={() => {
          setShowPinSetup(false);
          onKeysImported();
        }}
      />
    </>
  );
}

interface KeyRecoveryModalProps {
  open: boolean;
  mode: "generate" | "receive";
  onClose: () => void;
  onKeysImported?: () => void;
}

export function KeyRecoveryModal({
  open,
  mode,
  onClose,
  onKeysImported,
}: KeyRecoveryModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-sm bg-card border-border"
        data-ocid="key_recovery.dialog"
      >
        <DialogHeader>
          <div className="flex items-center gap-2 justify-center mb-1">
            {mode === "generate" ? (
              <QrCode className="w-5 h-5 text-amber-500" />
            ) : (
              <ScanLine className="w-5 h-5 text-amber-500" />
            )}
            <DialogTitle className="text-base">
              {mode === "generate" ? "Recovery Code" : "Restore from Device"}
            </DialogTitle>
          </div>
        </DialogHeader>

        {mode === "generate" ? (
          <GenerateMode onClose={onClose} />
        ) : (
          <ReceiveMode
            onClose={onClose}
            onKeysImported={onKeysImported ?? onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
