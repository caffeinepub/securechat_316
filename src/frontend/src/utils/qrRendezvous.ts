/**
 * QR Rendezvous - IC-backed signaling for WebRTC peer sync
 * Uses the backend canister as a simple rendezvous server to exchange SDP.
 * The backend methods exist in main.mo but may not be in the typed interface.
 */
import type { backendInterface } from "../backend";

// Cast to access sync session methods not declared in backend.d.ts
function asSyncActor(actor: backendInterface) {
  return actor as backendInterface & {
    createSyncSession(offer: string): Promise<string>;
    completeSyncSession(sessionId: string, answer: string): Promise<boolean>;
    getSyncSession(sessionId: string): Promise<[] | [[string, [] | [string]]]>;
  };
}

/**
 * Create a new sync session with an SDP offer.
 * Returns the sessionId to encode into a QR code.
 */
export async function createSession(
  actor: backendInterface,
  offer: string,
): Promise<string> {
  return asSyncActor(actor).createSyncSession(offer);
}

/**
 * Submit the SDP answer to complete signaling.
 */
export async function completeSession(
  actor: backendInterface,
  sessionId: string,
  answer: string,
): Promise<boolean> {
  return asSyncActor(actor).completeSyncSession(sessionId, answer);
}

export interface SessionData {
  offer: string;
  answer: string | null;
}

/**
 * Fetch the current session state (offer + optional answer).
 */
export async function getSession(
  actor: backendInterface,
  sessionId: string,
): Promise<SessionData | null> {
  try {
    const result = await asSyncActor(actor).getSyncSession(sessionId);
    // Candid opt returns [] for None or [[value]] for Some
    if (!result || (Array.isArray(result) && result.length === 0)) return null;
    const tuple = (result as [[string, [] | [string]]])[0];
    if (!tuple) return null;
    const offer = tuple[0];
    const answerOpt = tuple[1];
    const answer =
      Array.isArray(answerOpt) && answerOpt.length > 0
        ? (answerOpt[0] ?? null)
        : null;
    return { offer, answer };
  } catch {
    return null;
  }
}

/**
 * Poll until the joining device submits an answer SDP, or timeout.
 * Used by the host while displaying the QR code.
 */
export async function pollForAnswer(
  actor: backendInterface,
  sessionId: string,
  timeoutMs = 60000,
): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const session = await getSession(actor, sessionId);
    if (session?.answer) return session.answer;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
}

/**
 * Poll until the offer is confirmed available.
 * When a QR is scanned, the offer should already be present.
 */
export async function pollForOffer(
  actor: backendInterface,
  sessionId: string,
  timeoutMs = 10000,
): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const session = await getSession(actor, sessionId);
    if (session?.offer) return session.offer;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return null;
}
