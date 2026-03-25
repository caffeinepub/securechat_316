import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { unlock } from "../hooks/usePinSession";
import { importAllKeys } from "../utils/keyStore";
import { decryptKeysWithPin } from "../utils/pinKeyBackup";
import { KeyRecoveryModal } from "./KeyRecoveryModal";

interface PinUnlockModalProps {
  open: boolean;
  backupBlob: Uint8Array;
  /** Called when keys have been successfully imported */
  onUnlocked: () => void;
}

function PinInput({
  value,
  onChange,
  disabled,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  error?: boolean;
}) {
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleChange = (index: number, char: string) => {
    const digits = value.split("");
    const sanitized = char.replace(/\D/g, "").slice(-1);
    if (!sanitized && char !== "") return;
    digits[index] = sanitized;
    const next = digits.join("");
    onChange(next);
    if (sanitized && index < 3) refs[index + 1].current?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (value[index]) {
        const digits = value.split("");
        digits[index] = "";
        onChange(digits.join(""));
      } else if (index > 0) {
        refs[index - 1].current?.focus();
        const digits = value.split("");
        digits[index - 1] = "";
        onChange(digits.join(""));
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 4);
    onChange(pasted);
    if (pasted.length >= 4) refs[3].current?.focus();
    else if (pasted.length > 0) refs[pasted.length - 1].current?.focus();
  };

  return (
    <motion.div
      animate={error ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}}
      transition={{ duration: 0.4 }}
      className="flex gap-3 justify-center"
    >
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={refs[i]}
          type="password"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={cn(
            "w-12 h-14 text-center text-xl font-mono rounded-lg border-2 bg-background/50 outline-none transition-all",
            "focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20",
            error ? "border-destructive" : "border-border",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        />
      ))}
    </motion.div>
  );
}

export function PinUnlockModal({
  open,
  backupBlob,
  onUnlocked,
}: PinUnlockModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    if (open) {
      setPin("");
      setError("");
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    if (pin.length < 4) return;
    setIsLoading(true);
    setError("");
    try {
      const keys = await decryptKeysWithPin(backupBlob, pin);
      await importAllKeys(keys as any);
      unlock();
      onUnlocked();
    } catch {
      setError("Incorrect PIN. Try again.");
      setPin("");
    } finally {
      setIsLoading(false);
    }
  }, [pin, backupBlob, onUnlocked]);

  useEffect(() => {
    if (pin.length === 4 && !isLoading) handleSubmit();
  }, [pin, isLoading, handleSubmit]);

  return (
    <>
      <Dialog open={open && !showRecovery}>
        <DialogContent
          className="sm:max-w-sm bg-card border-border"
          data-ocid="pin_unlock.dialog"
          onInteractOutside={(e) => e.preventDefault()}
          showCloseButton={false}
        >
          <DialogHeader>
            <div className="flex items-center gap-2 justify-center mb-1">
              <Lock className="w-5 h-5 text-amber-500" />
              <DialogTitle className="text-base">Enter Your PIN</DialogTitle>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Your encrypted keys are stored on-chain. Enter your PIN to unlock.
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <PinInput
              value={pin}
              onChange={setPin}
              disabled={isLoading}
              error={!!error}
            />

            <AnimatePresence>
              {error && (
                <motion.p
                  key="error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-destructive text-center"
                  data-ocid="pin_unlock.error_state"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {isLoading && (
              <div
                className="flex justify-center"
                data-ocid="pin_unlock.loading_state"
              >
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-amber-500"
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{
                        delay: i * 0.15,
                        repeat: Number.POSITIVE_INFINITY,
                        duration: 0.6,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              className="w-full text-xs text-muted-foreground hover:text-foreground text-center py-1 transition-colors"
              onClick={() => setShowRecovery(true)}
              data-ocid="pin_unlock.secondary_button"
            >
              Forgot PIN? Recover from another device
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <KeyRecoveryModal
        open={showRecovery}
        mode="receive"
        onClose={() => setShowRecovery(false)}
        onKeysImported={() => {
          setShowRecovery(false);
          onUnlocked();
        }}
      />
    </>
  );
}
