"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { fetchThreadFiles } from "@/core/artifacts/api";
import { loadSkills } from "@/core/skills/api";
import type { Skill } from "@/core/skills/type";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MentionState {
  /** Popover trigger type: "@" for file mention, "/" for command */
  type: "@" | "/";
  /** The text the user typed after the trigger (used for filtering) */
  query: string;
  /** Cursor position where the trigger was detected */
  triggerPos: number;
}

interface MentionPopoverProps {
  value: string;
  threadId: string;
  onInsert: (text: string, replaceRange: { start: number; end: number }) => void;
  onCommand: (command: string, args: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COMMANDS = [
  {
    id: "skill",
    label: "/skill",
    description: "主动调用一个技能",
    icon: "📦",
  },
  {
    id: "help",
    label: "/help",
    description: "显示帮助信息",
    icon: "📖",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find the last @ or / trigger in the text.
 *
 * @ trigger: word boundary before @ (space, start-of-line, punctuation).
 *   We find the LAST @ at word boundary in the text.
 * / trigger: start of line. We find the last / at line start.
 */
function findLastTrigger(text: string): MentionState | null {
  // Find the last @ at word boundary
  let atMatch: RegExpMatchArray | null = null;
  let atPos = -1;
  const atRegex = /(?:^|\s|[,.;:!?])@([^\s]*)/g;
  let match: RegExpMatchArray | null;
  while ((match = atRegex.exec(text)) !== null) {
    const afterAt = match[1];
    if (match.index === undefined || afterAt === undefined) continue;
    atMatch = match;
    atPos = match.index + (match[0].length - afterAt.length - 1);
  }

  if (atMatch) {
    const query = atMatch[1] ?? "";
    // Don't trigger if the query is followed by a space (already typed)
    const endPos = atPos + 1 + query.length;
    if (endPos < text.length && text[endPos] === " ") {
      // The @ reference is complete, don't show popover
      return null;
    }
    return {
      type: "@",
      query,
      triggerPos: atPos,
    };
  }

  // Find the last / at line start
  const lines = text.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    const slashMatch = line.match(/^\/([^\s]*)$/);
    if (slashMatch) {
      const query = slashMatch[1] ?? "";
      // Calculate position in original text
      let lineStartPos = 0;
      for (let j = 0; j < i; j++) {
        lineStartPos += lines[j]!.length + 1;
      }
      return {
        type: "/",
        query,
        triggerPos: lineStartPos,
      };
    }
    // Only check the last (current) line
    if (i < lines.length - 1) break;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MentionPopover({
  value,
  threadId,
  onInsert,
  onCommand,
}: MentionPopoverProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<MentionState | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load files once
  useEffect(() => {
    if (!threadId) return;
    fetchThreadFiles(threadId).then(setFiles);
  }, [threadId]);

  // Load skills once
  useEffect(() => {
    loadSkills()
      .then((s) => setSkills(s ?? []))
      .catch(() => {});
  }, []);

  // Detect triggers whenever the value changes
  useEffect(() => {
    if (!value) {
      setOpen(false);
      setState(null);
      return;
    }

    const detected = findLastTrigger(value);
    if (detected) {
      if (detected.type === "/" && detected.query === "help") {
        // /help entered → show help panel, remove from input
        setHelpOpen(true);
        setOpen(false);
        setState(null);
        const lineEnd = detected.triggerPos + 6; // "/help"
        onInsert("", { start: detected.triggerPos, end: lineEnd });
        return;
      }
      setState(detected);
      setOpen(true);
      setSelectedSub(null);
    } else {
      setOpen(false);
      setState(null);
      setSelectedSub(null);
    }
  }, [value, onInsert]);

  // Focus the search input when popover opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, selectedSub]);

  // Filtered results
  const matchingFiles = useMemo(() => {
    if (!state || state.type !== "@") return [];
    const q = state.query.toLowerCase();
    return q
      ? files.filter((f) => f.toLowerCase().includes(q))
      : files;
  }, [state, files]);

  const matchingCommands = useMemo(() => {
    if (!state || state.type !== "/") return [];
    const q = state.query.toLowerCase();
    // If showing skill sub-selection, filter skills
    if (selectedSub === "skill") {
      return skills
        .filter((s) => s.name.toLowerCase().includes(q))
        .map((s) => ({
          id: `skill:${s.name}`,
          label: s.name,
          description: s.description,
          icon: "🧩",
        }));
    }
    return COMMANDS.filter(
      (c) => !q || c.id.includes(q) || c.label.includes(q),
    );
  }, [state, skills, selectedSub]);

  // Dismiss the popover without modifying the input text
  const dismiss = useCallback(() => {
    setOpen(false);
    setState(null);
    setSelectedSub(null);
  }, []);

  // Global ESC listener to dismiss the popover
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (selectedSub) {
          setSelectedSub(null); // go back one level
        } else {
          dismiss();            // close popover, trigger text stays
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, selectedSub, dismiss]);

  const handleSelect = useCallback(
    (itemId: string) => {
      if (!state) return;

      if (state.type === "@") {
        // Calculate the end position: @ + query length from trigger position
        const endPos = state.triggerPos + 1 + state.query.length;
        onInsert(itemId, {
          start: state.triggerPos,
          end: endPos,
        });
        setOpen(false);
        return;
      }

      // "/" command
      if (itemId === "skill") {
        setSelectedSub("skill");
        return;
      }
      if (itemId === "help") {
        setHelpOpen(true);
        setOpen(false);
        return;
      }
      if (itemId.startsWith("skill:")) {
        const skillName = itemId.slice(6);
        onCommand(skillName, "");
        setOpen(false);
        return;
      }
    },
    [state, onInsert, onCommand],
  );

  // /help panel
  if (helpOpen) {
    return (
      <div className="bg-background border-border mb-2 rounded-lg border p-4 text-sm shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-semibold">📖 DeerFlow 帮助</span>
          <button
            className="text-muted-foreground hover:text-foreground text-xs"
            onClick={() => setHelpOpen(false)}
          >
            关闭 ✕
          </button>
        </div>
        <div className="space-y-2">
          <div className="flex gap-2">
            <code className="text-primary shrink-0">@文件名</code>
            <span className="text-muted-foreground">
              引用工作区文件给 AI，输入 <code>@</code> 后自动弹出文件列表
            </span>
          </div>
          <div className="flex gap-2">
            <code className="text-primary shrink-0">/skill</code>
            <span className="text-muted-foreground">
              主动调用一个技能，输入后选择技能名称
            </span>
          </div>
          <div className="flex gap-2">
            <code className="text-primary shrink-0">/help</code>
            <span className="text-muted-foreground">
              显示本帮助信息
            </span>
          </div>
        </div>
        <div className="text-muted-foreground mt-3 border-t pt-2 text-xs">
          操作: ↑↓ 选择 · Enter 确认 · Esc 关闭
        </div>
      </div>
    );
  }

  // Don't render if no trigger detected
  if (!open || !state) return null;

  // For /command, show sub-selection when a command is chosen
  if (state.type === "/" && selectedSub === "skill") {
    return (
      <div className="mb-2">
        <Command shouldFilter={false} className="border-border rounded-lg border shadow-lg">
          <CommandInput
            ref={inputRef}
            placeholder="搜索技能..."
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>未找到匹配的技能</CommandEmpty>
            <CommandGroup heading="技能列表">
              {matchingCommands.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={() => handleSelect(item.id)}
                  className="flex items-start gap-3 py-3"
                >
                  <span className="mt-0.5 shrink-0 text-base">{item.icon}</span>
                  <div className="grid min-w-0 grid-cols-[130px_1fr] gap-x-4 gap-y-0.5 items-start">
                    <span className="truncate font-medium text-sm">{item.label}</span>
                    <span className="text-muted-foreground text-sm leading-snug">
                      {item.description}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    );
  }

  // Main popover: @ files or / commands
  return (
    <div className="mb-2">
      <Command shouldFilter={false} className="border-border rounded-lg border shadow-lg">
        <CommandInput
          ref={inputRef}
          placeholder={
            state.type === "@" ? "搜索文件..." : "输入命令..."
          }
          className="h-9"
        />
        <CommandList>
          <CommandEmpty>
            {state.type === "@"
              ? "未找到匹配的文件"
              : "未找到匹配的命令"}
          </CommandEmpty>
          <CommandGroup
            heading={state.type === "@" ? "工作区文件" : "命令"}
          >
            {(state.type === "@" ? matchingFiles : matchingCommands).map(
              (item) => {
                if (typeof item === "string") {
                  // File item
                  const fileName = item.split("/").pop() ?? item;
                  return (
                    <CommandItem
                      key={item}
                      value={item}
                      onSelect={() => handleSelect(item)}
                    >
                      <span className="text-muted-foreground mr-2 shrink-0">
                        {item.endsWith("/") ? "📁" : "📄"}
                      </span>
                      <span className="truncate font-medium">{fileName}</span>
                      <span className="text-muted-foreground ml-2 truncate text-xs">
                        {item}
                      </span>
                    </CommandItem>
                  );
                }
                // Command item
                return (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => handleSelect(item.id)}
                    className="flex items-start gap-3 py-3"
                  >
                    <span className="mt-0.5 shrink-0 text-base">{item.icon}</span>
                    <div className="grid min-w-0 grid-cols-[130px_1fr] gap-x-4 gap-y-0.5 items-start">
                      <span className="truncate font-medium text-sm">{item.label}</span>
                      <span className="text-muted-foreground text-sm leading-snug">
                        {item.description}
                      </span>
                    </div>
                  </CommandItem>
                );
              },
            )}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers to process message before sending
// ---------------------------------------------------------------------------

/**
 * Transform @file references in the text into full paths for the AI.
 * E.g. "看看 @outputs/report.md" → "看看 /mnt/user-data/outputs/report.md"
 */
export function expandFileReferences(text: string): string {
  return text.replace(/@(\S+)/g, (_match, path: string) => {
    // If it already looks like a full path, leave it
    if (path.startsWith("/")) return `@${path}`;
    return `/mnt/user-data/${path}`;
  });
}
