import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  Clock,
  FolderOpen,
  Lock,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Server,
  Shield,
  UserCheck,
  Users,
} from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
}

const FEATURES = [
  {
    icon: Shield,
    title: "End-to-End Encrypted",
    description:
      "Every message is access-controlled on-chain. Only you and your contacts can read your conversations.",
  },
  {
    icon: MessageSquare,
    title: "1:1 & Group Chats",
    description:
      "Direct messages and group conversations with up to hundreds of members, all in one place.",
  },
  {
    icon: FolderOpen,
    title: "File & Media Sharing",
    description:
      "Share images, documents, and audio. Files are stored securely on the Internet Computer.",
  },
  {
    icon: Clock,
    title: "Status Updates",
    description:
      "Post status updates that expire after 24 hours — like Stories, but on-chain and private.",
  },
  {
    icon: UserCheck,
    title: "Contact Management",
    description:
      "Add contacts by search or share link. Block, report, or remove contacts at any time.",
  },
  {
    icon: RefreshCw,
    title: "Cross-Device Sync",
    description:
      "Your data lives on the Internet Computer. Log in with Internet Identity from any device.",
  },
];

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white font-sans">
      <LandingNav />
      <HeroSection onGetStarted={onGetStarted} />
      <FeaturesSection />
      <LandingFooter />
    </div>
  );
}

function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center shadow-sm">
            <Lock className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            SecureChat
          </span>
        </div>

        <div />
      </div>
    </header>
  );
}

function HeroSection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(13,148,136,0.08),transparent)] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-0">
        <div className="flex justify-center mb-8 opacity-0 animate-fade-up">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1 text-xs font-medium text-teal-700 shadow-xs">
            <Lock className="w-3 h-3" />
            Private & Encrypted
          </span>
        </div>

        <h1 className="text-center font-serif text-5xl sm:text-6xl lg:text-[4.5rem] font-semibold leading-[1.08] tracking-tight text-slate-900 max-w-3xl mx-auto mb-6 opacity-0 animate-fade-up-delay">
          Private Messaging,{" "}
          <em className="not-italic text-teal-600">Built for Trust</em>
        </h1>

        <p className="text-center text-slate-500 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed opacity-0 animate-fade-up-delay-2">
          Secure 1:1 and group chats, file sharing, and status updates — all
          running on the Internet Computer with Internet Identity
          authentication.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-20 opacity-0 animate-fade-up-delay-2">
          <Button
            size="lg"
            onClick={onGetStarted}
            className="bg-slate-900 hover:bg-slate-700 text-white rounded-full px-8 h-12 text-sm font-medium group transition-all duration-200"
          >
            Get Started with Internet Identity
            <ChevronRight className="ml-1.5 w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>

        <PhoneMockup />
      </div>

      <div className="h-24 bg-gradient-to-b from-white to-slate-50" />
    </section>
  );
}

