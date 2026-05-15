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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/core/i18n/hooks";

interface LangMemItem {
  id: string;
  content: string;
  type: string;
  updated_at: string;
}

const API_BASE = "/api";

export default function MemoryManagerPage() {
  const { t } = useI18n();
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
    setEditItem(null);
    setFormContent("");
    setFormType("general");
    setDialogOpen(true);
  };

  const openEdit = (item: LangMemItem) => {
    setEditItem(item);
    setFormContent(item.content);
    setFormType(item.type);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formContent.trim()) return;
    const url = editItem
      ? `${API_BASE}/langmem/${editItem.id}`
      : `${API_BASE}/langmem`;
    const method = editItem ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content: formContent, type: formType }),
    });
    setDialogOpen(false);
    fetchMemories();
  };

  const handleDelete = async (id: string) => {
    await fetch(`${API_BASE}/langmem/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    fetchMemories();
  };

  const typeColors: Record<string, string> = {
    "用户偏好": "text-pink-600 bg-pink-100 dark:text-pink-300 dark:bg-pink-900/30",
    "工作领域": "text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30",
    "技术决策": "text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/30",
    "项目需求": "text-orange-600 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/30",
    "项目目标": "text-purple-600 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/30",
  };

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">记忆管理</h1>
          <p className="text-muted-foreground text-sm">
            查看和管理 AI 从对话中学习的长期记忆
          </p>
        </div>
        <Button onClick={openCreate}>+ 新建记忆</Button>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          加载中...
        </div>
      ) : memories.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
          <p className="text-lg">暂无长期记忆</p>
          <p className="text-sm">AI 会在对话中自动学习并生成记忆</p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {memories.map((mem) => (
              <div
                key={mem.id}
                className="border-border hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-3 transition-colors"
              >
                <span
                  className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    typeColors[mem.type] ?? "text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-800"
                  }`}
                >
                  {mem.type}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed">{mem.content}</p>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    {mem.updated_at?.slice(0, 10) ?? ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => openEdit(mem)}
                  >
                    编辑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(mem.id)}
                  >
                    删除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "编辑记忆" : "新建记忆"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">类型</label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="用户偏好">用户偏好</SelectItem>
                  <SelectItem value="工作领域">工作领域</SelectItem>
                  <SelectItem value="技术决策">技术决策</SelectItem>
                  <SelectItem value="项目需求">项目需求</SelectItem>
                  <SelectItem value="项目目标">项目目标</SelectItem>
                  <SelectItem value="general">通用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">内容</label>
              <Textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="输入记忆内容..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
