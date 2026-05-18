import { FilesIcon, FolderTree, GripVerticalIcon, XIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const FILE_TREE_MIN_WIDTH = 200;
const FILE_TREE_MAX_WIDTH = 500;
const FILE_TREE_DEFAULT_WIDTH = 260;

const ChatBox: React.FC<{ children: React.ReactNode; threadId: string }> = ({
  children,
  threadId,
}) => {
  const { thread } = useThread();
  const pathname = usePathname();
  const threadIdRef = useRef(threadId);
  const layoutRef = useRef<GroupImperativeHandle>(null);
  const fileTreeRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef(false);

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
  const [sharedFiles, setSharedFiles] = useState<{ name: string; files: string[] } | null>(null);
  const [kbOpen, setKbOpen] = useState(false);
  const [fileTreeWidth, setFileTreeWidth] = useState(FILE_TREE_DEFAULT_WIDTH);

  // Fetch files from server on thread change only (not on every artifact update)
  useEffect(() => {
    setFiles(thread.values.artifacts ?? []);
    fetchThreadFiles(threadId).then((result) => {
      if (result.files.length > 0) {
        setFiles(result.files);
      }
      if (result.shared) {
        setSharedFiles(result.shared);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const { fileTreeOpen, setFileTreeOpen } = useArtifacts();

  // Auto-open file tree when new files appear (debounced)
  useEffect(() => {
    if (files.length > prevFileCount && prevFileCount > 0) {
      setFileTreeOpen(true);
    }
    setPrevFileCount(files.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.length]);
  useEffect(() => {
    if (threadIdRef.current !== threadId) {
      threadIdRef.current = threadId;
      deselect();
    }

    setArtifacts(thread.values.artifacts);

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

  // File tree drag-to-resize handler
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = true;
    const startX = e.clientX;
    const startWidth = fileTreeRef.current?.offsetWidth ?? FILE_TREE_DEFAULT_WIDTH;

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const newWidth = Math.max(FILE_TREE_MIN_WIDTH, Math.min(FILE_TREE_MAX_WIDTH, startWidth + (ev.clientX - startX)));
      setFileTreeWidth(newWidth);
    };

    const onUp = () => {
      dragRef.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  return (
    <div className="flex h-full w-full">
      {/* File Tree Panel (fixed sidebar, outside ResizablePanelGroup) */}
      {fileTreeOpen && (
        <div
          ref={fileTreeRef}
          className="flex h-full shrink-0 border-r"
          style={{ width: fileTreeWidth }}
        >
          <div className="relative flex h-full w-full flex-col">
            <div className="flex shrink-0 items-center justify-between border-b px-3 py-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <FolderTree className="size-3.5" />
                Files
                <span className="text-muted-foreground/50">({files.length})</span>
              </span>
              <div className="flex items-center gap-1">
                {sharedFiles && (
                  <Tooltip content={kbOpen ? "关闭知识库" : "加载知识库"}>
                    <Button
                      size="icon-sm"
                      variant={kbOpen ? "default" : "ghost"}
                      className={cn("size-6", kbOpen && "bg-primary text-primary-foreground")}
                      onClick={() => setKbOpen(!kbOpen)}
                    >
                      <span className="text-xs">{kbOpen ? "📖" : "📕"}</span>
                    </Button>
                  </Tooltip>
                )}
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
            </div>
            <FileTreePanel
              files={files}
              selectedFile={selectedArtifact}
              onSelect={(filepath) => {
                selectArtifact(filepath);
                setArtifactsOpen(true);
              }}
              threadId={threadId}
              className="min-h-0 flex-1"
              sharedFiles={sharedFiles}
              kbOpen={kbOpen}
            />
          </div>
          {/* Drag handle for resizing file tree width */}
          <div
            className="flex w-2 shrink-0 cursor-col-resize items-center justify-center bg-transparent transition-colors hover:bg-accent/50 active:bg-accent"
            onMouseDown={handleMouseDown}
          >
            <GripVerticalIcon className="size-3 text-muted-foreground/40" />
          </div>
        </div>
      )}
      {/* Original 2-panel ResizablePanelGroup (unchanged) */}
      <div className="flex min-w-0 flex-1">
        <ResizablePanelGroup
          id={`${resizableIdBase}-panels`}
          orientation="horizontal"
          defaultLayout={{ chat: 100, artifacts: 0 }}
          groupRef={layoutRef}
        >
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
      </div>
    </div>
  );
};

export { ChatBox };
