"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FileTreePanel } from "@/components/workspace/artifacts/file-tree-panel";
import {
  WorkspaceContainer,
  WorkspaceHeader,
} from "@/components/workspace/workspace-container";
import { getFileName, checkCodeFile } from "@/core/utils/files";
import { FileIcon } from "lucide-react";
import { Streamdown } from "streamdown";
import { CodeEditor } from "@/components/workspace/code-editor";
import { ThreadContext } from "@/components/workspace/messages/context";
import { streamdownPlugins } from "@/core/streamdown";

// CSRF token helper (required for all state-changing API requests)
function csrf(): Record<string, string> {
  const m = document.cookie.match(/csrf_token=([^;]+)/);
  return m?.[1] ? { "X-CSRF-Token": m[1] } : {};
}

const API_BASE = "/api";

/* ── types ─────────────────────────────────────────── */

interface KbConfig { enabled: boolean; path: string; display_name: string; }
interface KbData { config: KbConfig; files: string[]; }

/* ── 主页面 ───────────────────────────────────────── */

export default function KnowledgeBasePage() {
  const [data, setData] = useState<KbData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/knowledge-base`, { credentials: "include" });
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const form = new FormData();
    for (const f of files) form.append("files", f);
    try {
      const res = await fetch(`${API_BASE}/knowledge-base/upload`, {
        method: "POST", credentials: "include", body: form, headers: {...csrf()},
      });
      if (res.ok) { toast.success("上传成功"); load(); }
      else { toast.error("上传失败"); }
    } catch { toast.error("上传失败"); }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [load]);

  const handleDelete = useCallback(async (evt: React.MouseEvent, path: string) => {
    evt.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/knowledge-base/files?path=${encodeURIComponent(path)}`, {
        method: "DELETE", credentials: "include", headers: {...csrf()},
      });
      if (res.ok) { toast.success("已删除"); if (selectedFile === path) setSelectedFile(null); load(); }
      else { toast.error("删除失败"); }
    } catch { toast.error("删除失败"); }
  }, [load, selectedFile]);

  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleFileSelect = useCallback((path: string) => {
    setSelectedFile(path);
    setPreviewLoading(true);
    setPreviewContent(null);
    fetch(`${API_BASE}/knowledge-base/files/content?path=${encodeURIComponent(path)}`, { credentials: "include" })
      .then((r) => r.ok ? r.text() : "(无法加载)")
      .then((c) => { setPreviewContent(c); setPreviewLoading(false); })
      .catch(() => { setPreviewContent("(加载失败)"); setPreviewLoading(false); });
  }, []);

  return (
    <WorkspaceContainer>
      <WorkspaceHeader />
      <main className="flex min-h-0 w-full flex-1 flex-col">
        <div className="flex h-full w-full flex-col">
          {/* 顶部栏 */}
          <div className="flex shrink-0 items-center justify-between border-b px-6 py-3">
            <div>
              <h1 className="text-lg font-bold">知识库</h1>
              <p className="text-xs text-muted-foreground">{data?.files.length ?? 0} 个文件</p>
            </div>
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />
              <Button size="sm" variant="outline" onClick={() => {
                const name = prompt("输入新文件夹名称：");
                if (name?.trim()) {
                  fetch(`${API_BASE}/knowledge-base/directory?path=${encodeURIComponent(name.trim())}`, {
                    method: "POST", credentials: "include", headers: {...csrf()},
                  }).then((r) => { if (r.ok) { toast.success("文件夹已创建"); load(); } else toast.error("创建失败"); })
                    .catch(() => toast.error("创建失败"));
                }
              }}>+ 新建文件夹</Button>
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>+ 上传</Button>
              <Button size="sm" variant="ghost" onClick={load}>刷新</Button>
            </div>
          </div>

          {/* 三栏布局 */}
          <div className="flex min-h-0 flex-1">
            {loading ? (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">加载中...</div>
            ) : data && data.files.length > 0 ? (
              <div className="flex h-full w-full flex-row" style={{ minHeight: 0 }}>
                {/* 左侧：文件树（复用 FileTreePanel） */}
                <div className="flex h-full w-1/2 min-w-[200px] flex-col border-r" id="kb-tree-panel">
                  <FileTreePanel
                    files={data.files}
                    selectedFile={selectedFile}
                    onSelect={handleFileSelect}
                    threadId=""
                    className="h-full"
                    selectableDirs
                    onMove={(filePath, targetDir) => {
                      const fileName = filePath.includes("/") ? filePath.split("/").pop()! : filePath;
                      const newPath = `${targetDir}/${fileName}`;
                      fetch(`${API_BASE}/knowledge-base/files?path=${encodeURIComponent(filePath)}&new_path=${encodeURIComponent(newPath)}`, {
                        method: "PUT", credentials: "include", headers: {...csrf()},
                      }).then((r) => { if (r.ok) { toast.success("已移动"); setSelectedFile(newPath); load(); } else toast.error("移动失败"); });
                    }}
                  />
                </div>

                {/* 拖拽把手 */}
                <div
                  className="flex w-1.5 shrink-0 cursor-col-resize items-center justify-center bg-transparent transition-colors hover:bg-accent/50"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const panel = document.getElementById("kb-tree-panel");
                    if (!panel) return;
                    const startX = e.clientX;
                    const startW = panel.offsetWidth;
                    const parentW = panel.parentElement?.offsetWidth ?? 1;
                    const onMove = (ev: MouseEvent) => {
                      const pct = ((startW + (ev.clientX - startX)) / parentW) * 100;
                      panel.style.width = `${Math.max(20, Math.min(80, pct))}%`;
                    };
                    const onUp = () => {
                      document.removeEventListener("mousemove", onMove);
                      document.removeEventListener("mouseup", onUp);
                      document.body.style.cursor = "";
                    };
                    document.body.style.cursor = "col-resize";
                    document.addEventListener("mousemove", onMove);
                    document.addEventListener("mouseup", onUp);
                  }}
                />

                {/* 右侧：预览 */}
              <div className="flex h-full flex-1 flex-col">
                {selectedFile ? (
                  <>
                    <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate text-sm font-medium">{getFileName(selectedFile)}</span>
                        <span className="hidden shrink-0 text-xs text-muted-foreground md:inline">{selectedFile}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          className="rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                          onClick={() => {
                            const newName = prompt("重命名：", getFileName(selectedFile));
                            const dir = selectedFile.includes("/") ? selectedFile.slice(0, selectedFile.lastIndexOf("/") + 1) : "";
                            if (newName?.trim() && newName !== getFileName(selectedFile)) {
                              fetch(`${API_BASE}/knowledge-base/files?path=${encodeURIComponent(selectedFile)}&new_path=${encodeURIComponent(dir + newName.trim())}`, {
                                method: "PUT", credentials: "include", headers: {...csrf()},
                              }).then((r) => { if (r.ok) { toast.success("已重命名"); setSelectedFile(dir + newName.trim()); load(); } else toast.error("重命名失败"); });
                            }
                          }}
                        >
                          重命名
                        </button>
                        <button
                          className="rounded px-1.5 py-0.5 text-xs text-red-400 hover:bg-red-950/50"
                          onClick={async () => {
                            if (!confirm(`确定删除 ${getFileName(selectedFile)}？`)) return;
                            const res = await fetch(`${API_BASE}/knowledge-base/files?path=${encodeURIComponent(selectedFile)}`, {
                              method: "DELETE", credentials: "include", headers: {...csrf()},
                            });
                            if (res.ok) { toast.success("已删除"); setSelectedFile(null); load(); }
                            else toast.error("删除失败");
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-auto">
                      {previewLoading ? (
                        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">加载中...</div>
                      ) : (
                        <KBPreviewContent
                          filepath={selectedFile}
                          content={previewContent ?? ""}
                          threadId=""
                        />
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <div className="text-center">
                      <FileIcon className="mx-auto size-12 text-muted-foreground/20" />
                      <p className="mt-4 text-sm text-muted-foreground">选择一个文件预览</p>
                    </div>
                  </div>
                )}
              </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
                <span className="text-4xl">📂</span>
                <p>暂无文件</p>
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>+ 上传文件</Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </WorkspaceContainer>
  );
}

/* ── KB 文件预览（复用对话页面的 CodeEditor + 图片/PDF 渲染） ── */

function KBPreviewContent({ filepath, content, threadId }: { filepath: string; content: string; threadId: string }) {
  const ext = filepath.split(".").pop()?.toLowerCase() ?? "";
  const isMd = ext === "md";
  const isCode = useMemo(() => checkCodeFile(filepath), [filepath]);
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext);
  const isPdf = ext === "pdf";

  if (isImage) {
    return (
      <div className="flex size-full items-center justify-center p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/knowledge-base/files/content?path=${encodeURIComponent(filepath)}`}
          alt={getFileName(filepath)}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    );
  }

  if (isPdf) {
    return (
      <iframe
        className="size-full"
        src={`/api/knowledge-base/files/content?path=${encodeURIComponent(filepath)}`}
      />
    );
  }

  if (isMd) {
    return (
      <div className="prose prose-invert max-w-none p-6">
        <Streamdown {...streamdownPlugins}>
          {content}
        </Streamdown>
      </div>
    );
  }

  if (isCode.isCodeFile) {
    const mockThread = { isLoading: false } as any;
    return (
      <ThreadContext.Provider value={{ thread: mockThread, isMock: false }}>
        <div className="size-full">
          <CodeEditor
            className="size-full resize-none rounded-none border-none"
            value={content}
            readonly
          />
        </div>
      </ThreadContext.Provider>
    );
  }

  return (
    <pre className="size-full overflow-auto p-4 font-mono text-sm text-foreground/80">
      {content}
    </pre>
  );
}
