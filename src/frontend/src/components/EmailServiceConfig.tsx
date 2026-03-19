import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Key,
  Loader2,
  Mail,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetEncryptedEmailConfig,
  useSetEncryptedEmailConfig,
} from "../hooks/useQueries";
import {
  decryptWithKey,
  deriveSymmetricKey,
  encryptWithKey,
} from "../utils/vetkeys";

export function EmailServiceConfig() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const { data: encryptedConfig, isLoading: isLoadingConfig } =
    useGetEncryptedEmailConfig();
  const { mutateAsync: saveEncryptedConfig } = useSetEncryptedEmailConfig();

  const [decryptedKey, setDecryptedKey] = useState("");
  const [storedSender, setStoredSender] = useState("");
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hasDecrypted = useRef(false);

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [senderInput, setSenderInput] = useState("");
  const [editingKey, setEditingKey] = useState(false);
  const [editingSender, setEditingSender] = useState(false);
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  // Decrypt existing config on mount
  useEffect(() => {
    if (hasDecrypted.current || !encryptedConfig || !actor || !identity) return;
    hasDecrypted.current = true;
    setIsDecrypting(true);
    const principal = identity.getPrincipal();
    deriveSymmetricKey(actor, principal)
      .then((key) =>
        decryptWithKey(key, new Uint8Array(encryptedConfig.encryptedApiKey)),
      )
      .then((apiKey) => {
        setDecryptedKey(apiKey);
        setStoredSender(encryptedConfig.senderEmail);
      })
      .catch((err) => {
        console.error("Failed to decrypt email config:", err);
      })
      .finally(() => setIsDecrypting(false));
  }, [encryptedConfig, actor, identity]);

  const keyConfigured = decryptedKey.length > 0;
  const senderConfigured = storedSender.length > 0;
  const fullyConfigured = keyConfigured && senderConfigured;

  const maskedKey = keyConfigured
    ? `${decryptedKey.slice(0, 4)}****`
    : "Not configured";

  const handleSaveKey = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed.startsWith("re_")) {
      setError("API key must start with 're_'");
      return;
    }
    setError("");

    if (!storedSender) {
      // Sender not yet set — store key in memory, prompt for sender
      setDecryptedKey(trimmed);
      setApiKeyInput("");
      setEditingKey(false);
      toast.success("API key ready — set sender email to complete setup");
      return;
    }

    if (!actor || !identity) return;
    setIsSaving(true);
    try {
      const key = await deriveSymmetricKey(actor, identity.getPrincipal());
      const encrypted = await encryptWithKey(key, trimmed);
      await saveEncryptedConfig({
        encryptedApiKey: encrypted,
        senderEmail: storedSender,
      });
      setDecryptedKey(trimmed);
      setApiKeyInput("");
      setEditingKey(false);
      toast.success("API key encrypted and saved on-chain");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save API key");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSender = async () => {
    const trimmed = senderInput.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    setError("");

    if (!decryptedKey) {
      // API key not yet set — store sender in memory, prompt for key
      setStoredSender(trimmed);
      setSenderInput("");
      setEditingSender(false);
      toast.success("Sender email ready — set API key to complete setup");
      return;
    }

    if (!actor || !identity) return;
    setIsSaving(true);
    try {
      let encryptedApiKey: Uint8Array;
      if (encryptedConfig) {
        // Re-use existing encrypted blob (no re-encryption needed)
        encryptedApiKey = new Uint8Array(encryptedConfig.encryptedApiKey);
      } else {
        // Key is in memory but not saved yet — encrypt it
        const key = await deriveSymmetricKey(actor, identity.getPrincipal());
        encryptedApiKey = await encryptWithKey(key, decryptedKey);
      }
      await saveEncryptedConfig({ encryptedApiKey, senderEmail: trimmed });
      setStoredSender(trimmed);
      setSenderInput("");
      setEditingSender(false);
      toast.success("Sender email saved on-chain");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save sender email",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingConfig || isDecrypting) {
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">
            {isDecrypting ? "Decrypting configuration..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            fullyConfigured ? "bg-primary/10" : "bg-amber-500/10",
          )}
        >
          <Mail
            className={cn(
              "w-4 h-4",
              fullyConfigured ? "text-primary" : "text-amber-500",
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Email Service</p>
            {fullyConfigured ? (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
                Active
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 uppercase tracking-wider">
                Incomplete
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Resend API for email verification codes (encrypted and stored
            on-chain)
          </p>
        </div>
      </div>

      {/* Setup instructions */}
      <Collapsible open={showHelp} onOpenChange={setShowHelp}>
        <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors pl-11">
          <HelpCircle className="w-3.5 h-3.5" />
          {showHelp ? "Hide setup guide" : "How do I set this up?"}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 ml-11 space-y-3 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            <div>
              <p className="font-medium text-foreground mb-1">
                Why set this up?
              </p>
              <p>
                Email configuration is required for two-factor authentication.
                Without it, your account relies solely on Internet Identity.
                Adding email 2FA means even if someone gains access to your II
                anchor, they still need your email to complete sensitive
                actions.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">
                Step 1: Get a Resend API key
              </p>
              <p>
                SecureChat uses{" "}
                <a
                  href="https://resend.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  Resend <ExternalLink className="w-2.5 h-2.5" />
                </a>{" "}
                to send verification emails. Create a free account, go to API
                Keys in the dashboard, and generate a new key (starts with{" "}
                <code className="bg-muted px-1 rounded text-[11px]">re_</code>
                ).
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">
                Step 2: Set a sender email
              </p>
              <p>
                You need a verified sender address. Either verify your own
                domain in Resend, or use their test address{" "}
                <code className="bg-muted px-1 rounded text-[11px]">
                  onboarding@resend.dev
                </code>{" "}
                for trying it out.
              </p>
            </div>
            <p className="text-[11px] opacity-75">
              Your API key is encrypted using vetKD and stored on-chain. It only
              exists in plaintext briefly in browser memory during operations.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* API Key */}
      <div className="pl-11 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              API Key
            </span>
          </div>
          {keyConfigured && !editingKey && (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-primary" />
              <span className="text-xs text-muted-foreground font-mono">
                {maskedKey}
              </span>
            </div>
          )}
          {!keyConfigured && !editingKey && (
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 text-amber-500" />
              <span className="text-xs text-muted-foreground">
                Not configured
              </span>
            </div>
          )}
        </div>

        {editingKey ? (
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="re_..."
              value={apiKeyInput}
              onChange={(e) => {
                setApiKeyInput(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSaveKey();
                }
              }}
              className="h-8 text-xs font-mono"
              autoFocus
            />
            {error && <p className="text-destructive text-xs">{error}</p>}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSaveKey}
                disabled={!apiKeyInput.trim() || isSaving}
                className="text-xs h-7"
              >
                {isSaving && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                {isSaving ? "Encrypting..." : "Save"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingKey(false);
                  setApiKeyInput("");
                  setError("");
                }}
                disabled={isSaving}
                className="text-xs h-7 text-muted-foreground"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingKey(true);
              setError("");
            }}
            className="text-xs h-7"
          >
            {keyConfigured ? "Update Key" : "Set API Key"}
          </Button>
        )}
      </div>

      {/* Sender Email */}
      <div className="pl-11 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Sender Email
            </span>
          </div>
          {senderConfigured && !editingSender && (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-primary" />
              <span className="text-xs text-muted-foreground">
                {storedSender}
              </span>
            </div>
          )}
          {!senderConfigured && !editingSender && !error && (
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 text-amber-500" />
              <span className="text-xs text-muted-foreground">
                Not configured
              </span>
            </div>
          )}
        </div>

        {editingSender ? (
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="noreply@yourdomain.com"
              value={senderInput}
              onChange={(e) => {
                setSenderInput(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSaveSender();
                }
              }}
              className="h-8 text-xs"
              autoFocus
            />
            {error && <p className="text-destructive text-xs">{error}</p>}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSaveSender}
                disabled={!senderInput.trim() || isSaving}
                className="text-xs h-7"
              >
                {isSaving && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingSender(false);
                  setSenderInput("");
                  setError("");
                }}
                disabled={isSaving}
                className="text-xs h-7 text-muted-foreground"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingSender(true);
              setSenderInput(storedSender || "");
              setError("");
            }}
            className="text-xs h-7"
          >
            {senderConfigured ? "Update Sender" : "Set Sender Email"}
          </Button>
        )}
      </div>
    </div>
  );
}
