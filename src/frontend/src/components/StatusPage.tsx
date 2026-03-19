import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Loader2, Plus, Radio } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  useContactStatuses,
  useMyStatuses,
  useProfile,
  useStatusProfiles,
} from "../hooks/useQueries";
import type { ExternalBlob, StatusUpdate } from "../hooks/useQueries";
import { CreateStatusDialog } from "./CreateStatusDialog";
import { MyStatusItem } from "./MyStatusItem";
import { StatusRing } from "./StatusRing";
import { StatusViewer } from "./StatusViewer";
import { StoryUserItem } from "./StoryUserItem";

interface AuthorGroup {
  principal: string;
  statuses: StatusUpdate[];
  latestTime: bigint;
}

function groupByAuthor(statuses: StatusUpdate[]): AuthorGroup[] {
  const map = new Map<string, StatusUpdate[]>();
  for (const s of statuses) {
    const key = s.author.toString();
    const existing = map.get(key);
    if (existing) {
      existing.push(s);
    } else {
      map.set(key, [s]);
    }
  }
  return Array.from(map.entries())
    .map(([principal, statuses]) => ({
      principal,
      statuses,
      latestTime: statuses[0].postedAt,
    }))
    .sort((a, b) => Number(b.latestTime) - Number(a.latestTime));
}

