import {
  Fingerprint,
  GitBranch,
  Radio,
  RefreshCw,
  Shield,
  Wifi,
} from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
}

const FEATURES = [
  {
    icon: Radio,
    title: "Delay-Tolerant",
    description:
      "Messages survive network gaps. Delivered when a path exists, not just when you're online.",
  },
  {
    icon: Shield,
    title: "End-to-End Encrypted",
    description:
      "AES-256 + on-chain ACL. Relays carry opaque ciphertext — they cannot read your messages.",
  },
  {
    icon: Wifi,
    title: "Offline-First",
    description:
      "Local IndexedDB log. Your messages exist on your device first. The network is optional.",
  },
  {
    icon: GitBranch,
    title: "Peer-to-Peer Relay",
    description:
      "QR rendezvous + WebRTC. Exchange message stores directly with nearby devices, no internet needed.",
  },
  {
    icon: Fingerprint,
    title: "Verified Identity",
    description:
      "Internet Identity authentication. Cryptographic proof of who sent every message.",
  },
  {
    icon: RefreshCw,
    title: "Resilient Sync",
    description:
      "Cursor-based incremental sync. Deduplication by UUID. No message lost, no message sent twice.",
  },
];

const USE_CASES = [
  {
    label: "01",
    title: "Restricted Regions",
    description:
      "Journalists and activists operating under network censorship. RelayNet routes around blocks, caches locally, delivers when possible.",
  },
  {
    label: "02",
    title: "Disaster Recovery",
    description:
      "Infrastructure down. Towers offline. RelayNet nodes form a mesh, store messages, forward when connectivity restores.",
  },
  {
    label: "03",
    title: "High-Interference Environments",
    description:
      "Concerts, protests, remote operations. Peer-to-peer QR sync exchanges messages directly between devices.",
  },
];

const ARCH = [
  {
    label: "Transport Layer",
    value: "Bluetooth & WiFi mesh (Phase 3) / WebRTC peer sync (live)",
  },
  {
    label: "Sync Layer",
    value: "Internet Computer Protocol — identity, encryption, persistence",
  },
  {
    label: "Protocol",
    value: "DTN envelope: UUID, TTL, hop count, E2EE, store-and-carry relay",
  },
];

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="landing-root min-h-screen">
      <RelayNav onGetStarted={onGetStarted} />
      <HeroSection onGetStarted={onGetStarted} />
      <UseCasesSection />
      <ArchSection />
      <FeaturesSection />
      <RelayFooter />
    </div>
  );
}

function RelayNav({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-[oklch(0.18_0.005_120)] bg-[oklch(0.07_0.005_120/0.97)] backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relay-logo-icon">
            <div className="relay-logo-grid" />
          </div>
          <span className="font-relay-mono text-sm tracking-[0.2em] text-[oklch(0.92_0.008_100)] uppercase">
            RelayNet
          </span>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onGetStarted}
          data-ocid="nav.primary_button"
          className="font-relay-mono text-xs tracking-[0.12em] uppercase px-4 py-2 border border-[oklch(0.35_0.06_85)] text-[oklch(0.72_0.12_85)] hover:bg-[oklch(0.72_0.12_85/0.08)] transition-colors duration-150"
        >
          Launch App
        </button>
      </div>
    </header>
  );
}

function HeroSection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="relative overflow-hidden bg-[oklch(0.08_0.005_120)] hero-grid-bg">
      <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20">
        {/* Top label */}
        <div className="mb-8 opacity-0 animate-fade-up">
          <span className="font-relay-mono text-xs tracking-[0.15em] text-[oklch(0.42_0.01_120)]">
            {"// FIELD-READY COMMUNICATION PROTOCOL"}
          </span>
        </div>

        {/* Giant headline */}
        <div className="mb-6 opacity-0 animate-fade-up-delay">
          <h1 className="font-relay-display leading-[0.95] tracking-tight">
            <span className="block text-[clamp(4rem,10vw,8rem)] font-extrabold text-[oklch(0.92_0.008_100)]">
              Unkillable
            </span>
            <span className="block text-[clamp(3rem,7.5vw,6rem)] font-light text-[oklch(0.72_0.12_85)]">
              Infrastructure.
            </span>
          </h1>
        </div>

        {/* Sub-tagline */}
        <p className="text-[oklch(0.55_0.01_120)] text-lg max-w-lg mb-8 leading-relaxed opacity-0 animate-fade-up-delay-2">
          From your device. On any network. Through any disruption.
        </p>

        {/* Terminal flags */}
        <div className="flex flex-wrap items-center gap-0 mb-10 opacity-0 animate-fade-up-delay-2">
          {["E2E Encrypted", "Offline-First", "Zero Trust Relay"].map(
            (flag, i) => (
              <span
                key={flag}
                className="font-relay-mono text-xs text-[oklch(0.48_0.01_120)]"
              >
                {i > 0 && (
                  <span className="mx-3 text-[oklch(0.25_0.005_120)]">|</span>
                )}
                [ {flag} ]
              </span>
            ),
          )}
        </div>

        {/* CTA row */}
        <div className="flex flex-col sm:flex-row items-start gap-4 mb-20 opacity-0 animate-fade-up-delay-2">
          <button
            type="button"
            onClick={onGetStarted}
            data-ocid="hero.primary_button"
            className="font-relay-mono text-sm tracking-[0.1em] uppercase px-8 py-3.5 bg-[oklch(0.72_0.12_85)] text-[oklch(0.1_0.005_120)] font-semibold hover:bg-[oklch(0.78_0.13_85)] transition-colors duration-150"
          >
            Launch App →
          </button>
          <span className="font-relay-mono text-xs text-[oklch(0.35_0.01_120)] self-center">
            &gt; Powered by Internet Computer Protocol
          </span>
        </div>

        {/* Terminal mockup */}
        <div className="max-w-lg opacity-0 animate-fade-up-delay-2">
          <TerminalBlock />
        </div>
      </div>
    </section>
  );
}

