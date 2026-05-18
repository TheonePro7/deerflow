---
title: 共享知识库与批量文件导入 PRD
date: 2026-05-18
status: draft
author: developer
---

# 共享知识库与批量文件导入 PRD

## 1. 概述

### 1.1 背景

当前 DeerFlow 的文件系统存在两个限制：
1. 每个对话的文件是隔离的，不同对话之间无法共享文件
2. 没有批量导入能力，大量文件只能逐个上传

用户需要让所有 Agent 能访问公司共享文件（文案、设计稿、产品资料等），用于网站构建、文案梳理等任务。

### 1.2 目标

- 建立一个所有智能体共享的知识库目录
- 支持批量文件导入（本地部署直接挂载目录，云端部署通过文件夹上传）
- 文件目录树同时展示共享文件和对话文件
- Agent 能读写共享目录中的文件

---

## 2. 架构设计

### 2.1 核心原则

**公司知识库默认不加载，用户按需启用。** 每个对话独立控制是否加载共享目录。

```
新对话开始
    │
    ├── 默认：知识库不加载 → 速度快，Agent 看不到共享文件
    │
    └── 用户点击「📁 知识库」按钮
            │
            ├── 共享目录挂载到 sandbox
            ├── 文件树显示共享目录
            ├── Agent 可读写 /mnt/shared/
            └── 再次点击 → 卸载（Agent 不再可见）
```

### 2.2 交互流程

```
顶部栏按钮区域：
[🤖 agent]  对话标题  [📁 知识库] [📁 文件树] [📤] [📎]
                      ↑ 点击加载/卸载公司知识库

按钮状态：
  ● 默认：显示「📁 知识库」灰色图标
  ● 点击后：变为「📁 知识库 ✕」蓝色高亮，表示已加载
  ● 再次点击 ✕：卸载，恢复灰色
```

### 2.3 目录结构

```
服务器文件系统：
/data/company-files/           ← 共享知识库根目录
├── 文案/                       ← 用户自行组织
├── 设计稿/
├── 产品资料/
└── 输出/                       ← Agent 写回的结果

.deer-flow/users/{user_id}/threads/{thread_id}/user-data/
├── outputs/                    ← 当前对话产出（仅当前对话可见）
├── uploads/                    ← 当前对话上传
└── workspace/                  ← 工作区临时文件
```

### 2.2 架构示意

```
┌──────────────────────────────────────────┐
│          文件目录树（前端 UI）             │
│                                          │
│  📁 公司知识库           ← 共享（所有对话）│
│    ├── 文案/                             │
│    ├── 设计稿/                           │
│    └── 产品资料/                         │
│  ─── ─── ─── ─── ─── ───               │
│  📁 outputs/              ← 当前对话     │
│  📁 uploads/                             │
└──────────────────────────────────────────┘
         ▲                        ▲
         │                        │
         │                        │
┌────────┴────────┐     ┌─────────┴─────────┐
│ /data/company-  │     │ thread user-data/  │
│ files/          │     │                   │
│ (共享目录)       │     │ (对话隔离)         │
└─────────────────┘     └───────────────────┘
```

### 2.3 部署场景

| 场景 | 实现方式 |
|------|---------|
| **本地部署（当前）** | 文件已在服务器上，配置共享目录路径即可 |
| **云端部署** | 需要批量上传 UI（文件夹选择器 + 进度条） |

---

## 3. 配置设计

### 3.1 config.yaml 新增

```yaml
# 共享知识库配置
knowledge_base:
  enabled: true
  # 共享目录路径（所有 Agent 可读写）
  path: /data/company-files
  # 在文件树中显示的标题
  display_name: 公司知识库
  # Agent 虚拟路径（sandbox 中看到的路径）
  virtual_path: /mnt/shared
```

### 3.2 Sandbox Mounts 配置

```yaml
sandbox:
  use: deerflow.sandbox.local:LocalSandboxProvider
  allow_host_bash: true
  mounts:
    - host_path: /data/company-files
      container_path: /mnt/shared
      read_only: false
```

---

## 4. API 设计

### 4.1 新增接口

#### 获取文件树（整合共享目录 + 对话目录）

```
GET /api/threads/{thread_id}/files/tree
```

