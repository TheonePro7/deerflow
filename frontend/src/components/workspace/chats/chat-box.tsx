import { FilesIcon, FolderTree, XIcon } from "lucide-react";
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
import { fetchThreadFiles } from "@/core/artifacts/api";
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
  const [prevFileCount, setPrevFileCount] = useState(0);
  const [files, setFiles] = useState<string[]>([]);

  // Fetch files from server on mount / thread change
  useEffect(() => {
    setFiles(thread.values.artifacts ?? []); // start with thread artifacts
    fetchThreadFiles(threadId).then((serverFiles) => {
      if (serverFiles.length > 0) {
        setFiles(serverFiles);
      }
    });
  }, [threadId, thread.values.artifacts]);

  // Use context for file tree state (shared with header trigger button)
  const { fileTreeOpen, setFileTreeOpen } = useArtifacts();

  // Auto-open file tree when new files appear during an active conversation
  useEffect(() => {
    if (files.length > prevFileCount && prevFileCount > 0) {
      setFileTreeOpen(true);
    }
    setPrevFileCount(files.length);
  }, [files.length, prevFileCount, setFileTreeOpen]);
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

  // Toggle panel sizes when open/close state changes
  useEffect(() => {
    if (!layoutRef.current) return;
    if (fileTreeOpen && artifactPanelOpen) {
      layoutRef.current.setLayout({ "file-tree": 20, chat: 50, artifacts: 30 });
    } else if (fileTreeOpen) {
      layoutRef.current.setLayout({ "file-tree": 20, chat: 80, artifacts: 0 });
    } else if (artifactPanelOpen) {
      layoutRef.current.setLayout({ "file-tree": 0, chat: 60, artifacts: 40 });
    } else {
      layoutRef.current.setLayout({ "file-tree": 0, chat: 100, artifacts: 0 });
    }
  }, [fileTreeOpen, artifactPanelOpen]);

  return (
    <ResizablePanelGroup
      id={`${resizableIdBase}-panels`}
      orientation="horizontal"
      defaultLayout={{ "file-tree": 0, chat: 100, artifacts: 0 }}
      groupRef={layoutRef}
      className="h-full w-full"
    >
      {/* File Tree Panel (left, collapsible) */}
      <ResizablePanel
        id="file-tree"
        defaultSize={20}
        minSize={15}
        maxSize={40}
        collapsible
        collapsedSize={0}
        className={cn(fileTreeOpen ? "border-r" : "")}
      >
        <div className="flex h-full w-full flex-col">
          <div className="flex shrink-0 items-center justify-between border-b px-3 py-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <FolderTree className="size-3.5" />
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
      </ResizablePanel>

      <ResizableHandle />

      {/* Chat Panel (center) */}
      <ResizablePanel id="chat">
        {children}
      </ResizablePanel>

      <ResizableHandle className={cn(!artifactPanelOpen && "opacity-0 pointer-events-none")} />

      {/* Artifacts Panel (right, collapsible) */}
      <ResizablePanel
        id="artifacts"
        defaultSize={0}
        minSize={20}
        maxSize={50}
        collapsible
        collapsedSize={0}
        className={cn(!artifactsOpen && "opacity-0")}
      >
        <div className="h-full p-4">
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
                  onClick={() => setArtifactsOpen(false)}
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
  );
};

export { ChatBox };