function TerminalBlock() {
  const lines = [
    { tag: "[RELAY]", content: "node_a7f3 :: online" },
    { tag: "[SYNC] ", content: "messages queued: 14" },
    { tag: "[MESH] ", content: "peers discovered: 3" },
    { tag: "[CHAIN]", content: "last checkpoint: 2s ago" },
    { tag: "[DTN]  ", content: "status: OPERATIONAL", highlight: true },
  ];

  return (
    <div className="border border-[oklch(0.18_0.005_120)] bg-[oklch(0.05_0.003_120)] p-5">
      {/* Terminal header bar */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[oklch(0.14_0.005_120)]">
        <div className="flex gap-1.5">
          {["dot-1", "dot-2", "dot-3"].map((dot) => (
            <div
              key={dot}
              className="w-2.5 h-2.5 rounded-full bg-[oklch(0.2_0.005_120)]"
            />
          ))}
        </div>
        <span className="font-relay-mono text-[10px] text-[oklch(0.32_0.01_120)] ml-auto">
          relay-status — node_a7f3
        </span>
      </div>

      {/* Lines */}
      <div className="space-y-2">
        {lines.map((line) => (
          <div key={line.tag} className="flex gap-3 font-relay-mono text-xs">
            <span className="text-[oklch(0.48_0.01_120)] shrink-0">
              {line.tag}
            </span>
            <span
              className={
                line.highlight
                  ? "text-[oklch(0.72_0.12_85)]"
                  : "text-[oklch(0.65_0.008_100)]"
              }
            >
              {line.content}
              {line.highlight && (
                <span className="inline-block w-2 h-3.5 bg-[oklch(0.72_0.12_85)] ml-1 align-middle animate-pulse" />
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UseCasesSection() {
  return (
    <section className="bg-[oklch(0.07_0.004_120)] py-24 px-6 border-t border-[oklch(0.14_0.005_120)]">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <span className="font-relay-mono text-xs tracking-[0.15em] text-[oklch(0.42_0.01_120)]">
            {"// OPERATIONAL USE CASES"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[oklch(0.14_0.005_120)]">
          {USE_CASES.map((uc) => (
            <div
              key={uc.label}
              className="bg-[oklch(0.07_0.004_120)] p-8 border-l-2 border-l-[oklch(0.72_0.12_85/0.4)] hover:border-l-[oklch(0.72_0.12_85)] transition-colors duration-200"
            >
              <div className="font-relay-mono text-xs text-[oklch(0.35_0.01_120)] mb-4">
                {uc.label}
              </div>
              <h3 className="font-relay-display font-bold text-xl text-[oklch(0.88_0.008_100)] mb-3">
                {uc.title}
              </h3>
              <p className="text-sm text-[oklch(0.52_0.01_120)] leading-relaxed">
                {uc.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ArchSection() {
  return (
    <section className="bg-[oklch(0.08_0.005_120)] py-24 px-6 border-t border-[oklch(0.14_0.005_120)]">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <span className="font-relay-mono text-xs tracking-[0.15em] text-[oklch(0.42_0.01_120)]">
            {"// ARCHITECTURE"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {ARCH.map((item) => (
            <div key={item.label} className="">
              <div className="font-relay-mono text-[10px] tracking-[0.15em] uppercase text-[oklch(0.72_0.12_85)] mb-3">
                {item.label}
              </div>
              <div className="h-px bg-[oklch(0.72_0.12_85/0.25)] mb-4" />
              <p className="text-sm text-[oklch(0.52_0.01_120)] leading-relaxed">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="bg-[oklch(0.07_0.004_120)] py-24 px-6 border-t border-[oklch(0.14_0.005_120)]">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <span className="font-relay-mono text-xs tracking-[0.15em] text-[oklch(0.42_0.01_120)]">
            {"// CAPABILITIES"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[oklch(0.14_0.005_120)]">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-[oklch(0.07_0.004_120)] p-6 group hover:bg-[oklch(0.09_0.005_120)] transition-colors duration-200"
            >
              <div className="mb-4">
                <feature.icon
                  className="w-5 h-5 text-[oklch(0.72_0.12_85/0.7)] group-hover:text-[oklch(0.72_0.12_85)] transition-colors duration-200"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="font-relay-mono text-xs tracking-[0.1em] uppercase text-[oklch(0.85_0.008_100)] mb-2">
                {feature.title}
              </h3>
              <p className="text-xs text-[oklch(0.48_0.01_120)] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RelayFooter() {
  return (
    <footer className="bg-[oklch(0.06_0.003_120)] border-t border-[oklch(0.14_0.005_120)] py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relay-logo-icon" />
          <span className="font-relay-mono text-sm tracking-[0.2em] text-[oklch(0.55_0.008_100)] uppercase">
            RelayNet
          </span>
        </div>

        {/* Center text */}
        <p className="font-relay-mono text-xs text-[oklch(0.38_0.01_120)] text-center">
          Built on the Internet Computer. Your keys. Your device. Your network.
        </p>

        {/* Attribution */}
        <p className="text-xs text-[oklch(0.32_0.008_120)]">
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[oklch(0.55_0.08_85)] hover:text-[oklch(0.72_0.12_85)] transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </footer>
  );
}
