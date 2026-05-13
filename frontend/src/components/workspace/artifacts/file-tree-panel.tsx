"use client";

import {
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  type FileTreeNode,
  buildFileTree,
  flattenTree,
  type FlatTreeNode,
} from "@/core/artifacts/file-tree";
import { getFileIcon } from "@/core/utils/files";
import { cn } from "@/lib/utils";

export interface FileTreePanelProps {
  files: string[];
  selectedFile: string | null;
  onSelect: (filepath: string) => void;
  className?: string;
}

export function FileTreePanel({
  files,
  selectedFile,
  onSelect,
  className,
}: FileTreePanelProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    () => new Set(),
  );

  const tree = useMemo(() => buildFileTree(files), [files]);
  const flatTree = useMemo(
    () => flattenTree(tree, expandedPaths),
    [tree, expandedPaths],
  );

  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleClick = useCallback(
    (node: FlatTreeNode) => {
      if (node.isDirectory) {
        toggleExpand(node.path);
      } else {
        onSelect(node.path);
      }
    },
    [toggleExpand, onSelect],
  );

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <ScrollArea className="min-h-0 flex-1">
        <div className="py-1">
          {flatTree.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <FileIcon className="size-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground/50">No files yet</p>
            </div>
          ) : (
            flatTree.map((node) => (
              <FileTreeRow
                key={node.path}
                node={node}
                isSelected={node.path === selectedFile}
                onSelect={handleClick}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface FileTreeRowProps {
  node: FlatTreeNode;
  isSelected: boolean;
  onSelect: (node: FlatTreeNode) => void;
}

const FileTreeRow = ({ node, isSelected, onSelect }: FileTreeRowProps) => {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-1 px-3 py-1 text-left text-xs transition-colors hover:bg-accent/50",
        isSelected && "bg-accent text-accent-foreground",
      )}
      style={{ paddingLeft: `${12 + node.depth * 16}px` }}
      onClick={() => onSelect(node)}
    >
      {node.isDirectory ? (
        <>
          <ChevronRightIcon
            className={cn(
              "size-3 shrink-0 transition-transform text-muted-foreground",
            )}
          />
          <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
        </>
      ) : (
        <>
          <span className="size-3 shrink-0" />
          {getFileIcon(node.path, "size-4 shrink-0")}
        </>
      )}
      <span className="min-w-0 truncate">{node.name}</span>
    </button>
  );
};
