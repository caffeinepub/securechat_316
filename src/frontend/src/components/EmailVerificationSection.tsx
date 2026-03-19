import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Info,
  Loader2,
  Mail,
  RotateCcw,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useEmailVerificationStatus,
  useGetEncryptedEmailConfig,
  useRequestEmailVerification,
  useSetTwoFactorEnabled,
  useTwoFactorStatus,
  useVerifyEmailOtp,
} from "../hooks/useQueries";
import { getDecryptedEmailConfig } from "../utils/vetkeys";

type VerificationStep = "idle" | "entering-email" | "code-sent";

export function EmailVerificationSection() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const { data: status, isLoading } = useEmailVerificationStatus();
  const { data: tfStatus } = useTwoFactorStatus();
  const { data: encryptedConfig } = useGetEncryptedEmailConfig();
  const { mutate: requestVerification, isPending: isSending } =
    useRequestEmailVerification();
  const { mutate: verifyOtp, isPending: isVerifying } = useVerifyEmailOtp();
  const { mutate: setTwoFactorEnabled, isPending: isTogglingTf } =
    useSetTwoFactorEnabled();

  const emailServiceConfigured = !!encryptedConfig;

  const [step, setStep] = useState<VerificationStep>("idle");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isDecrypting, setIsDecrypting] = useState(false);

  const isVerified = status?.verified === true;
  const is2faEnabled = tfStatus?.enabled === true;

  const handleSendCode = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    if (!actor || !identity) return;
    setIsDecrypting(true);
    try {
      const config = await getDecryptedEmailConfig(
        actor,
        identity.getPrincipal(),
      );
      if (!config) {
        setError(
          "Email service not configured — set your API key and sender email first",
        );
        return;
      }
      setError("");
      requestVerification(
        {
          email: trimmed,
          apiKey: config.apiKey,
          senderEmail: config.senderEmail,
        },
        {
          onSuccess: () => {
            toast.success("Verification code sent");
            setStep("code-sent");
            setOtp("");
          },
          onError: (err) => {
            setError(err.message || "Failed to send code");
          },
        },
      );
    } catch {
      setError("Failed to decrypt email configuration");
    } finally {
      setIsDecrypting(false);
    }
  }, [email, actor, identity, requestVerification]);

  const handleVerify = useCallback(() => {
    if (otp.length !== 6) {
      setError("Enter all 6 digits");
      return;
    }
    setError("");
    verifyOtp(otp, {
      onSuccess: () => {
        toast.success("Email verified");
        setStep("idle");
        setOtp("");
        setEmail("");
      },
      onError: (err) => {
        setError(err.message || "Invalid code");
        setOtp("");
      },
    });
  }, [otp, verifyOtp]);

  const handleResend = useCallback(async () => {
    setOtp("");
    setError("");
    if (!actor || !identity) return;
    try {
      const config = await getDecryptedEmailConfig(
        actor,
        identity.getPrincipal(),
      );
      if (!config) {
        setError("Email service not configured");
        return;
      }
      requestVerification(
        {
          email: email.trim(),
          apiKey: config.apiKey,
          senderEmail: config.senderEmail,
        },
        {
          onSuccess: () => {
            toast.success("New code sent");
          },
          onError: (err) => {
            setError(err.message || "Failed to resend");
          },
        },
      );
    } catch {
      setError("Failed to decrypt email configuration");
    }
  }, [email, actor, identity, requestVerification]);

  const handleToggle2fa = useCallback(
    (enabled: boolean) => {
      setTwoFactorEnabled(enabled, {
        onSuccess: () => {
          toast.success(
            enabled
              ? "Two-factor authentication enabled"
              : "Two-factor authentication disabled",
          );
        },
        onError: (err) => {
          toast.error(err.message || "Failed to update 2FA setting");
        },
      });
    },
    [setTwoFactorEnabled],
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Verified state
  if (isVerified && step === "idle") {
    return (
      <div className="space-y-0 divide-y">
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">
                  Email Verified
                </p>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
                  Verified
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {status?.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setStep("entering-email");
              setEmail(status?.email ?? "");
              setError("");
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors pl-11"
          >
            Change email
          </button>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                is2faEnabled ? "bg-primary/10" : "bg-muted",
              )}
            >
              <Shield
                className={cn(
                  "w-4 h-4",
                  is2faEnabled ? "text-primary" : "text-muted-foreground",
                )}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Login Verification
              </p>
              <p className="text-xs text-muted-foreground">
                Require email code after signing in
              </p>
            </div>
            <Switch
              checked={is2faEnabled}
              onCheckedChange={handleToggle2fa}
              disabled={isTogglingTf}
            />
          </div>
        </div>
      </div>
    );
  }

  // Code sent state
  if (step === "code-sent") {
    return (
      <div className="px-4 py-3 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Enter verification code
            </p>
            <p className="text-xs text-muted-foreground">Sent to {email}</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 py-2">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={setOtp}
            onComplete={handleVerify}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          {error && (
            <p className="text-destructive text-xs text-center">{error}</p>
          )}

          <div className="flex items-center gap-3 w-full">
            <Button
              size="sm"
              className="flex-1"
              onClick={handleVerify}
              disabled={otp.length !== 6 || isVerifying}
            >
              {isVerifying && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              {isVerifying ? "Verifying..." : "Verify"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleResend}
              disabled={isSending}
              className="text-muted-foreground gap-1.5"
            >
              {isSending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              Resend
            </Button>
          </div>

          <button
            type="button"
            onClick={() => {
              setStep("idle");
              setOtp("");
              setError("");
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Default: enter email state
  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            step === "entering-email" ? "bg-primary/10" : "bg-muted",
          )}
        >
          <Mail
            className={cn(
              "w-4 h-4",
              step === "entering-email"
                ? "text-primary"
                : "text-muted-foreground",
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Two-Factor Authentication
          </p>
          <p className="text-xs text-muted-foreground">
            Add a second layer of security with email verification
          </p>
        </div>
        {step === "idle" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setStep("entering-email");
              setError("");
            }}
            className="text-xs shrink-0 text-foreground"
          >
            Set Up
          </Button>
        )}
      </div>

      {step === "idle" && (
        <p className="text-[11px] text-muted-foreground pl-11">
          Verifying your email lets you receive one-time codes as a second
          factor alongside Internet Identity. You can set it up or skip it at
          any time.
        </p>
      )}

      {step === "entering-email" && (
        <div className="pl-11 space-y-2.5">
          {!emailServiceConfigured && (
            <div className="flex items-start gap-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-md p-2.5">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <p className="text-[11px] leading-relaxed">
                Email service is not configured yet. Set up your Resend API key
                and sender email in the Email Service section below first, then
                come back here.
              </p>
            </div>
          )}
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSendCode();
              }
            }}
            className="h-9 text-sm"
            autoFocus
          />
          {error && <p className="text-destructive text-xs">{error}</p>}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSendCode}
              disabled={isSending || isDecrypting || !email.trim()}
              className="text-xs"
            >
              {(isSending || isDecrypting) && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              {isDecrypting
                ? "Decrypting..."
                : isSending
                  ? "Sending..."
                  : "Send Code"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setStep("idle");
                setEmail("");
                setError("");
              }}
              className="text-xs text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
