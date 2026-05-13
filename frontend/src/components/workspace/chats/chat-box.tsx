import { FilesIcon, FolderTreeIcon, XIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GroupImperativeHandle } from "react-resizable-panels";

import { ConversationEmptyState } from "@/components/ai-elements/conversation";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tooltip } from "@/components/workspace/tooltip";
import { env } from "@/env";
import { cn } from "@/lib/utils";

import {
  ArtifactFileDetail,
  ArtifactFileList,
  FileTreePanel,
  useArtifacts,
} from "../artifacts";
import { useThread } from "../messages/context";

const CLOSE_MODE = { chat: 100, artifacts: 0 };
const OPEN_MODE = { chat: 60, artifacts: 40 };

const ChatBox: React.FC<{ children: React.ReactNode; threadId: string }> = ({
  children,
  threadId,
}) => {
  const { thread } = useThread();
  const pathname = usePathname();
  const threadIdRef = useRef(threadId);
  const layoutRef = useRef<GroupImperativeHandle>(null);

  const {
    artifacts,
    open: artifactsOpen,
    setOpen: setArtifactsOpen,
    setArtifacts,
    select: selectArtifact,
    deselect,
    selectedArtifact,
  } = useArtifacts();

  const [autoSelectFirstArtifact, setAutoSelectFirstArtifact] = useState(true);
  // File tree is hidden by default — user opens it on demand via the sidebar toggle
  const [fileTreeOpen, setFileTreeOpen] = useState(false);
  const [prevFileCount, setPrevFileCount] = useState(0);

  const files = thread.values.artifacts ?? [];
  const hasArtifacts = files.length > 0;

  // Auto-open file tree when new files appear during an active conversation
  useEffect(() => {
    if (files.length > prevFileCount && prevFileCount > 0) {
      setFileTreeOpen(true);
    }
    setPrevFileCount(files.length);
  }, [files.length, prevFileCount]);
  useEffect(() => {
    if (threadIdRef.current !== threadId) {
      threadIdRef.current = threadId;
      deselect();
    }

    // Update artifacts from the current thread
    setArtifacts(thread.values.artifacts);

    // DO NOT automatically deselect the artifact when switching threads, because the artifacts auto discovering is not work now.
    // if (
    //   selectedArtifact &&
    //   !thread.values.artifacts?.includes(selectedArtifact)
    // ) {
    //   deselect();
    // }

    if (
      env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true" &&
      autoSelectFirstArtifact
    ) {
      if (thread?.values?.artifacts?.length > 0) {
        setAutoSelectFirstArtifact(false);
        selectArtifact(thread.values.artifacts[0]!);
      }
    }
  }, [
    threadId,
    autoSelectFirstArtifact,
    deselect,
    selectArtifact,
    selectedArtifact,
    setArtifacts,
    thread.values.artifacts,
  ]);

  const artifactPanelOpen = useMemo(() => {
    if (env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true") {
      return artifactsOpen && artifacts?.length > 0;
    }
    return artifactsOpen;
  }, [artifactsOpen, artifacts]);

  const resizableIdBase = useMemo(() => {
    return pathname.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  }, [pathname]);

  useEffect(() => {
    if (layoutRef.current) {
      if (artifactPanelOpen) {
        layoutRef.current.setLayout(OPEN_MODE);
      } else {
        layoutRef.current.setLayout(CLOSE_MODE);
      }
    }
  }, [artifactPanelOpen]);

  return (
    <div className="flex h-full w-full">
      {/* File Tree Panel (left sidebar) — hidden by default, toggle on demand */}
      {hasArtifacts && fileTreeOpen && (
        <div className="flex h-full w-64 shrink-0 border-r">
          <div className="relative flex h-full w-full flex-col">
            <div className="flex shrink-0 items-center justify-between border-b px-3 py-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <FolderTreeIcon className="size-3.5" />
                Files
                <span className="text-muted-foreground/50">({files.length})</span>
              </span>
              <Tooltip content="Close file tree">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setFileTreeOpen(false)}
                >
                  <XIcon className="size-3.5" />
                </Button>
              </Tooltip>
            </div>
            <FileTreePanel
              files={files}
              selectedFile={selectedArtifact}
              onSelect={(filepath) => {
                selectArtifact(filepath);
                setArtifactsOpen(true);
              }}
              className="min-h-0 flex-1"
            />
          </div>
        </div>
      )}
      {/* File tree toggle tab (when tree is closed) */}
      {hasArtifacts && !fileTreeOpen && (
        <div
          className="flex h-full w-6 shrink-0 cursor-pointer items-center justify-center border-r bg-muted/20 text-muted-foreground/40 transition-colors hover:bg-accent/30 hover:text-muted-foreground"
          onClick={() => setFileTreeOpen(true)}
        >
          <Tooltip content="Open file tree">
            <FolderTreeIcon className="size-4" />
          </Tooltip>
        </div>
      )}
      <div className="flex min-w-0 flex-1">
        <ResizablePanelGroup
          id={`${resizableIdBase}-panels`}
          orientation="horizontal"
          defaultLayout={{ chat: 100, artifacts: 0 }}
          groupRef={layoutRef}
        >
          {/* Chat Panel */}
          <ResizablePanel className="relative" defaultSize={100} id="chat">
            {children}
          </ResizablePanel>
      <ResizableHandle
        id={`${resizableIdBase}-separator`}
        className={cn(
          "opacity-33 hover:opacity-100",
          !artifactPanelOpen && "pointer-events-none opacity-0",
        )}
      />
      <ResizablePanel
        className={cn(
          "transition-all duration-300 ease-in-out",
          !artifactsOpen && "opacity-0",
        )}
        id="artifacts"
      >
        <div
          className={cn(
            "h-full p-4 transition-transform duration-300 ease-in-out",
            artifactPanelOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
          {selectedArtifact ? (
            <ArtifactFileDetail
              className="size-full"
              filepath={selectedArtifact}
              threadId={threadId}
            />
          ) : (
            <div className="relative flex size-full justify-center">
              <div className="absolute top-1 right-1 z-30">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => {
                    setArtifactsOpen(false);
                  }}
                >
                  <XIcon />
                </Button>
              </div>
              {thread.values.artifacts?.length === 0 ? (
                <ConversationEmptyState
                  icon={<FilesIcon />}
                  title="No artifact selected"
                  description="Select an artifact to view its details"
                />
              ) : (
                <div className="flex size-full max-w-(--container-width-sm) flex-col justify-center p-4 pt-8">
                  <header className="shrink-0">
                    <h2 className="text-lg font-medium">Artifacts</h2>
                  </header>
                  <main className="min-h-0 grow">
                    <ArtifactFileList
                      className="max-w-(--container-width-sm) p-4 pt-12"
                      files={thread.values.artifacts ?? []}
                      threadId={threadId}
                    />
                  </main>
                </div>
              )}
            </div>
          )}
        </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      </div>
    </div>
  );
};

export { ChatBox };
