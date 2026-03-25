import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DiscoveryMode } from "@/hooks/useQueries";
import {
  Ban,
  Eye,
  EyeOff,
  Info,
  Key,
  Loader2,
  Lock,
  LogOut,
  Monitor,
  Moon,
  Radio,
  RotateCcw,
  Sun,
  Timer,
  UserSearch,
} from "lucide-react";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import {
  type TimeoutOption,
  getTimeoutSetting,
  setTimeoutSetting,
} from "../hooks/usePinSession";
import {
  useDiscoveryMode,
  useProfile,
  useUpdateDiscoveryMode,
} from "../hooks/useQueries";
import { useTheme } from "../hooks/useTheme";
import { BackupRestoreSection } from "./BackupRestoreSection";
import { BlockedUsersDialog } from "./BlockedUsersDialog";
import { EditProfileDialog } from "./EditProfileDialog";
import { EmailServiceConfig } from "./EmailServiceConfig";
import { EmailVerificationSection } from "./EmailVerificationSection";
import { KeyRecoveryModal } from "./KeyRecoveryModal";
import { PinSetupModal } from "./PinSetupModal";
import { QrSyncModal } from "./QrSyncModal";
import { SettingsItem } from "./SettingsItem";
import { UserAvatar } from "./UserAvatar";

type DiscoveryKey = "Open" | "IdOnly" | "Hidden";

function discoveryModeToKey(mode: DiscoveryMode): DiscoveryKey {
  if (mode === DiscoveryMode.Open) return "Open";
  if (mode === DiscoveryMode.IdOnly) return "IdOnly";
  return "Hidden";
}

function keyToDiscoveryMode(key: DiscoveryKey): DiscoveryMode {
  if (key === "Open") return DiscoveryMode.Open;
  if (key === "IdOnly") return DiscoveryMode.IdOnly;
  return DiscoveryMode.Hidden;
}

const DISCOVERY_OPTIONS: {
  key: DiscoveryKey;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    key: "Open",
    label: "Open",
    description: "Anyone can find you by name",
    icon: UserSearch,
  },
  {
    key: "IdOnly",
    label: "ID only",
    description: "Only findable by your contact ID",
    icon: Eye,
  },
  {
    key: "Hidden",
    label: "Hidden",
    description: "Not findable by anyone",
    icon: EyeOff,
  },
];

const THEME_OPTIONS: {
  key: "light" | "dark" | "system";
  label: string;
  icon: React.ElementType;
}[] = [
  { key: "light", label: "Light", icon: Sun },
  { key: "system", label: "System", icon: Monitor },
  { key: "dark", label: "Dark", icon: Moon },
];

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="px-4 py-3 space-y-3" data-ocid="settings.appearance.panel">
      <div className="flex items-center gap-2">
        <Sun className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Appearance</span>
      </div>

      <ToggleGroup
        type="single"
        value={theme}
        onValueChange={(val) => {
          if (val) setTheme(val as "light" | "dark" | "system");
        }}
        className="grid grid-cols-3 gap-1.5 w-full"
        data-ocid="settings.appearance.toggle"
      >
        {THEME_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <ToggleGroupItem
              key={opt.key}
              value={opt.key}
              aria-label={opt.label}
              className="flex flex-col items-center gap-1 h-auto py-2.5 px-2 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-lg border"
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{opt.label}</span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>

      <p className="text-xs text-muted-foreground">
        {theme === "system"
          ? "Follows your device settings"
          : theme === "dark"
            ? "Always use dark mode"
            : "Always use light mode"}
      </p>
    </div>
  );
}

