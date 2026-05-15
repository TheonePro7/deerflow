"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BrainCircuitIcon, PlusIcon, Trash2Icon, PencilIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface LangMemItem {
  id: string;
  content: string;
  type: string;
  updated_at: string;
}

const API_BASE = "/api";

const TYPE_STYLES: Record<string, string> = {
  "用户偏好": "bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-200 border-pink-200 dark:border-pink-800",
  "工作领域": "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200 border-blue-200 dark:border-blue-800",
  "技术决策": "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200 border-green-200 dark:border-green-800",
  "项目需求": "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-200 border-orange-200 dark:border-orange-800",
  "项目目标": "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-200 border-purple-200 dark:border-purple-800",
};

export default function MemoryManagerPage() {
  const [memories, setMemories] = useState<LangMemItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<LangMemItem | null>(null);
  const [formContent, setFormContent] = useState("");
  const [formType, setFormType] = useState("general");

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/langmem`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchMemories(); }, []);

  const openCreate = () => {
    setEditItem(null); setFormContent(""); setFormType("general"); setDialogOpen(true);
  };

  const openEdit = (item: LangMemItem) => {
    setEditItem(item); setFormContent(item.content); setFormType(item.type); setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formContent.trim()) return;
    const url = editItem ? `${API_BASE}/langmem/${editItem.id}` : `${API_BASE}/langmem`;
    await fetch(url, {
      method: editItem ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content: formContent, type: formType }),
    });
    setDialogOpen(false);
    fetchMemories();
  };

  const handleDelete = async (id: string) => {
    await fetch(`${API_BASE}/langmem/${id}`, { method: "DELETE", credentials: "include" });
    fetchMemories();
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-6 py-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2.5">
          <BrainCircuitIcon className="size-5 text-muted-foreground" />
          <span className="text-sm font-medium">长期记忆</span>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={openCreate}>
          <PlusIcon className="size-3.5" />
          添加记忆
        </Button>
      </div>
      <div className="text-muted-foreground mb-4 text-xs leading-relaxed">
        AI 在对话中自动学习的记忆会显示在这里。你也可以手动添加、编辑或删除记忆。
        这些记忆会在新对话中自动注入，帮助 AI 更好地为你服务。
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-muted-foreground text-xs">加载中...</div>
        </div>
      ) : memories.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <BrainCircuitIcon className="size-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground/70">暂无长期记忆</p>
          <p className="text-xs text-muted-foreground/50">AI 会在对话结束后自动提取记忆，你也可以手动添加</p>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mx-1">
          <div className="space-y-1.5 px-1 pb-4">
            {memories.map((mem) => (
              <div
                key={mem.id}
                className="group flex items-start gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:border-border hover:bg-accent/30"
              >
                <span
                  className={cn(
                    "mt-0.5 shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium",
                    TYPE_STYLES[mem.type] ?? "bg-muted text-muted-foreground border-border",
                  )}
                >
                  {mem.type}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] leading-relaxed">{mem.content}</div>
                  {mem.updated_at && (
                    <div className="text-muted-foreground/50 mt-0.5 text-[11px]">
                      {mem.updated_at.slice(0, 10)}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
                    onClick={() => openEdit(mem)}
                    title="编辑"
                  >
                    <PencilIcon className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-red-500 rounded p-1 transition-colors"
                    onClick={() => handleDelete(mem.id)}
                    title="删除"
                  >
                    <Trash2Icon className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{editItem ? "编辑记忆" : "添加记忆"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">类型</label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["用户偏好", "工作领域", "技术决策", "项目需求", "项目目标", "general"].map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">内容</label>
              <Textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="例如：用户偏好使用中文交流..."
                className="min-h-[80px] resize-none text-xs"
              />
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
