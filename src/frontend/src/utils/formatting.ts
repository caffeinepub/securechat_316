import { format, formatDistanceToNow, fromUnixTime } from "date-fns";

export function fromNanoseconds(timestamp: bigint): Date {
  return fromUnixTime(Number(timestamp) / 1_000_000_000);
}

export function formatTimestamp(timestamp: bigint): string {
  const date = fromNanoseconds(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 1) {
    return format(date, "h:mm a");
  }
  if (diffDays < 7) {
    return format(date, "EEE");
  }
  return format(date, "MMM d");
}

export function formatMessageTime(timestamp: bigint): string {
  return format(fromNanoseconds(timestamp), "h:mm a");
}

export function formatRelativeTime(timestamp: bigint): string {
  return formatDistanceToNow(fromNanoseconds(timestamp), { addSuffix: true });
}

export function formatLastSeen(timestamp: bigint): string {
  if (Number(timestamp) === 0) return "Never";
  const date = fromNanoseconds(timestamp);
  const now = new Date();
  const diffMin = (now.getTime() - date.getTime()) / (1000 * 60);

  if (diffMin < 5) return "Online";
  return `Last seen ${formatDistanceToNow(date, { addSuffix: true })}`;
}

export function isOnline(timestamp: bigint): boolean {
  if (Number(timestamp) === 0) return false;
  const date = fromNanoseconds(timestamp);
  const diffMin = (new Date().getTime() - date.getTime()) / (1000 * 60);
  return diffMin < 5;
}

export function formatFileSize(bytes: number | bigint): string {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