function ProfileVisibilitySection() {
  const { data: currentMode, isLoading: isLoadingMode } = useDiscoveryMode();
  const { mutateAsync: updateMode, isPending } = useUpdateDiscoveryMode();

  const currentKey: DiscoveryKey = currentMode
    ? discoveryModeToKey(currentMode)
    : "Open";

  async function handleChange(value: string) {
    if (!value || value === currentKey) return;
    const key = value as DiscoveryKey;
    const label = DISCOVERY_OPTIONS.find((o) => o.key === key)?.label ?? key;
    try {
      await updateMode(keyToDiscoveryMode(key));
      toast.success(`Visibility updated to ${label}`);
    } catch {
      toast.error("Failed to update visibility. Please try again.");
    }
  }

  return (
    <div className="px-4 py-3 space-y-3" data-ocid="settings.visibility.panel">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Profile Visibility</span>
        </div>
        {(isLoadingMode || isPending) && (
          <Loader2
            className="w-4 h-4 animate-spin text-muted-foreground"
            data-ocid="settings.visibility.loading_state"
          />
        )}
      </div>

      <ToggleGroup
        type="single"
        value={currentKey}
        onValueChange={handleChange}
        disabled={isPending || isLoadingMode}
        className="grid grid-cols-3 gap-1.5 w-full"
        data-ocid="settings.visibility.toggle"
      >
        {DISCOVERY_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <ToggleGroupItem
              key={option.key}
              value={option.key}
              aria-label={option.label}
              className="flex flex-col items-center gap-1 h-auto py-2.5 px-2 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-lg border"
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{option.label}</span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>

      <p className="text-xs text-muted-foreground">
        {DISCOVERY_OPTIONS.find((o) => o.key === currentKey)?.description}
      </p>
    </div>
  );
}

interface SettingsPageProps {
  onLogout: () => void;
}

export function SettingsPage({ onLogout }: SettingsPageProps) {
  const { data: profile } = useProfile();
  const { actor } = useActor();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showQrSync, setShowQrSync] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [sessionTimeout, setSessionTimeoutState] = useState<TimeoutOption>(() =>
    getTimeoutSetting(),
  );

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-4 pt-4 pb-3">
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 space-y-6 pb-8">
          {/* Profile section */}
          {profile && (
            <button
              type="button"
              onClick={() => setShowEditProfile(true)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border hover:bg-accent transition-colors text-left"
            >
              <UserAvatar
                name={profile.name}
                avatarBlob={profile.avatar ?? null}
                className="h-14 w-14"
                fallbackClassName="text-lg"
              />
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold truncate">
                  {profile.name}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {profile.bio || "Add a bio..."}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </button>
          )}

          {/* Appearance */}
          <div>
            <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wider px-1">
              Appearance
            </h2>
            <div className="rounded-xl border divide-y">
              <AppearanceSection />
            </div>
          </div>

          {/* Privacy & Security */}
          <div>
            <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wider px-1">
              Privacy & Security
            </h2>
            <div className="rounded-xl border divide-y">
              <SettingsItem
                icon={Ban}
                label="Blocked Users"
                description="Manage blocked contacts"
                onClick={() => setShowBlocked(true)}
              />
              <ProfileVisibilitySection />
              <EmailVerificationSection />
            </div>
          </div>

          {/* Email Service */}
          <div>
            <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wider px-1">
              Email Service
            </h2>
            <div className="rounded-xl border divide-y">
              <EmailServiceConfig />
            </div>
          </div>

          {/* Data */}
          <div>
            <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wider px-1">
              Data
            </h2>
            <div className="rounded-xl border divide-y">
              <BackupRestoreSection />
            </div>
          </div>

          {/* Encryption & Keys */}
          <div>
            <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wider px-1">
              Encryption & Keys
            </h2>
            <div className="rounded-xl border divide-y">
              <SettingsItem
                icon={Key}
                label="Change PIN"
                description="Update your on-chain key backup PIN"
                onClick={() => setShowPinSetup(true)}
                data-ocid="settings.change_pin.button"
              />
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium flex-1">
                    Session Timeout
                  </span>
                </div>
                <select
                  value={sessionTimeout}
                  onChange={(e) => {
                    const val = e.target.value as TimeoutOption;
                    setTimeoutSetting(val);
                    setSessionTimeoutState(val);
                  }}
                  className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-amber-500/30"
                  data-ocid="settings.session_timeout.select"
                >
                  <option value="5min">5 minutes</option>
                  <option value="10min">10 minutes</option>
                  <option value="30min">30 minutes</option>
                  <option value="1hr">1 hour</option>
                  <option value="never">Never</option>
                </select>
              </div>
              <SettingsItem
                icon={RotateCcw}
                label="Recovery Code"
                description="Generate a one-time code to restore keys on another device"
                onClick={() => setShowRecovery(true)}
                data-ocid="settings.recovery_code.button"
              />
            </div>
          </div>

          {/* Mesh Sync */}
          <div>
            <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wider px-1">
              Mesh Sync
            </h2>
            <div className="rounded-xl border divide-y">
              <SettingsItem
                icon={Radio}
                label="QR Sync"
                description="Exchange messages directly with a nearby device"
                onClick={() => setShowQrSync(true)}
                data-ocid="settings.qrsync.button"
              />
            </div>
          </div>

          {/* About */}
          <div>
            <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wider px-1">
              About
            </h2>
            <div className="rounded-xl border divide-y">
              <SettingsItem
                icon={Lock}
                label="RelayNet"
                description="Unkillable communication infrastructure"
              />
              <SettingsItem icon={Info} label="Version" description="1.0.0" />
            </div>
          </div>

          {/* Logout */}
          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/5 gap-2"
            onClick={() => setShowLogoutConfirm(true)}
            data-ocid="settings.logout.button"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </Button>
        </div>
      </ScrollArea>

      {profile && (
        <EditProfileDialog
          open={showEditProfile}
          onOpenChange={setShowEditProfile}
          currentName={profile.name}
          currentBio={profile.bio}
          currentAvatar={profile.avatar ?? null}
        />
      )}

      <BlockedUsersDialog open={showBlocked} onOpenChange={setShowBlocked} />
      <PinSetupModal
        open={showPinSetup}
        onClose={() => setShowPinSetup(false)}
        onComplete={() => setShowPinSetup(false)}
        data-ocid="settings.pin_setup.dialog"
      />
      <KeyRecoveryModal
        open={showRecovery}
        mode="generate"
        onClose={() => setShowRecovery(false)}
        data-ocid="settings.key_recovery.dialog"
      />

      {actor && (
        <QrSyncModal
          open={showQrSync}
          onOpenChange={setShowQrSync}
          actor={actor}
        />
      )}

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You can log back in anytime with Internet Identity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onLogout}>Log Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