export function StatusPage() {
  const { data: myStatuses = [], isLoading: isLoadingMine } = useMyStatuses();
  const { data: profile } = useProfile();
  const {
    data: contactStatuses = [],
    isLoading: isLoadingContacts,
    isError,
  } = useContactStatuses();
  const [showCreate, setShowCreate] = useState(false);
  const [viewerStatuses, setViewerStatuses] = useState<StatusUpdate[]>([]);
  const [viewerAuthorName, setViewerAuthorName] = useState<
    string | undefined
  >();
  const [viewerAuthorAvatar, setViewerAuthorAvatar] =
    useState<ExternalBlob | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isLoading = isLoadingMine || isLoadingContacts;

  const authorGroups = useMemo(
    () => groupByAuthor(contactStatuses),
    [contactStatuses],
  );

  const uniqueAuthorPrincipals = useMemo(
    () => authorGroups.map((g) => g.principal),
    [authorGroups],
  );

  const reactorPrincipals = useMemo(() => {
    const set = new Set<string>();
    for (const s of myStatuses) {
      for (const [p] of s.reactions) {
        set.add(p.toString());
      }
    }
    return Array.from(set);
  }, [myStatuses]);

  const authorProfileMap = useStatusProfiles(uniqueAuthorPrincipals);
  const reactorProfileMap = useStatusProfiles(reactorPrincipals);

  const handleViewUserStories = (group: AuthorGroup) => {
    const p = authorProfileMap.get(group.principal);
    setViewerStatuses(group.statuses);
    setViewerAuthorName(p?.name ?? `${group.principal.slice(0, 12)}...`);
    setViewerAuthorAvatar((p?.avatar ?? null) as ExternalBlob | null);
    setShowViewer(true);
  };

  const handleViewMyStories = () => {
    if (myStatuses.length === 0) return;
    setViewerStatuses(myStatuses);
    setViewerAuthorName(profile?.name ?? "My Status");
    setViewerAuthorAvatar((profile?.avatar ?? null) as ExternalBlob | null);
    setShowViewer(true);
  };

  const scrollStories = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = direction === "left" ? -200 : 200;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  const hasContactStories = authorGroups.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Status</h1>
          <Button
            size="sm"
            onClick={() => setShowCreate(true)}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Post
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {isError && (
          <div className="text-destructive text-center py-12 text-sm">
            Failed to load statuses.
          </div>
        )}

        {!isLoading && !isError && (
          <div className="space-y-5">
            {/* Stories row */}
            {(myStatuses.length > 0 || hasContactStories) && (
              <div className="relative">
                <div
                  ref={scrollRef}
                  className="flex gap-3 px-4 py-2 overflow-x-auto scrollbar-hide"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {/* My status ring */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    {myStatuses.length > 0 ? (
                      <div className="relative">
                        <StatusRing
                          name={profile?.name ?? "Me"}
                          avatarBlob={
                            (profile?.avatar ?? null) as ExternalBlob | null
                          }
                          hasUnviewed={false}
                          size="lg"
                          onClick={handleViewMyStories}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCreate(true)}
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full",
                            "bg-primary text-primary-foreground",
                            "flex items-center justify-center",
                            "border-2 border-background",
                            "hover:scale-110 transition-transform",
                          )}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowCreate(true)}
                        className={cn(
                          "w-16 h-16 rounded-full flex items-center justify-center shrink-0",
                          "border-2 border-dashed border-border",
                          "hover:border-primary hover:bg-primary/5 transition-all",
                        )}
                      >
                        <Plus className="w-6 h-6 text-muted-foreground" />
                      </button>
                    )}
                    <span className="text-[11px] text-muted-foreground w-16 text-center truncate">
                      {myStatuses.length > 0 ? "My status" : "Add"}
                    </span>
                  </div>

                  {/* Contact story rings */}
                  {authorGroups.map((group) => {
                    const p = authorProfileMap.get(group.principal);
                    const name = p?.name ?? `${group.principal.slice(0, 6)}...`;
                    return (
                      <div
                        key={group.principal}
                        className="flex flex-col items-center gap-1.5 shrink-0"
                      >
                        <StatusRing
                          name={name}
                          avatarBlob={
                            (p?.avatar ?? null) as ExternalBlob | null
                          }
                          hasUnviewed
                          size="lg"
                          onClick={() => handleViewUserStories(group)}
                        />
                        <span className="text-[11px] text-muted-foreground w-16 text-center truncate">
                          {name}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Scroll hints for many stories */}
                {authorGroups.length > 4 && (
                  <>
                    <button
                      type="button"
                      onClick={() => scrollStories("left")}
                      className={cn(
                        "absolute left-0 top-1/2 -translate-y-1/2 z-10",
                        "w-7 h-7 rounded-full bg-background/90 border shadow-sm",
                        "flex items-center justify-center",
                        "hover:bg-background transition-colors",
                      )}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollStories("right")}
                      className={cn(
                        "absolute right-0 top-1/2 -translate-y-1/2 z-10",
                        "w-7 h-7 rounded-full bg-background/90 border shadow-sm",
                        "flex items-center justify-center",
                        "hover:bg-background transition-colors",
                      )}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            )}

            {/* My statuses detail list */}
            {myStatuses.length > 0 && (
              <div className="px-4">
                <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wider">
                  My Status
                </h2>
                <div className="space-y-1">
                  {myStatuses.map((status) => (
                    <MyStatusItem
                      key={Number(status.id)}
                      status={status}
                      reactorProfiles={reactorProfileMap}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Contact stories detail list */}
            {hasContactStories && (
              <div className="px-4">
                <h2 className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wider">
                  Recent Updates
                </h2>
                <div className="space-y-1">
                  {authorGroups.map((group) => (
                    <StoryUserItem
                      key={group.principal}
                      authorPrincipal={group.principal}
                      profile={authorProfileMap.get(group.principal)}
                      statuses={group.statuses}
                      onClick={() => handleViewUserStories(group)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!hasContactStories && myStatuses.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Radio className="w-8 h-8 text-primary/50" />
                </div>
                <p className="text-base font-medium text-foreground mb-1">
                  No status updates
                </p>
                <p className="text-sm text-muted-foreground">
                  Post a status or check back when your contacts share updates
                </p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <CreateStatusDialog open={showCreate} onOpenChange={setShowCreate} />
      <StatusViewer
        open={showViewer}
        onOpenChange={setShowViewer}
        statuses={viewerStatuses}
        authorName={viewerAuthorName}
        authorAvatar={viewerAuthorAvatar}
      />
    </div>
  );
}