function PhoneMockup() {
  return (
    <div className="relative flex items-end justify-center h-[500px]">
      {/* Left floating cards */}
      <div className="absolute left-0 xl:left-12 top-8 flex-col gap-4 hidden lg:flex opacity-0 animate-slide-in-left">
        <FloatingCard
          icon={Shield}
          label="256-bit Encrypted"
          sublabel="AES + on-chain ACL"
          accent="teal"
        />
        <FloatingCard
          icon={Server}
          label="99.9% Uptime"
          sublabel="ICP replicated state"
          accent="slate"
        />
      </div>

      {/* Phone frame */}
      <div className="relative w-64 h-[480px] bg-slate-900 rounded-[3rem] border-[3px] border-slate-700 shadow-2xl shadow-slate-900/25 overflow-hidden flex flex-col animate-float-slow">
        {/* Status bar */}
        <div className="shrink-0 pt-3 pb-1 px-5 flex items-center justify-between">
          <span className="text-white/40 text-[10px] font-medium">9:41</span>
          <div className="w-16 h-4 bg-slate-800 rounded-full" />
          <div className="flex items-center gap-1">
            <div className="w-4 h-2 border border-white/25 rounded-[2px]" />
          </div>
        </div>

        {/* Chat header */}
        <div className="shrink-0 px-4 py-2.5 border-b border-slate-700/60 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-sm">
            A
          </div>
          <div>
            <div className="text-white text-[11px] font-semibold leading-tight">
              Alice
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              <span className="text-teal-400 text-[9px]">Online</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 px-3 py-3 flex flex-col gap-2.5 overflow-hidden">
          <div className="flex justify-start">
            <div className="bg-slate-700 text-white/90 text-[10px] px-3 py-2 rounded-2xl rounded-bl-sm max-w-[78%] leading-relaxed shadow-sm">
              Hey! Did you get the files?
            </div>
          </div>
          <div className="flex justify-end">
            <div className="bg-teal-600 text-white text-[10px] px-3 py-2 rounded-2xl rounded-br-sm max-w-[78%] leading-relaxed shadow-sm">
              Yes! All encrypted 🔒
            </div>
          </div>
          <div className="flex justify-start">
            <div className="bg-slate-700 text-white/90 text-[10px] px-3 py-2 rounded-2xl rounded-bl-sm max-w-[78%] leading-relaxed shadow-sm">
              Sharing the doc now 📎
            </div>
          </div>
          <div className="flex justify-end">
            <div className="bg-teal-600 text-white text-[10px] px-3 py-2 rounded-2xl rounded-br-sm max-w-[78%] leading-relaxed shadow-sm">
              Got it, perfect 👍
            </div>
          </div>

          {/* Typing indicator */}
          <div className="flex justify-start mt-auto">
            <div className="bg-slate-700 px-3 py-2 rounded-2xl rounded-bl-sm flex gap-1 items-center">
              {[0, 150, 300].map((delay) => (
                <div
                  key={delay}
                  className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Input bar */}
        <div className="shrink-0 px-3 pb-5 pt-2 border-t border-slate-700/60">
          <div className="bg-slate-800 rounded-full h-9 flex items-center px-4 gap-2">
            <div className="flex-1 h-1.5 bg-slate-700 rounded-full" />
            <Paperclip className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center shrink-0">
              <ChevronRight className="w-3 h-3 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Right floating cards */}
      <div className="absolute right-0 xl:right-12 top-8 flex-col gap-4 hidden lg:flex opacity-0 animate-slide-in-right">
        <FloatingCard
          icon={Users}
          label="Group Chats"
          sublabel="Up to 500 members"
          accent="indigo"
        />
        <FloatingCard
          icon={Paperclip}
          label="File Sharing"
          sublabel="Any format, on-chain"
          accent="amber"
        />
      </div>
    </div>
  );
}

type AccentColor = "teal" | "slate" | "indigo" | "amber";

const accentStyles: Record<
  AccentColor,
  { card: string; icon: string; iconText: string }
> = {
  teal: {
    card: "border-teal-100",
    icon: "bg-teal-50",
    iconText: "text-teal-600",
  },
  slate: {
    card: "border-slate-200",
    icon: "bg-slate-100",
    iconText: "text-slate-600",
  },
  indigo: {
    card: "border-indigo-100",
    icon: "bg-indigo-50",
    iconText: "text-indigo-600",
  },
  amber: {
    card: "border-amber-100",
    icon: "bg-amber-50",
    iconText: "text-amber-600",
  },
};

function FloatingCard({
  icon: Icon,
  label,
  sublabel,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  sublabel: string;
  accent: AccentColor;
}) {
  const s = accentStyles[accent];
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-md w-52",
        s.card,
      )}
    >
      <div
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
          s.icon,
        )}
      >
        <Icon className={cn("w-4 h-4", s.iconText)} />
      </div>
      <div>
        <div className="text-[12px] font-semibold text-slate-800">{label}</div>
        <div className="text-[10px] text-slate-400 mt-0.5">{sublabel}</div>
      </div>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section className="bg-slate-50 py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl font-semibold text-slate-900 mb-4 tracking-tight">
            Everything you need to communicate privately
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto text-base leading-relaxed">
            SecureChat brings the best of modern messaging to the Internet
            Computer — with real on-chain data ownership.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs hover:shadow-md transition-shadow duration-200 group"
            >
              <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-teal-100 transition-colors duration-200">
                <feature.icon className="w-5 h-5 text-teal-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2 text-sm">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="bg-slate-900 py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-teal-500 rounded-lg flex items-center justify-center">
            <Lock className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-white font-semibold text-sm">SecureChat</span>
        </div>

        <p className="text-slate-400 text-sm text-center">
          Built on the{" "}
          <span className="text-teal-400 font-medium">Internet Computer</span> —
          your data, your keys, your control.
        </p>

        <p className="text-slate-600 text-xs">© 2025 SecureChat</p>
      </div>
    </footer>
  );
}
