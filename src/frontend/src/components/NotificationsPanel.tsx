import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useMarkNotificationsRead,
  useNotifications,
  useToggleNotificationRead,
} from "../hooks/useQueries";
import { NotificationItem } from "./NotificationItem";

interface NotificationsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChat: (conversationId: bigint) => void;
}

export function NotificationsPanel({
  open,
  onOpenChange,
  onOpenChat,
}: NotificationsPanelProps) {
  const { data: notifications = [], isLoading, isError } = useNotifications();
  const { mutate: markRead, isPending } = useMarkNotificationsRead();
  const { mutate: toggleRead } = useToggleNotificationRead();

  // Filter out message notifications -- those are shown on the chats icon badge
  const visibleNotifications = notifications.filter(
    (n) => n.kind !== "NewMessage",
  );

  const hasUnread = visibleNotifications.some((n) => !n.read);

  const handleMarkAllRead = () => {
    if (visibleNotifications.length === 0) return;
    const maxId = visibleNotifications.reduce(
      (max, n) => (n.id > max ? n.id : max),
      visibleNotifications[0].id,
    );
    markRead(maxId, {
      onSuccess: () => toast.success("All notifications marked as read"),
      onError: () => toast.error("Failed to mark as read"),
    });
  };

  const handleNotificationClick = (
    notification: (typeof visibleNotifications)[0],
  ) => {
    toggleRead(notification.id);
    if (notification.conversationId != null && !notification.read) {
      onOpenChat(notification.conversationId);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[360px] sm:w-[400px] p-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle>Notifications</SheetTitle>
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={handleMarkAllRead}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )}
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100dvh-65px)]">
          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {isError && (
            <div className="text-destructive text-center py-12 text-sm">
              Failed to load notifications.
            </div>
          )}

          {!isLoading && !isError && visibleNotifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Bell className="w-7 h-7 text-primary/50" />
              </div>
              <p className="text-base font-medium text-foreground mb-1">
                No notifications
              </p>
              <p className="text-sm text-muted-foreground">
                You&apos;re all caught up
              </p>
            </div>
          )}

          {!isLoading && !isError && visibleNotifications.length > 0 && (
            <div className="p-2 space-y-0.5">
              {visibleNotifications.map((notif) => (
                <NotificationItem
                  key={Number(notif.id)}
                  notification={notif}
                  onClick={() => handleNotificationClick(notif)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
