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
import { ProfileSetupDialog } from "./components/ProfileSetupDialog";
import { SearchOverlay } from "./components/SearchOverlay";
import { SettingsPage } from "./components/SettingsPage";
import { StatusPage } from "./components/StatusPage";
import { TwoFactorGate } from "./components/TwoFactorGate";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import {
  useConversations,
  useProfile,
  useUnreadCount,
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

  if (!twoFactorVerified) {
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
  const { data: unreadCount = BigInt(0) } = useUnreadCount();

  const [currentPage, setCurrentPage] = useState<Page>("chats");
  const [activeConversationId, setActiveConversationId] = useState<
    bigint | null
  >(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

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

  const hasProfile = profile?.name;

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

  if (isProfileError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-destructive">Failed to load profile.</p>
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
          unreadCount={Number(unreadCount)}
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
