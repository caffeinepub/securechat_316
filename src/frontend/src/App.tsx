import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Toaster } from "sonner";
import { AppShell } from "./components/AppShell";
import type { Page } from "./components/AppShell";
import { ChatView } from "./components/ChatView";
import { ChatsPage } from "./components/ChatsPage";
import { ContactsPage } from "./components/ContactsPage";
import { LandingPage } from "./components/LandingPage";
import { NotificationsPanel } from "./components/NotificationsPanel";
import { PinSetupModal } from "./components/PinSetupModal";
import { ProfileSetupDialog } from "./components/ProfileSetupDialog";
import { SearchOverlay } from "./components/SearchOverlay";
import { SettingsPage } from "./components/SettingsPage";
import { StatusPage } from "./components/StatusPage";
import { TwoFactorGate } from "./components/TwoFactorGate";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import {
  useConversations,
  useNotifications,
  useProfile,
  useTwoFactorStatus,
} from "./hooks/useQueries";
import { ThemeProvider } from "./hooks/useTheme";

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const { identity, isInitializing, login, clear } = useInternetIdentity();
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;
  const [twoFactorVerified, setTwoFactorVerified] = useState(false);

  // Query 2FA status — only matters once actor is ready
  const { data: tfStatus } = useTwoFactorStatus();

  // Reset 2FA verification when identity changes (logout/login)
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    setTwoFactorVerified(false);
  }, [identity]);

  const logout = useCallback(() => {
    setTwoFactorVerified(false);
    queryClient.clear();
    clear();
  }, [clear, queryClient]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LandingPage onGetStarted={login} />
        <Toaster position="bottom-right" />
      </>
    );
  }

  if (!actor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only show the 2FA gate when 2FA is actually enabled and not yet verified
  const twoFactorEnabled = tfStatus?.enabled === true;
  if (twoFactorEnabled && !twoFactorVerified) {
    return (
      <>
        <TwoFactorGate
          onVerified={() => setTwoFactorVerified(true)}
          onLogout={logout}
        />
        <Toaster position="bottom-right" />
      </>
    );
  }

  return <AuthenticatedApp onLogout={logout} />;
}

function AuthenticatedApp({ onLogout }: { onLogout: () => void }) {
  const {
    data: profile,
    isLoading: isLoadingProfile,
    isError: isProfileError,
  } = useProfile();
  const { data: conversations = [] } = useConversations();
  const { data: notifications = [] } = useNotifications();
  const { actor } = useActor();

  const [currentPage, setCurrentPage] = useState<Page>("chats");
  const [activeConversationId, setActiveConversationId] = useState<
    bigint | null
  >(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // PIN setup gate — checked once after profile is confirmed
  const [pinCheckDone, setPinCheckDone] = useState(false);
  const [needsPinSetup, setNeedsPinSetup] = useState(false);

  // Keyboard shortcut for search (Ctrl+K / Cmd+K)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setShowSearch(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const hasProfile = !isProfileError && profile?.name;

  // Check for existing key backup once profile is confirmed
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (!hasProfile || !actor || pinCheckDone) return;

    actor
      .getEncryptedKeyBackup()
      .then((result) => {
        const hasBackup = result && (result as Uint8Array).length > 0;
        setNeedsPinSetup(!hasBackup);
        setPinCheckDone(true);
      })
      .catch(() => {
        // Treat errors as "no backup" — prompt setup
        setNeedsPinSetup(true);
        setPinCheckDone(true);
      });
  }, [hasProfile, actor]);

  const bellUnreadCount = notifications.filter(
    (n) => n.kind !== "NewMessage" && !n.read,
  ).length;

  // Sum per-conversation unread counts — these are cursor-based and
  // correctly cleared when the user opens and reads a conversation.
  const messageUnreadCount = conversations.reduce(
    (sum, c) => sum + Number(c.unreadCount),
    0,
  );

  const handleOpenChat = (conversationId: bigint) => {
    setActiveConversationId(conversationId);
  };

  const handleBackFromChat = () => {
    setActiveConversationId(null);
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Find the active conversation object for ChatView
  const activeConversation = activeConversationId
    ? (conversations.find((c) => c.id === activeConversationId) ?? null)
    : null;

  const renderPage = () => {
    // If a chat is open, show the ChatView
    if (activeConversation) {
      return (
        <ChatView
          conversation={activeConversation}
          onBack={handleBackFromChat}
        />
      );
    }

    switch (currentPage) {
      case "chats":
        return <ChatsPage onOpenChat={handleOpenChat} />;
      case "contacts":
        return <ContactsPage onOpenChat={handleOpenChat} />;
      case "status":
        return <StatusPage />;
      case "settings":
        return <SettingsPage onLogout={onLogout} />;
    }
  };

  // Show PIN setup gate if profile exists but no key backup found
  if (hasProfile && pinCheckDone && needsPinSetup) {
    return (
      <>
        <PinSetupModal
          open={true}
          required={true}
          onClose={() => {}}
          onComplete={() => {
            setNeedsPinSetup(false);
          }}
        />
        <Toaster position="bottom-right" />
      </>
    );
  }

  // Show spinner while checking for backup (only after profile is ready)
  if (hasProfile && !pinCheckDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <ProfileSetupDialog open={!hasProfile} />

      {hasProfile && (
        <AppShell
          currentPage={currentPage}
          onNavigate={(page) => {
            setActiveConversationId(null);
            setCurrentPage(page);
          }}
          profileName={profile.name}
          profileAvatar={profile.avatar ?? null}
          onLogout={onLogout}
          onSearch={() => setShowSearch(true)}
          onNotifications={() => setShowNotifications(true)}
          messageUnreadCount={messageUnreadCount}
          bellUnreadCount={bellUnreadCount}
          hideBottomNav={!!activeConversation}
        >
          {renderPage()}
        </AppShell>
      )}

      <SearchOverlay
        open={showSearch}
        onOpenChange={setShowSearch}
        onOpenChat={(convId) => {
          setActiveConversationId(convId);
          setCurrentPage("chats");
        }}
      />

      <NotificationsPanel
        open={showNotifications}
        onOpenChange={setShowNotifications}
        onOpenChat={(convId) => {
          setActiveConversationId(convId);
          setCurrentPage("chats");
          setShowNotifications(false);
        }}
      />

      <Toaster position="bottom-right" />
    </>
  );
}
