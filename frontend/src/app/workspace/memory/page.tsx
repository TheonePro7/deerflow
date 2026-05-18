"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { BrainCircuitIcon, PlusIcon, Trash2Icon, PencilIcon, RefreshCwIcon, SearchIcon, SparklesIcon, HeartIcon, BriefcaseIcon, CogIcon, ClipboardListIcon, TargetIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface LangMemItem { id: string; content: string; type: string; updated_at: string; }
const API_BASE = "/api";

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string }> = {
  "用户偏好": { icon: <HeartIcon className="size-3" />, label: "用户偏好" },
  "工作领域": { icon: <BriefcaseIcon className="size-3" />, label: "工作领域" },
  "技术决策": { icon: <CogIcon className="size-3" />, label: "技术决策" },
  "项目需求": { icon: <ClipboardListIcon className="size-3" />, label: "项目需求" },
  "项目目标": { icon: <TargetIcon className="size-3" />, label: "项目目标" },
};
const ALL_TYPES = ["全部", "用户偏好", "工作领域", "技术决策", "项目需求", "项目目标"];

export default function MemoryManagerPage() {
  const [memories, setMemories] = useState<LangMemItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<LangMemItem | null>(null);
  const [formContent, setFormContent] = useState("");
  const [formType, setFormType] = useState("general");
  const [filterType, setFilterType] = useState("全部");
  const [searchQuery, setSearchQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 50;

  const fetchMemories = async (reset = true) => {
    setLoading(true);
    try {
      const currentOffset = reset ? 0 : offset;
      const r = await fetch(`${API_BASE}/langmem?offset=${currentOffset}&limit=${PAGE_SIZE}`, { credentials: "include" });
      if (r.ok) {
        const d = await r.json();
        const items = d.memories ?? [];
        if (reset) {
          setMemories(items);
          setOffset(items.length);
        } else {
          setMemories(prev => [...prev, ...items]);
          setOffset(currentOffset + items.length);
        }
        setHasMore(items.length === PAGE_SIZE);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { fetchMemories(true); }, []);

  const filteredMemories = useMemo(() => memories.filter(m => {
    if (filterType !== "全部" && m.type !== filterType) return false;
    if (searchQuery) { const q = searchQuery.toLowerCase(); if (!m.content.toLowerCase().includes(q)) return false; }
    return true;
  }), [memories, filterType, searchQuery]);

  const typeCount = useMemo(() => { const c: Record<string, number> = {}; memories.forEach(m => { c[m.type] = (c[m.type] || 0) + 1; }); return c; }, [memories]);

  const openCreate = () => { setEditItem(null); setFormContent(""); setFormType("general"); setDialogOpen(true); };
  const openEdit = (item: LangMemItem) => { setEditItem(item); setFormContent(item.content); setFormType(item.type); setDialogOpen(true); };
  const handleSave = async () => {
    if (!formContent.trim()) return;
    const url = editItem ? `${API_BASE}/langmem/${editItem.id}` : `${API_BASE}/langmem`;
    await fetch(url, { method: editItem ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ content: formContent, type: formType }) });
    setDialogOpen(false); fetchMemories();
  };
  const handleDelete = async (id: string) => { await fetch(`${API_BASE}/langmem/${id}`, { method: "DELETE", credentials: "include" }); fetchMemories(); };

  return (
    <div className="flex size-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">长期记忆</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">AI 在对话中自动学习并注入上下文</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchMemories(true)} className="text-muted-foreground/40 hover:text-foreground p-1.5 rounded transition-colors">
            <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
          </button>
          <Button onClick={openCreate}>
            <PlusIcon className="mr-1.5 h-4 w-4" /> 添加记忆
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50" />
            <Input placeholder="搜索记忆内容..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-8 pl-8 text-xs" />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {ALL_TYPES.map(t => (
              <button key={t} onClick={() => setFilterType(t)} className={cn(
                "text-xs px-2.5 py-1 rounded font-medium transition-all",
                filterType === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              )}>
                {t}{t !== "全部" && typeCount[t] ? ` (${typeCount[t]})` : ""}
              </button>
            ))}
          </div>
          {!loading && <span className="text-muted-foreground/40 text-xs shrink-0">{filteredMemories.length}/{memories.length} 条</span>}
        </div>

        {loading ? (
          <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">加载中...</div>
        ) : filteredMemories.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-full">
              <SparklesIcon className="text-muted-foreground h-7 w-7" />
            </div>
            <p className="font-medium text-muted-foreground">{searchQuery || filterType !== "全部" ? "没有匹配的记忆" : "暂无长期记忆"}</p>
            <p className="text-muted-foreground mt-1 text-sm">{searchQuery || filterType !== "全部" ? "试试其他关键词" : "AI 会在对话结束后自动提取记忆，你也可以手动添加"}</p>
            {!searchQuery && filterType === "全部" && (
              <Button variant="outline" className="mt-2" onClick={openCreate}><PlusIcon className="mr-1.5 h-4 w-4" />添加记忆</Button>
            )}
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 gap-2">
            {filteredMemories.map(mem => {
              const cfg = TYPE_CONFIG[mem.type];
              return (
                <div key={mem.id} className="group flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:border-border hover:bg-accent/30">
                  <Badge variant="outline" className={cn(
                    "mt-0.5 shrink-0 gap-1 py-1 px-2 text-[11px] font-medium",
                    mem.type === "用户偏好" && "border-pink-200 text-pink-600 bg-pink-50 dark:border-pink-800 dark:text-pink-300 dark:bg-pink-950/30",
                    mem.type === "工作领域" && "border-sky-200 text-sky-600 bg-sky-50 dark:border-sky-800 dark:text-sky-300 dark:bg-sky-950/30",
                    mem.type === "技术决策" && "border-emerald-200 text-emerald-600 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/30",
                    mem.type === "项目需求" && "border-amber-200 text-amber-600 bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:bg-amber-950/30",
                    mem.type === "项目目标" && "border-violet-200 text-violet-600 bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:bg-violet-950/30",
                    !TYPE_CONFIG[mem.type] && "bg-muted text-muted-foreground border-border"
                  )}>
                    {cfg?.icon}
                    {mem.type}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm leading-relaxed break-words">{mem.content}</div>
                    {mem.updated_at && (
                      <div className="text-muted-foreground/50 mt-0.5 text-xs">{new Date(mem.updated_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).replace(/\//g, "-")}</div>
                    )}
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                    <button type="button" className="text-muted-foreground/40 hover:text-foreground rounded p-1 transition-colors" onClick={() => openEdit(mem)} title="编辑">
                      <PencilIcon className="size-3.5" />
                    </button>
                    <button type="button" className="text-muted-foreground/40 hover:text-red-500 rounded p-1 transition-colors" onClick={() => handleDelete(mem.id)} title="删除">
                      <Trash2Icon className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {hasMore && !searchQuery && filterType === "全部" && (
            <div className="flex justify-center pt-3 pb-2">
              <button
                onClick={() => fetchMemories(false)}
                disabled={loading}
                className="text-xs text-muted-foreground/50 hover:text-foreground px-4 py-1.5 rounded-lg border transition-colors"
              >
                {loading ? "加载中..." : "加载更多"}
              </button>
            </div>
          )}
          </>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-base">{editItem ? "编辑记忆" : "添加记忆"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">类型</label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["用户偏好", "工作领域", "技术决策", "项目需求", "项目目标", "general"].map(t => (
                    <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">内容</label>
              <Textarea value={formContent} onChange={e => setFormContent(e.target.value)} placeholder="例如：用户偏好使用中文交流..." className="min-h-[80px] resize-none text-xs" />
            </div>
          </div>
          <DialogFooter className="gap-1.5">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="text-xs">取消</Button>
            <Button size="sm" onClick={handleSave} className="text-xs">保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
