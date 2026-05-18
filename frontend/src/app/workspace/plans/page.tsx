"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  WorkspaceBody,
  WorkspaceContainer,
  WorkspaceHeader,
} from "@/components/workspace/workspace-container";
import { fetchPlans, type Plan } from "@/core/plans/api";
import { cn } from "@/lib/utils";

/* ── data types ────────────────────────────────────────────── */

interface AutoTask {
  id: string;
  name: string;
  tag: string;            // e.g. "Claw", "Deep Research"
  schedule: string;       // e.g. "每天 09:00"
  period: string;         // e.g. "2026-05-15 ~ 2026-06-15"
  nextRun: string;        // relative text e.g. "22小时后开始"
  status: "pending" | "success" | "failed";
}

/* ── mock data (will be replaced with API) ─────────────────── */

const MOCK_TASKS: AutoTask[] = [
  {
    id: "1",
    name: "每日 AI 新闻推送",
    tag: "Claw",
    schedule: "每天 09:00",
    period: "2026-05-15 ~ 2026-06-15",
    nextRun: "22小时后开始",
    status: "pending",
  },
  {
    id: "2",
    name: "每周竞品分析报告",
    tag: "Deep Research",
    schedule: "每周一 10:00",
    period: "2026-05-01 ~ 2026-12-31",
    nextRun: "5天后",
    status: "pending",
  },
  {
    id: "3",
    name: "数据库健康检查",
    tag: "System",
    schedule: "每天 06:00",
    period: "长期",
    nextRun: "3小时后",
    status: "success",
  },
];

/* ── components ─────────────────────────────────────────────── */

function StatusDot({ status }: { status: AutoTask["status"] }) {
  return (
    <span
      className={cn(
        "inline-block size-2 rounded-full shrink-0",
        status === "pending" && "bg-zinc-500",
        status === "success" && "bg-green-500",
        status === "failed" && "bg-red-500",
      )}
    />
  );
}

function TaskItem({ task }: { task: AutoTask }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 px-5 py-4 transition-colors hover:bg-zinc-900">
      <StatusDot status={task.status} />
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <span className="text-sm font-medium text-zinc-100">{task.name}</span>
        <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{task.tag}</span>
      </div>
      <div className="hidden items-center gap-6 text-xs text-zinc-500 md:flex">
        <span>{task.schedule}</span>
        <span>{task.period}</span>
      </div>
      <span className="shrink-0 text-xs text-zinc-500">{task.nextRun}</span>
    </div>
  );
}

function TaskSection({
  title,
  tasks,
}: {
  title: string;
  tasks: AutoTask[];
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-zinc-400">{title}</h2>
      <div className="flex flex-col gap-2">
        {tasks.map((t) => (
          <TaskItem key={t.id} task={t} />
        ))}
        {tasks.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-600">
            暂无{title}
          </p>
        )}
      </div>
    </section>
  );
}

/* ── page ───────────────────────────────────────────────────── */

export default function AutomationPage() {
  // TODO: replace with real API
  const scheduled = useMemo(() => MOCK_TASKS.filter((t) => t.status === "pending"), []);
  const completed = useMemo(() => MOCK_TASKS.filter((t) => t.status === "success"), []);

  return (
    <WorkspaceContainer>
      <WorkspaceHeader />
      <WorkspaceBody>
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-8 py-8">
          {/* header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">自动化</h1>
              <p className="mt-1 text-sm text-zinc-500">
                管理自动化任务并查看近期运行记录。
              </p>
            </div>
            <div className="flex gap-3">
              <Button className="rounded-lg bg-zinc-800 text-zinc-100 hover:bg-zinc-700">
                + 添加
              </Button>
              <Button
                variant="outline"
                className="rounded-lg border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                从模版添加
              </Button>
            </div>
          </div>

          {/* task lists */}
          <div className="flex flex-col gap-10">
            <TaskSection title="已安排" tasks={scheduled} />
            <TaskSection title="已完成" tasks={completed} />
          </div>
        </div>
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}
