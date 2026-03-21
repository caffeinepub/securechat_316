import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Loader2,
  QrCode,
  Radio,
  RefreshCw,
  ScanLine,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { backendInterface } from "../backend";
import { useQRScanner } from "../qr-code/useQRScanner";
import { getOutbox } from "../utils/messageStore";
import {
  completeSession,
  createSession,
  getSession,
  pollForAnswer,
} from "../utils/qrRendezvous";
import {
  type HostSession,
  hostSession as doHostSession,
  joinSession as doJoinSession,
  setRemoteAnswer,
} from "../utils/webrtcTransport";

export interface QrSyncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actor: backendInterface;
}

type Tab = "show" | "scan";
type SyncState =
  | "idle"
  | "generating"
  | "waiting"
  | "connecting"
  | "syncing"
  | "success"
  | "error";

interface SyncStats {
  sent: number;
  received: number;
}

export function QrSyncModal({ open, onOpenChange, actor }: QrSyncModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("show");
  const [state, setState] = useState<SyncState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [stats, setStats] = useState<SyncStats>({ sent: 0, received: 0 });

  const hostSessionRef = useRef<HostSession | null>(null);
  const abortRef = useRef(false);

  const scanner = useQRScanner({
    facingMode: "environment",
    scanInterval: 200,
    maxResults: 1,
  });

  const stopScanner = useCallback(() => {
    scanner.stopScanning();
    scanner.clearResults();
  }, [scanner.stopScanning, scanner.clearResults]);

  const startScanner = useCallback(() => {
    scanner.startScanning();
  }, [scanner.startScanning]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      abortRef.current = true;
      stopScanner();
      setState("idle");
      setQrImageUrl("");
      setErrorMessage("");
      setStats({ sent: 0, received: 0 });
      hostSessionRef.current = null;
    } else {
      abortRef.current = false;
    }
  }, [open, stopScanner]);

  // Auto-start scanner when Scan tab is active
  useEffect(() => {
    if (!open) return;
    if (activeTab === "scan" && state === "idle") {
      startScanner();
    } else if (activeTab === "show") {
      stopScanner();
    }
  }, [activeTab, open, state, startScanner, stopScanner]);

  // Watch for QR scan result
  const qrData = scanner.qrResults[0]?.data;
  useEffect(() => {
    if (activeTab !== "scan" || state !== "idle" || !qrData) return;
    handleJoinSession(qrData);
  }, [qrData, state, activeTab]);

  function setError(msg: string) {
    setState("error");
    setErrorMessage(msg);
  }

  async function handleGenerateQr() {
    if (!actor) return;
    abortRef.current = false;
    setState("generating");

    try {
      const outbox = await getOutbox();
      let offerSdp = "";

      const session = doHostSession(
        outbox,
        (sdp) => {
          offerSdp = sdp;
        },
        () => setState("syncing"),
      );
      hostSessionRef.current = session;

      // Poll until offer SDP is populated via the onOffer callback
      const offerReady = await new Promise<string>((resolve, reject) => {
        let attempts = 0;
        const check = () => {
          if (offerSdp) {
            resolve(offerSdp);
          } else if (attempts++ > 60) {
            reject(new Error("Offer not generated in time"));
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });

      if (abortRef.current) return;

      const sessionId = await createSession(actor, offerReady);
      if (abortRef.current) return;

      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(sessionId)}&color=000000&bgcolor=ffffff&margin=2`;
      setQrImageUrl(qrUrl);
      setState("waiting");

      const answer = await pollForAnswer(actor, sessionId, 90000);
      if (abortRef.current) return;

      if (!answer) {
        setError("No device connected within 90 seconds. Try again.");
        return;
      }

      setState("connecting");
      await setRemoteAnswer(session.pc, answer);

      try {
        const result = await session.promise;
        setStats({ sent: result.sent, received: result.received });
        setState("success");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Sync failed");
      }
    } catch (e) {
      if (!abortRef.current) {
        setError(e instanceof Error ? e.message : "Failed to start session");
      }
    }
  }

  async function handleJoinSession(sessionId: string) {
    if (!actor) return;
    stopScanner();
    setState("connecting");

    try {
      const sessionData = await getSession(actor, sessionId);
      if (!sessionData?.offer) {
        setError("Could not retrieve session. QR may have expired.");
        return;
      }

      const result = await doJoinSession(
        sessionData.offer,
        async (answerSdp) => {
          await completeSession(actor, sessionId, answerSdp);
          setState("syncing");
        },
        () => setState("syncing"),
      );

      setStats({ sent: result.sent, received: result.received });
      setState("success");
    } catch (e) {
      if (!abortRef.current) {
        setError(e instanceof Error ? e.message : "Sync failed");
      }
    }
  }

  const resetState = useCallback(() => {
    abortRef.current = true;
    stopScanner();
    setState("idle");
    setQrImageUrl("");
    setErrorMessage("");
    setStats({ sent: 0, received: 0 });
    hostSessionRef.current = null;
    abortRef.current = false;
  }, [stopScanner]);

  // Restart scanner after reset if on scan tab
  useEffect(() => {
    if (state === "idle" && activeTab === "scan" && open) {
      startScanner();
    }
  }, [state, activeTab, open, startScanner]);

  const totalSynced = stats.sent + stats.received;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm w-full p-0 overflow-hidden"
        data-ocid="qrsync.dialog"
      >
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" />
            <DialogTitle className="text-base font-semibold">
              Mesh Sync
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Exchange messages directly with a nearby device
          </p>
        </DialogHeader>

        {/* Tab Bar */}
        <div className="flex px-6 pt-4 gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("show");
              resetState();
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "show"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
            data-ocid="qrsync.show_tab"
          >
            <QrCode className="w-4 h-4" />
            Show QR
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("scan");
              resetState();
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "scan"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
            data-ocid="qrsync.scan_tab"
          >
            <ScanLine className="w-4 h-4" />
            Scan QR
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 min-h-[280px] flex flex-col items-center justify-center">
          {/* ===== SHOW QR TAB ===== */}
          {activeTab === "show" && (
            <>
              {state === "idle" && (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <QrCode className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Generate QR Code</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Show this to another SecureChat device
                    </p>
                  </div>
                  <Button
                    onClick={handleGenerateQr}
                    className="w-full"
                    data-ocid="qrsync.generate_button"
                  >
                    Generate QR Code
                  </Button>
                </div>
              )}

              {state === "generating" && (
                <div
                  className="flex flex-col items-center gap-3 text-center"
                  data-ocid="qrsync.loading_state"
                >
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    Setting up connection...
                  </p>
                </div>
              )}

              {state === "waiting" && (
                <div className="flex flex-col items-center gap-4">
                  {qrImageUrl ? (
                    <div className="rounded-xl overflow-hidden border-2 border-primary/20 shadow-sm bg-white p-2">
                      <img
                        src={qrImageUrl}
                        alt="QR code for peer sync"
                        width={200}
                        height={200}
                        className="block"
                      />
                    </div>
                  ) : (
                    <div className="w-[216px] h-[216px] rounded-xl bg-muted animate-pulse" />
                  )}
                  <div className="flex items-center gap-2 text-center">
                    <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Scan with another SecureChat device
                    </p>
                  </div>
                </div>
              )}

              {(state === "connecting" || state === "syncing") && (
                <div
                  className="flex flex-col items-center gap-3"
                  data-ocid="qrsync.loading_state"
                >
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm font-medium">
                    {state === "connecting"
                      ? "Connecting..."
                      : "Exchanging messages..."}
                  </p>
                </div>
              )}

              {state === "success" && (
                <div
                  className="flex flex-col items-center gap-4 text-center"
                  data-ocid="qrsync.success_state"
                >
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                  <div>
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                      Sync complete
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {totalSynced === 0
                        ? "Already up to date"
                        : `${totalSynced} message${
                            totalSynced !== 1 ? "s" : ""
                          } synced`}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    data-ocid="qrsync.close_button"
                  >
                    Done
                  </Button>
                </div>
              )}

              {state === "error" && (
                <div
                  className="flex flex-col items-center gap-4 text-center"
                  data-ocid="qrsync.error_state"
                >
                  <XCircle className="w-12 h-12 text-destructive" />
                  <div>
                    <p className="text-sm font-semibold text-destructive">
                      Sync failed
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[200px] leading-relaxed">
                      {errorMessage}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetState}
                    className="gap-2"
                    data-ocid="qrsync.primary_button"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Try Again
                  </Button>
                </div>
              )}
            </>
          )}

          {/* ===== SCAN QR TAB ===== */}
          {activeTab === "scan" && (
            <>
              {state === "idle" && (
                <div className="flex flex-col items-center gap-3 w-full">
                  <div className="relative w-full rounded-xl overflow-hidden bg-black aspect-square">
                    <video
                      ref={scanner.videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    <canvas ref={scanner.canvasRef} className="hidden" />
                    {/* Scan frame corners */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-40 h-40 relative">
                        <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl" />
                        <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr" />
                        <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl" />
                        <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br" />
                      </div>
                    </div>
                    {!scanner.isActive && scanner.isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}
                    {scanner.error && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4">
                        <p className="text-white text-xs text-center">
                          {scanner.error.message}
                        </p>
                        <button
                          type="button"
                          onClick={() => scanner.retry()}
                          className="mt-2 text-xs text-white/70 underline"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Point camera at the QR code on another SecureChat device
                  </p>
                </div>
              )}

              {(state === "connecting" || state === "syncing") && (
                <div
                  className="flex flex-col items-center gap-3"
                  data-ocid="qrsync.loading_state"
                >
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm font-medium">
                    {state === "connecting"
                      ? "Connecting to peer..."
                      : "Exchanging messages..."}
                  </p>
                </div>
              )}

              {state === "success" && (
                <div
                  className="flex flex-col items-center gap-4 text-center"
                  data-ocid="qrsync.success_state"
                >
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                  <div>
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                      Sync complete
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {totalSynced === 0
                        ? "Already up to date"
                        : `${totalSynced} message${
                            totalSynced !== 1 ? "s" : ""
                          } synced`}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    data-ocid="qrsync.close_button"
                  >
                    Done
                  </Button>
                </div>
              )}

              {state === "error" && (
                <div
                  className="flex flex-col items-center gap-4 text-center"
                  data-ocid="qrsync.error_state"
                >
                  <XCircle className="w-12 h-12 text-destructive" />
                  <div>
                    <p className="text-sm font-semibold text-destructive">
                      Sync failed
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[200px] leading-relaxed">
                      {errorMessage}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetState}
                    className="gap-2"
                    data-ocid="qrsync.primary_button"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Try Again
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