**响应：**
```json
{
  "shared": {
    "name": "公司知识库",
    "path": "/mnt/shared",
    "files": [
      "/mnt/shared/文案/品牌介绍.md",
      "/mnt/shared/设计稿/logo.png"
    ]
  },
  "thread": {
    "files": [
      "/mnt/user-data/outputs/report.md"
    ]
  }
}
```

#### 获取共享目录文件列表

```
GET /api/files/shared?path={subpath}
```

**响应：**
```json
{
  "files": ["/mnt/shared/文案/品牌介绍.md"],
  "directories": ["文案", "设计稿"]
}
```

### 4.2 读文件（复用现有接口）

共享目录的文件通过现有 artifact 接口读取：

```
GET /api/threads/{thread_id}/artifacts/mnt/shared/{path}
```

---

## 5. 前端改动

### 5.1 组件改动

| 文件 | 改动 |
|------|------|
| `file-tree-panel.tsx` | 增加分区渲染：共享目录 + 对话文件 |
| `chat-box.tsx` | 传递共享目录文件列表 |
| `api.ts` | 新增 `fetchSharedFiles()` 接口 |

### 5.2 UI 设计

```
┌─────────────────────┐
│ 📁 公司知识库        │  ← 分区标题（不同背景色）
│   ├── 文案/         │
│   │   └── 品牌介绍.md│
│   └── 设计稿/       │
│  ─── 分隔线 ───     │  ← 视觉分隔
│ 📁 outputs/          │  ← 正常显示
│   └── report.md     │
└─────────────────────┘
```

### 5.3 操作方式

| 操作 | 本地部署 | 云端部署 |
|------|---------|---------|
| 导入文件 | `scp` 到 `/data/company-files/` | 拖拽上传（新增功能） |
| 加载知识库 | 点击顶部「📁 知识库」按钮 | 同左 |
| 卸载知识库 | 再次点击按钮 | 同左 |
| Agent 读写 | 加载后通过 `/mnt/shared/` 路径 | 同左 |

---

## 6. 实现步骤

### Step 1: 配置层
- `config.yaml` 新增 `knowledge_base` 配置节
- 配置解析代码

### Step 2: 后端 API
- `GET /api/threads/{id}/files/tree` 返回共享文件 + 线程文件
- 共享文件读取通过 artifact 接口

### Step 3: 前端文件树
- `fetchSharedFiles()` API 封装
- `FileTreePanel` 增加分区渲染
- 隔线 + 不同背景色区分

### Step 4: Sandbox 集成
- mounts 配置使共享目录对 Agent 可见
- Agent 可通过 `/mnt/shared/` 路径读写

---

## 7. 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `backend/packages/harness/deerflow/config/app_config.py` | 修改 | 新增 knowledge_base 配置模型 |
| `backend/app/gateway/routers/artifacts.py` | 修改 | files/tree 返回共享目录数据 |
| `frontend/src/core/artifacts/api.ts` | 修改 | 新增 fetchSharedFiles |
| `frontend/src/components/workspace/artifacts/file-tree-panel.tsx` | 修改 | 分区渲染 |
| `frontend/src/components/workspace/chats/chat-box.tsx` | 修改 | 传递共享文件数据 |
| `config.yaml` | 修改 | 新增 knowledge_base + mounts |
| `docs/superpowers/plans/2026-05-18-shared-knowledge-base.md` | 新增 | 本文档 |

---

## 8. 风险与注意事项

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 共享目录文件过多 | 文件树加载慢 | 分页加载、虚拟滚动 |
| 权限问题 | Agent 无法读写 | 确保目录权限 755 |
| 路径冲突 | 共享和对话文件同名 | 视觉分隔 + 路径前缀区分 |
| 沙箱隔离 | 容器沙箱需要额外配置 mounts | 本地沙箱默认支持 |

---

## 9. 验收标准

- [x] 知识库默认不加载，对话开始速度快
- [x] 点击「📁 知识库」按钮后加载，文件树显示共享目录
- [x] 加载后 Agent 可以通过 `/mnt/shared/` 路径读写共享文件
- [x] 再次点击按钮可卸载知识库，Agent 不再可见
- [x] 共享目录和对话文件有清晰的视觉区分
- [x] 加载/卸载不影响对话本身的文件（outputs/uploads）
- [x] 配置项完整，支持自定义目录路径和显示名称
