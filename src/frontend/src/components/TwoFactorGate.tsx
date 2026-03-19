import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Loader2, LogOut, RotateCcw, Shield } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useRequestLoginOtp,
  useTwoFactorStatus,
  useVerifyLoginOtp,
} from "../hooks/useQueries";
import { getDecryptedEmailConfig } from "../utils/vetkeys";

interface TwoFactorGateProps {
  onVerified: () => void;
  onLogout: () => void;
}

export function TwoFactorGate({ onVerified, onLogout }: TwoFactorGateProps) {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const { data: tfStatus, isLoading } = useTwoFactorStatus();
  const { mutate: requestOtp, isPending: isSendingOtp } = useRequestLoginOtp();
  const { mutate: verifyOtp, isPending: isVerifyingOtp } = useVerifyLoginOtp();

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const otpRequestedRef = useRef(false);

  // If 2FA is not enabled, pass through immediately
  useEffect(() => {
    if (!isLoading && tfStatus && !tfStatus.enabled) {
      onVerified();
    }
  }, [isLoading, tfStatus, onVerified]);

  // Auto-send OTP when gate mounts and 2FA is enabled
  useEffect(() => {
    if (
      !isLoading &&
      tfStatus?.enabled &&
      !otpRequestedRef.current &&
      actor &&
      identity
    ) {
      otpRequestedRef.current = true;
      getDecryptedEmailConfig(actor, identity.getPrincipal())
        .then((config) => {
          if (!config) {
            setError(
              "Email service not configured — set your API key and sender email in Settings first",
            );
            return;
          }
          requestOtp(
            { apiKey: config.apiKey, senderEmail: config.senderEmail },
            {
              onSuccess: () => {
                toast.success("Verification code sent to your email");
              },
              onError: (err) => {
                setError(err.message || "Failed to send verification code");
              },
            },
          );
        })
        .catch(() => {
          setError("Failed to decrypt email configuration");
        });
    }
  }, [isLoading, tfStatus, requestOtp, actor, identity]);

  const handleVerify = useCallback(() => {
    if (otp.length !== 6) {
      setError("Enter all 6 digits");
      return;
    }
    setError("");
    verifyOtp(otp, {
      onSuccess: () => {
        onVerified();
      },
      onError: (err) => {
        setError(err.message || "Invalid code");
        setOtp("");
      },
    });
  }, [otp, verifyOtp, onVerified]);

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
      requestOtp(
        { apiKey: config.apiKey, senderEmail: config.senderEmail },
        {
          onSuccess: () => {
            toast.success("New code sent");
          },
          onError: (err) => {
            setError(err.message || "Failed to resend code");
          },
        },
      );
    } catch {
      setError("Failed to decrypt email configuration");
    }
  }, [actor, identity, requestOtp]);

  // Loading state
  if (isLoading || (!tfStatus?.enabled && tfStatus !== undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const maskedEmail = tfStatus?.email
    ? tfStatus.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
    : "your email";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Two-Factor Authentication
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Enter the 6-digit code sent to {maskedEmail}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={(val) => {
              setOtp(val);
              setError("");
            }}
            onComplete={handleVerify}
            autoFocus
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
            <p className="text-destructive text-sm text-center">{error}</p>
          )}

          <Button
            className="w-full"
            onClick={handleVerify}
            disabled={otp.length !== 6 || isVerifyingOtp}
          >
            {isVerifyingOtp && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isVerifyingOtp ? "Verifying..." : "Verify"}
          </Button>

          <div className="flex items-center gap-4">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleResend}
              disabled={isSendingOtp}
              className="text-muted-foreground gap-1.5"
            >
              {isSendingOtp ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              Resend code
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onLogout}
              className="text-muted-foreground gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
