import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  Bell,
  Lock,
  LogOut,
  MessageSquare,
  Radio,
  Search,
  Settings,
  Users,
} from "lucide-react";
import type { ExternalBlob } from "../hooks/useQueries";
import { UserAvatar } from "./UserAvatar";

export type Page = "chats" | "contacts" | "status" | "settings";

interface AppShellProps {
  children: React.ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  profileName: string;
  profileAvatar?: ExternalBlob | null;
  onLogout: () => void;
  onSearch?: () => void;
  onNotifications?: () => void;
  messageUnreadCount?: number;
  bellUnreadCount?: number;
}

const NAV_ITEMS: { page: Page; icon: typeof MessageSquare; label: string }[] = [
  { page: "chats", icon: MessageSquare, label: "Chats" },
  { page: "contacts", icon: Users, label: "Contacts" },
  { page: "status", icon: Radio, label: "Status" },
  { page: "settings", icon: Settings, label: "Settings" },
];

export function AppShell({
  children,
  currentPage,
  onNavigate,
  profileName,
  profileAvatar,
  onLogout,
  onSearch,
  onNotifications,
  messageUnreadCount = 0,
  bellUnreadCount = 0,
}: AppShellProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="flex flex-col h-dvh bg-background">
        <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
        <MobileNav
          currentPage={currentPage}
          onNavigate={onNavigate}
          onSearch={onSearch}
          onNotifications={onNotifications}
          messageUnreadCount={messageUnreadCount}
          bellUnreadCount={bellUnreadCount}
        />
      </div>
    );
  }

  return (
    <div className="flex h-dvh bg-background">
      <DesktopSidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        profileName={profileName}
        profileAvatar={profileAvatar}
        onLogout={onLogout}
        onSearch={onSearch}
        onNotifications={onNotifications}
        messageUnreadCount={messageUnreadCount}
        bellUnreadCount={bellUnreadCount}
      />
      <div className="flex-1 min-w-0 overflow-hidden">{children}</div>
    </div>
  );
}

function DesktopSidebar({
  currentPage,
  onNavigate,
  profileName,
  profileAvatar,
  onLogout,
  onSearch,
  onNotifications,
  messageUnreadCount,
  bellUnreadCount,
}: {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  profileName: string;
  profileAvatar?: ExternalBlob | null;
  onLogout: () => void;
  onSearch?: () => void;
  onNotifications?: () => void;
  messageUnreadCount: number;
  bellUnreadCount: number;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <aside className="w-[68px] bg-sidebar border-r border-sidebar-border flex flex-col items-center py-4 shrink-0">
        {/* Logo */}
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm mb-6">
          <Lock className="w-5 h-5 text-primary-foreground" />
        </div>

        {/* Nav items */}
        <nav className="flex flex-col items-center gap-1 flex-1">
          {/* Search button */}
          {onSearch && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onSearch}
                  className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent mb-2"
                >
                  <Search className="w-[20px] h-[20px]" strokeWidth={1.8} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                Search ({navigator.platform.includes("Mac") ? "⌘" : "Ctrl+"}K)
              </TooltipContent>
            </Tooltip>
          )}
          {/* Notifications button */}
          {onNotifications && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onNotifications}
                  className="relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent mb-2"
                >
                  <Bell className="w-[20px] h-[20px]" strokeWidth={1.8} />
                  {bellUnreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1">
                      {bellUnreadCount > 99 ? "99+" : bellUnreadCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                Notifications
              </TooltipContent>
            </Tooltip>
          )}
          {NAV_ITEMS.map(({ page, icon: Icon, label }) => {
            const isActive = currentPage === page;
            return (
              <Tooltip key={page}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onNavigate(page)}
                    className={cn(
                      "relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                    )}
                  >
                    <Icon
                      className="w-[20px] h-[20px]"
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                    {page === "chats" && messageUnreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 min-w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1">
                        {messageUnreadCount > 99 ? "99+" : messageUnreadCount}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="flex flex-col items-center gap-2">
          <Separator className="w-8 bg-sidebar-border mb-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onLogout}
                className="w-11 h-11 rounded-xl flex items-center justify-center text-sidebar-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all duration-150"
              >
                <LogOut className="w-[18px] h-[18px]" strokeWidth={1.8} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              Log out
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="w-11 h-11 rounded-xl p-0 hover:bg-sidebar-accent"
                onClick={() => onNavigate("settings")}
              >
                <UserAvatar
                  name={profileName}
                  avatarBlob={profileAvatar ?? null}
                  className="h-8 w-8"
                  fallbackClassName="text-xs"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              {profileName}
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}

function MobileNav({
  currentPage,
  onNavigate,
  onSearch,
  onNotifications,
  messageUnreadCount = 0,
  bellUnreadCount = 0,
}: {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onSearch?: () => void;
  onNotifications?: () => void;
  messageUnreadCount?: number;
  bellUnreadCount?: number;
}) {
  const mobileItems: {
    key: string;
    icon: typeof MessageSquare;
    label: string;
    action: () => void;
    isPage: boolean;
  }[] = [
    {
      key: "chats",
      icon: MessageSquare,
      label: "Chats",
      action: () => onNavigate("chats"),
      isPage: true,
    },
    {
      key: "contacts",
      icon: Users,
      label: "Contacts",
      action: () => onNavigate("contacts"),
      isPage: true,
    },
    {
      key: "status",
      icon: Radio,
      label: "Status",
      action: () => onNavigate("status"),
      isPage: true,
    },
    {
      key: "notifications",
      icon: Bell,
      label: "Alerts",
      action: () => onNotifications?.(),
      isPage: false,
    },
    {
      key: "settings",
      icon: Settings,
      label: "Settings",
      action: () => onNavigate("settings"),
      isPage: true,
    },
  ];

  return (
    <nav className="shrink-0 border-t border-border/60 bg-background pb-[env(safe-area-inset-bottom)]">
      {onSearch && (
        <button
          type="button"
          onClick={onSearch}
          className="flex items-center gap-2 w-[calc(100%-24px)] mx-3 mt-2 px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground transition-colors active:bg-muted"
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs">Search conversations...</span>
        </button>
      )}
      <div className="flex items-center justify-around h-14">
        {mobileItems.map(({ key, icon: Icon, label, action, isPage }) => {
          const isActive = isPage && currentPage === key;
          const badgeCount =
            key === "notifications"
              ? bellUnreadCount
              : key === "chats"
                ? messageUnreadCount
                : 0;
          return (
            <button
              type="button"
              key={key}
              onClick={action}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 h-full flex-1 min-w-0 transition-colors duration-150",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.2 : 1.8} />
                {badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center px-0.5">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
