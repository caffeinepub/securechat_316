/**
 * In-memory PIN session manager.
 * The unlock timestamp lives at module scope so it survives React re-renders.
 */
import { useCallback, useEffect, useState } from "react";

const SESSION_TIMEOUT_KEY = "relaynet-pin-timeout";

let unlockTimestamp: number | null = null;

export type TimeoutOption = "5min" | "10min" | "30min" | "1hr" | "never";

const TIMEOUT_MS: Record<TimeoutOption, number | null> = {
  "5min": 5 * 60 * 1000,
  "10min": 10 * 60 * 1000,
  "30min": 30 * 60 * 1000,
  "1hr": 60 * 60 * 1000,
  never: null,
};

export function getTimeoutSetting(): TimeoutOption {
  return (
    (localStorage.getItem(SESSION_TIMEOUT_KEY) as TimeoutOption) ?? "30min"
  );
}

export function setTimeoutSetting(value: TimeoutOption): void {
  localStorage.setItem(SESSION_TIMEOUT_KEY, value);
}

export function isUnlocked(): boolean {
  if (unlockTimestamp === null) return false;
  const timeout = TIMEOUT_MS[getTimeoutSetting()];
  if (timeout === null) return true; // "never" timeout
  return Date.now() - unlockTimestamp < timeout;
}

export function unlock(): void {
  unlockTimestamp = Date.now();
}

export function lock(): void {
  unlockTimestamp = null;
}

/** Hook that re-checks session state on an interval */
export function useSessionTimeout(): {
  sessionActive: boolean;
  refresh: () => void;
} {
  const [sessionActive, setSessionActive] = useState(() => isUnlocked());

  const refresh = useCallback(() => {
    setSessionActive(isUnlocked());
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const active = isUnlocked();
      setSessionActive(active);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return { sessionActive, refresh };
}
