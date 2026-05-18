"use client";

import { BookOpenIcon, BookOpenCheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/workspace/tooltip";

export function KnowledgeBaseTrigger({
  kbOpen,
  onToggle,
}: {
  kbOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <Tooltip content={kbOpen ? "关闭公司知识库" : "加载公司知识库"}>
      <Button
        size="sm"
        variant={kbOpen ? "default" : "ghost"}
        onClick={onToggle}
        className={kbOpen ? "bg-primary text-primary-foreground" : ""}
      >
        {kbOpen ? (
          <BookOpenCheckIcon className="size-4" />
        ) : (
          <BookOpenIcon className="size-4" />
        )}
      </Button>
    </Tooltip>
  );
}
