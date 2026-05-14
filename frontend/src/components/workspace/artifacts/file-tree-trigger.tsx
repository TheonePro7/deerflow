"use client";

import { FolderTree } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/workspace/tooltip";

import { useArtifacts } from "./context";

/**
 * File tree toggle button — placed in the chat page header.
 */
export function FileTreeTrigger() {
  const { fileTreeOpen, setFileTreeOpen } = useArtifacts();

  return (
    <Tooltip content={fileTreeOpen ? "Close file tree" : "Open file tree"}>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setFileTreeOpen(!fileTreeOpen)}
      >
        <FolderTree className="size-4" />
      </Button>
    </Tooltip>
  );
}
