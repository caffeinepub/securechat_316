import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CheckCircle, Loader2, Shield } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { unlock } from "../hooks/usePinSession";
import { exportAllKeys } from "../utils/keyStore";
import { encryptKeysWithPin } from "../utils/pinKeyBackup";

interface PinSetupModalProps {
  open: boolean;
  onClose: () => void;
  /** If true, the user cannot dismiss (must set up PIN) */
  required?: boolean;
  /** Called when PIN setup is complete */
  onComplete?: () => void;
}

function PinInput({
  value,
  onChange,
  disabled,
  error,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  error?: boolean;
  label: string;
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
    if (sanitized && index < 3) {
      refs[index + 1].current?.focus();
    }
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
    onChange(
      pasted
        .padEnd(value.length > pasted.length ? value.length : 0, "")
        .slice(0, 4),
    );
    onChange(pasted);
    if (pasted.length >= 4) refs[3].current?.focus();
    else if (pasted.length > 0) refs[pasted.length - 1].current?.focus();
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground text-center">{label}</p>
      <div className="flex gap-3 justify-center">
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
              error ? "border-destructive animate-shake" : "border-border",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function PinSetupModal({
  open,
  onClose,
  required,
  onComplete,
}: PinSetupModalProps) {
  const { actor } = useActor();
  const [step, setStep] = useState<"enter" | "confirm" | "success">("enter");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const reset = () => {
    setStep("enter");
    setPin("");
    setConfirmPin("");
    setError("");
    setIsLoading(false);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset is stable
  useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleNext = useCallback(() => {
    if (pin.length < 4) return;
    setError("");
    setStep("confirm");
  }, [pin]);

  const handleConfirm = useCallback(async () => {
    if (confirmPin.length < 4) return;
    if (confirmPin !== pin) {
      setError("PINs don't match. Try again.");
      setConfirmPin("");
      return;
    }
    if (!actor) return;

    setIsLoading(true);
    setError("");
    try {
      const keys = await exportAllKeys();
      const encrypted = await encryptKeysWithPin(keys, pin);
      await actor.storeEncryptedKeyBackup(encrypted);
      unlock();
      setStep("success");
      setTimeout(() => {
        onComplete?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError("Failed to save backup. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [confirmPin, pin, actor, onComplete, onClose]);

  // Auto-advance when 4 digits are entered
  useEffect(() => {
    if (step === "enter" && pin.length === 4) handleNext();
  }, [pin, step, handleNext]);

  useEffect(() => {
    if (step === "confirm" && confirmPin.length === 4) handleConfirm();
  }, [confirmPin, step, handleConfirm]);

  const handleSkip = () => {
    localStorage.setItem("pin-setup-dismissed", "1");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={required ? undefined : (v) => !v && onClose()}
    >
      <DialogContent
        className="sm:max-w-sm bg-card border-border"
        data-ocid="pin_setup.dialog"
        onInteractOutside={required ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 justify-center mb-1">
            <Shield className="w-5 h-5 text-amber-500" />
            <DialogTitle className="text-base">Secure Your Keys</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Set a 4-digit PIN to encrypt your keys on-chain. You'll need this
            PIN to access messages on a new device.
          </p>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === "success" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-4"
              data-ocid="pin_setup.success_state"
            >
              <CheckCircle className="w-12 h-12 text-amber-500" />
              <p className="text-sm font-medium">Keys backed up securely</p>
            </motion.div>
          ) : (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: step === "confirm" ? 20 : 0 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-5 py-2"
            >
              {step === "enter" ? (
                <PinInput
                  label="Enter a 4-digit PIN"
                  value={pin}
                  onChange={setPin}
                  disabled={isLoading}
                />
              ) : (
                <PinInput
                  label="Confirm your PIN"
                  value={confirmPin}
                  onChange={setConfirmPin}
                  disabled={isLoading}
                  error={!!error && step === "confirm"}
                />
              )}

              {error && (
                <p
                  className="text-xs text-destructive text-center"
                  data-ocid="pin_setup.error_state"
                >
                  {error}
                </p>
              )}

              {isLoading && (
                <div
                  className="flex justify-center"
                  data-ocid="pin_setup.loading_state"
                >
                  <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                </div>
              )}

              {step === "confirm" && !isLoading && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => {
                    setStep("enter");
                    setConfirmPin("");
                    setError("");
                  }}
                  data-ocid="pin_setup.cancel_button"
                >
                  Back
                </Button>
              )}

              {step === "enter" && !required && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={handleSkip}
                  data-ocid="pin_setup.secondary_button"
                >
                  Skip for now
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
