import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { useGetPublicKey } from "../hooks/useQueries";
import { computeSafetyNumber } from "../utils/e2ee";

interface SafetyNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  peerName: string;
  peerPrincipal: string;
  myPublicKeyRaw: Uint8Array | null;
}

export function SafetyNumberDialog({
  open,
  onOpenChange,
  peerName,
  peerPrincipal,
  myPublicKeyRaw,
}: SafetyNumberDialogProps) {
  const { data: peerKeyBlob } = useGetPublicKey(open ? peerPrincipal : null);
  const [safetyNumber, setSafetyNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!myPublicKeyRaw || !peerKeyBlob) {
      setSafetyNumber(null);
      return;
    }
    const peerRaw = new Uint8Array(peerKeyBlob as any);
    computeSafetyNumber(myPublicKeyRaw, peerRaw).then(setSafetyNumber);
  }, [myPublicKeyRaw, peerKeyBlob]);

  const formatted = safetyNumber
    ? (safetyNumber.match(/.{1,4}/g)?.join(" ") ?? safetyNumber)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Safety Number
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 text-center space-y-4">
          {!formatted ? (
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
          ) : (
            <>
              <p className="font-mono text-2xl tracking-widest text-foreground">
                {formatted}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Compare this number with{" "}
                <span className="font-semibold">{peerName}</span> to verify your
                messages are end-to-end encrypted. If the numbers match, your
                conversation is secure.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
