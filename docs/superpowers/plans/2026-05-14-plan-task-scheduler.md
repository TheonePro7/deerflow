---
title: 自动化计划任务管理系统
date: 2026-05-14
status: approved
author: developer
---

# 自动化计划任务管理系统

## 概述

在 DeerFlow 中集成计划任务管理：Agent 可以根据对话指令创建定时任务，到时间自动执行。
用户通过侧边栏「计划」入口查看日历视图，管理所有任务。

## 架构

```
用户对话 "每周一早上9点生成周报"
  → Agent 调用 create_plan tool
  → 存入计划存储 (memory/JSON)
  → 计划显示在日历视图中
  → 到期时 Scheduler 触发执行
  → 执行结果通知用户
```

## 数据模型

```typescript
interface Plan {
  id: string;
  title: string;
  description: string;
  cron: string;           // cron 表达式 "0 9 * * 1"
  nextRunAt: string;      // ISO 下次执行时间
  lastRunAt?: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  agentName: string;      // 执行时使用的 agent
  prompt: string;          // 执行时发送的 prompt
  threadId?: string;
  createdAt: string;
}
```

## 实现步骤

### 步骤 1：后端存储层
- 基于 memory.json 的 plans 存储
- CRUD 操作

### 步骤 2：Agent Tools
- `create_plan(title, cron, prompt, agent)`
- `list_plans()`
- `update_plan(id, ...)`
- `delete_plan(id)`

### 步骤 3：调度器 Scheduler
- asyncio 后台任务，每分钟检查到期计划
- 到期时创建新 thread 并发送 prompt
- 记录执行历史

### 步骤 4：前端日历视图
- 侧边栏「计划」入口
- 月历/周历视图
- 任务卡片展示
- 点击查看详情

## 涉及文件

| 文件 | 说明 |
|------|------|
| backend/deerflow/plans/store.py | 计划存储 |
| backend/deerflow/plans/scheduler.py | 调度器 |
| backend/deerflow/community/*/tools.py | Agent tools |
| frontend/src/app/workspace/plans/ | 计划页面 |
| frontend/src/components/workspace/plans/ | 计划组件 |
| frontend/src/core/plans/ | 计划核心逻辑 |
