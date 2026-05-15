# DeerFlow 功能增强与修改记录

> 维护者：ivanston@163.com
> 创建日期：2026-05-14
> 本文件记录所有对原始 DeerFlow 项目的自定义修改，用于后续打包分享或提交 PR。

---

## 目录

1. [文件树（File Tree）功能](#1-文件树file-tree功能)
2. [三栏可调整布局](#2-三栏可调整布局)
3. [预览面板增强](#3-预览面板增强)
4. [内置技能文档页面](#4-内置技能文档页面)
5. [飞书渠道集成](#5-飞书渠道集成)
6. [全量消息历史 API + 前端显示优化](#6-全量消息历史-api--前端显示优化)
7. [前端网络配置修复](#7-前端网络配置修复)
8. [对话摘要配置优化](#8-对话摘要配置优化)
9. [文件变更总览](#9-文件变更总览)
10. [部署说明](#10-部署说明)

---

## 1. 文件树（File Tree）功能

### 概述

为 DeerFlow  workspace 增加文件树侧边栏，用户可直接在对话界面浏览、打开工作区文件，无需切换到文件系统。

### 涉及文件

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `frontend/src/core/artifacts/file-tree.ts` | **新增** | 文件树工具函数：`buildFileTree`（路径→树结构）、`flattenTree`（树→平铺列表） |
| `frontend/src/components/workspace/artifacts/file-tree-panel.tsx` | **新增** | 文件树面板组件，支持目录展开/折叠、文件图标、空状态 |
| `frontend/src/components/workspace/artifacts/file-tree-trigger.tsx` | **新增** | 文件树开关按钮组件 |
| `frontend/src/components/workspace/artifacts/context.tsx` | 修改 | 新增 `fileTreeOpen` 状态，共享给全局 |
| `frontend/src/components/workspace/artifacts/index.ts` | 修改 | 导出新组件 |
| `frontend/src/components/workspace/chats/chat-box.tsx` | 修改 | 集成文件树面板到布局 |
| `frontend/src/app/workspace/chats/[thread_id]/page.tsx` | 修改 | 头部增加文件树切换按钮 |
| `frontend/src/app/workspace/agents/[agent_name]/chats/[thread_id]/page.tsx` | 修改 | 头部增加文件树切换按钮 |
| `frontend/src/core/artifacts/api.ts` | 修改 | 新增 `fetchThreadFiles()` 调用文件树 API |
| `frontend/src/core/artifacts/utils.ts` | 修改 | 路径处理工具 |
| `backend/app/gateway/routers/artifacts.py` | 修改 | 新增文件树 API 端点 |

### 后端 API

```
GET /api/threads/{thread_id}/files/tree
```

递归列出线程工作区 `/mnt/user-data/` 目录下的所有文件，返回相对路径。

### 前端组件

- **FileTreePanel**: 渲染可折叠的目录树，目录用 ChevronRight 图标展开/折叠，文件按扩展名显示对应图标
- **FileTreeTrigger**: 对话页面头部的一个文件夹图标按钮，点击切换文件树显示
- **文件树默认关闭**，用户按需打开；新文件出现时自动展开
- 文件路径相对于 `/mnt/user-data/`，前端自动拼接完整路径用于 API 调用

### 实现细节

```typescript
// buildFileTree - 将平铺路径列表转为嵌套树结构
// 例: ["outputs/a.txt", "outputs/b.txt", "workspace/c.txt"]
// → { outputs: { "a.txt": {}, "b.txt": {} }, workspace: { "c.txt": {} } }

// flattenTree - 将树结构转为可渲染的平铺列表，支持展开/折叠状态
```

### 提交历史

```
b47bb72d feat(artifacts): add file tree utility (buildFileTree + flattenTree)
bba18d89 feat(artifacts): add FileTreePanel component
bfa1113f feat(workspace): add file tree panel in three-column layout
8bdcca81 fix(workspace): file tree hidden by default with toggle tab
4a647f13 refactor: move file tree toggle to chat page header
79c7af3c fix: make file tree toggle tab always visible
b047b603 feat: fetch file tree from filesystem API instead of thread artifacts
7fb3cad1 refactor: simplify file tree paths, remove /mnt/user-data/ prefix
ee259fc2 fix: correct lucide-react icon name
```

---

## 2. 三栏可调整布局

### 概述

将 workspace 从原来的"对话 | 产物"两栏扩展为"文件树 | 对话 | 产物"三栏可拖拽调整布局。

### 涉及文件

| 文件 | 修改类型 |
|------|---------|
| `frontend/src/components/workspace/chats/chat-box.tsx` | 修改 |

### 特性

- 三栏都在同一个 `ResizablePanelGroup` 中，可拖拽调整宽度
- 左右两栏（文件树、产物）可折叠
- 折叠面板设为 3% 宽度（opacity-0 隐藏），解决 `setLayout` 不支持 0% 的问题
- 所有拖拽手柄始终可交互
- 后续重构为：文件树作为独立侧边栏在 `ResizablePanelGroup` 外部，恢复原始两栏布局的正常拖拽体验

### 提交历史

```
6a885505 refactor: three-column resizable layout for file tree
961e226c fix: panel layout crash - each panel must have >0% size
8dbcb7bf fix: enable all resize handles for proper 3-panel dragging
bb3683de refactor: file tree as independent sidebar, restore original 2-panel layout
```

---

## 3. 预览面板增强

### 概述

增强右侧产物预览面板的文件渲染能力，支持多种文件类型的内联预览。

### 涉及文件

| 文件 | 修改类型 |
|------|---------|
| `frontend/src/components/workspace/artifacts/artifact-file-detail.tsx` | 修改 |
| `backend/app/gateway/routers/artifacts.py` | 修改 |

### 支持的预览类型

| 文件类型 | 预览方式 |
|---------|---------|
| 图片 (jpg/png/gif/svg/webp) | 内联 `<img>` 渲染 |
| PDF | 浏览器原生 `<iframe>` 预览 |
| Office 文件 (pptx/docx/xlsx) | 显示下载提示 |

### 提交

```
eec9bc40 feat: improve preview panel for images, PDFs, and office files
```

---

## 4. 内置技能文档页面

### 概述

为 DeerFlow 的 21 个内置技能创建了中英文文档页面，方便用户查阅和理解各技能的用途和用法。

### 涉及文件

| 文件 | 修改类型 |
|------|---------|
| `docs/DEERFLOW_BUILTIN_SKILLS.md` | **新增** |
| `frontend/src/content/en/reference/builtin-skills/index.mdx` | **新增** |
| `frontend/src/content/en/reference/builtin-skills/_meta.ts` | **新增** |
| `frontend/src/content/zh/reference/builtin-skills/index.mdx` | **新增** |
| `frontend/src/content/zh/reference/builtin-skills/_meta.ts` | **新增** |
| `frontend/src/content/en/reference/_meta.ts` | 修改 |
| `frontend/src/content/zh/reference/_meta.ts` | 修改 |

### 分类

- Academic（学术）
- Data（数据）
- Business（商业）
- Dev（开发）
- Creative（创意）
- System（系统）

访问路径：`/docs/reference/builtin-skills`

### 提交

```
ac1f5254 docs: add built-in skills documentation page
```

---

## 5. 飞书渠道集成

### 概述

对接飞书（Feishu/Lark）IM 渠道，使 DeerFlow 能够通过飞书机器人接收和回复消息。

### 涉及文件

| 文件 | 修改类型 |
|------|---------|
| `backend/app/channels/feishu.py` | 修改 |
| `config.yaml` | 修改（本地配置） |

### 5.1 飞书渠道启用配置

```yaml
channels:
  feishu:
    enabled: true
    app_id: $FEISHU_APP_ID
    app_secret: $FEISHU_APP_SECRET
```

需要添加环境变量：
```
FEISHU_APP_ID=cli_a93b877f71fa5bc8
FEISHU_APP_SECRET=你的AppSecret
```

### 5.2 修复：每条消息创建新对话线程

**问题：** 用户发多条消息时，每条消息创建一个新 DeerFlow 线程（相当于"群聊"），对话不连续。

**原因：** `topic_id = root_id or msg_id`，每条消息的 `msg_id` 唯一。

**修复：**
```python
# 修改前
topic_id = root_id or msg_id

# 修改后
topic_id = root_id or None
```

同一飞书会话中的所有消息共享同一个 DeerFlow 线程。

### 5.3 新增：纯文本回复降级方案

新增 `_reply_text()` 方法，当飞书卡片因 IP 白名单等权限问题发送失败时，自动降级为纯文本回复。

```python
async def _reply_text(self, message_id: str, text: str) -> str | None:
    """Reply with a plain text message (NOT card/interactive, NOT in thread)."""
    import json
    content = json.dumps({"text": text})
    request = self._ReplyMessageRequest.builder()\
        .message_id(message_id)\
        .request_body(self._ReplyMessageRequestBody.builder()\
            .msg_type("text").content(content)\
            .reply_in_thread(False).build()).build()
    ...
```

### 5.4 修复：回复为引用式消息

**问题：** 机器人回复嵌套在用户消息下方，不是独立消息。

**原因：** `reply_in_thread(True)` 导致回复作为线程回复。

**修复：** 所有 `reply_in_thread(True)` → `reply_in_thread(False)`。

### 5.5 修复：重复回复问题

**问题：** 每次对话输出两条相同消息。

**原因：** 流式更新阶段发卡片失败后降级发文本，然后最终阶段再发一次文本。

**修复：** `_send_card_message()` 方法重构，非最终更新不发文本，仅在最终阶段发一次。

```python
if running_card_id and not msg.is_final:
    await self._update_card(running_card_id, msg.text)  # 仅更新卡片
elif msg.is_final:
    await self._reply_text(source_message_id, msg.text)  # 仅发一次
    await self._add_reaction(source_message_id, "DONE")
```

### 5.6 增强：卡片回复失败自动降级

`_reply_card()` 新增 `fallback_to_text` 参数，控制卡片失败时是否降级为文本。
- `fallback_to_text=True`（默认）：卡片失败时自动发纯文本
- `fallback_to_text=False`：静默跳过（用于流式更新，防止重复消息）

---

## 6. 全量消息历史 API + 前端显示优化

### 概述

**核心创新：** 用户界面显示全量对话历史，但 LLM 仍然只收到摘要压缩后的上下文——**不增加 token 消耗**。

### 涉及文件

| 文件 | 修改类型 |
|------|---------|
| `backend/app/gateway/routers/threads.py` | 修改 |
| `frontend/src/core/threads/hooks.ts` | 修改 |

### 架构

```
┌──────────────────────────────────────────────────────┐
│                  前端界面                               │
│  显示全部历史                                         │
│  ← GET /api/threads/{id}/all-messages（只读，不消耗） │
│  ← stream 推送（新消息）                               │
└────────────────────┬─────────────────────────────────┘
                     │ 两条独立路径
┌────────────────────▼─────────────────────────────────┐
│  后端处理                                              │
│  给 LLM → summarization 中间件继续压缩（token 不变）    │
│  数据库 → checkpoints 完整保留每步消息                  │
└──────────────────────────────────────────────────────┘
```

### 后端新增端点

```
GET /api/threads/{thread_id}/all-messages
```

需要认证。遍历所有 checkpoints，提取所有唯一消息（按 `id` 去重），跳过 `name="summary"` 的摘要消息，按时间正序返回。

**与已有 `/history` 端点的区别：**

| 特性 | `/history` | `/all-messages` |
|------|-----------|----------------|
| 返回内容 | checkpoint 元数据 | 所有消息平铺列表 |
| 消息范围 | 仅最新 checkpoint | 所有 checkpoints 去重 |
| 摘要消息 | 包含 | **跳过** |
| 用途 | 调试 | 前端展示完整历史 |

**返回格式：**
```json
{
  "messages": [
    {"type": "human", "content": "你好", "id": "msg_1"},
    {"type": "ai", "content": "你好！", "id": "msg_2"}
  ],
  "total": 2
}
```

### 前端修改

`useThreadHistory` 钩子新增逻辑：
1. 页面加载时先调 `/all-messages` 获取完整历史
2. 成功后设为初始显示内容
3. API 不可用时回退到原 runs 加载方式
4. 流式更新消息正常追加

**关键：** 这个 API 是**只读**的，不修改 state，不触发摘要，不产生 LLM 调用。token 消耗 = **零**。

### 提交

```
（尚未提交）
git add backend/app/gateway/routers/threads.py
git add frontend/src/core/threads/hooks.ts
```

---

## 7. 前端网络配置修复

### 涉及文件

- `frontend/.env`（本地配置，不提交 git，需手动创建）

### 问题

通过域名 `https://deerflow.qingfengfuyang.cn` 访问时，前端 JS 尝试连接 `http://localhost:8001`（客户端本机），导致 CORS / Failed to fetch 错误。

### 修复

```env
# 注释掉直连 URL，让前端走 nginx 代理路径
# NEXT_PUBLIC_LANGGRAPH_BASE_URL=http://localhost:8001
# NEXT_PUBLIC_BACKEND_BASE_URL=http://localhost:8001
```

当变量未设置时，`getLangGraphBaseURL()` 使用 `window.location.origin + "/api/langgraph"`，通过 nginx 代理到后端。

### Nginx 配置

```nginx
location /api/langgraph/ {
    rewrite ^/api/langgraph/(.*) /api/$1 break;
    proxy_pass http://127.0.0.1:8001;
}
location /api/ {
    proxy_pass http://127.0.0.1:8001;
}
location / {
    proxy_pass http://127.0.0.1:3000;
}
```

---

## 8. 对话摘要配置优化

### 涉及文件

- `config.yaml`（本地配置，不提交 git）

### 修改

```yaml
summarization:
  enabled: true
  trigger:
    - type: tokens
      value: 50000    # 从 15564 调高
  keep:
    type: messages
    value: 50         # 从 10 调高
```

- `trigger`: token 数超过此值触发摘要压缩（调高后压缩更少发生）
- `keep`: 压缩后保留的最近完整消息数（调高后用户能看到更多上下文）

此配置配合第 6 节的全量历史 API 效果最佳——用户界面显示全部历史，LLM 仍然收压缩后的上下文。

---

## 9. 文件变更总览

### 新增文件

| 文件 | 功能 |
|------|------|
| `frontend/src/core/artifacts/file-tree.ts` | 文件树工具函数 |
| `frontend/src/components/workspace/artifacts/file-tree-panel.tsx` | 文件树面板组件 |
| `frontend/src/components/workspace/artifacts/file-tree-trigger.tsx` | 文件树开关按钮 |
| `docs/DEERFLOW_BUILTIN_SKILLS.md` | 内置技能文档 |
| `frontend/src/content/{en,zh}/reference/builtin-skills/*` | 中英文技能文档页面 |
| `docs/CHANGELOG-MODIFICATIONS.md` | 本变更记录 |

### 修改文件

| 文件 | 涉及章节 | 修改性质 |
|------|---------|---------|
| `backend/app/channels/feishu.py` | §5 | 飞书渠道多项修复与增强 |
| `backend/app/gateway/routers/threads.py` | §6 | 新增 `/all-messages` 端点 |
| `backend/app/gateway/routers/artifacts.py` | §1, §3 | 文件树 API、预览增强 |
| `backend/packages/harness/deerflow/tools/builtins/setup_agent_tool.py` | — | 小工具修改 |
| `backend/packages/harness/deerflow/tools/builtins/update_agent_tool.py` | — | 小工具修改 |
| `frontend/src/core/threads/hooks.ts` | §6 | 全量历史加载 |
| `frontend/src/core/artifacts/api.ts` | §1 | 文件树 API 调用 |
| `frontend/src/core/artifacts/utils.ts` | §1 | 路径处理 |
| `frontend/src/components/workspace/chats/chat-box.tsx` | §1, §2 | 三栏布局 + 文件树集成 |
| `frontend/src/components/workspace/artifacts/artifact-file-detail.tsx` | §3 | 预览面板增强 |
| `frontend/src/components/workspace/artifacts/context.tsx` | §1 | 文件树状态共享 |
| `frontend/src/components/workspace/artifacts/index.ts` | §1 | 导出新组件 |
| `frontend/src/app/workspace/chats/[thread_id]/page.tsx` | §1 | 文件树切换按钮 |
| `frontend/src/app/workspace/agents/[agent_name]/chats/[thread_id]/page.tsx` | §1 | 文件树切换按钮 |
| `frontend/src/content/{en,zh}/reference/_meta.ts` | §4 | 技能文档导航 |

### 本地配置文件（不提交 git）

| 文件 | 说明 |
|------|------|
| `config.yaml` | 飞书渠道配置、摘要参数 |
| `frontend/.env` | 前端网络配置 |
| `.env` | 环境变量（API Key 等） |

---

## 10. 部署说明

### 启动命令

```bash
# 后端（带飞书配置）
cd backend && \
  FEISHU_APP_ID=xxx FEISHU_APP_SECRET=xxx \
  PYTHONPATH=. \
  uv run uvicorn app.gateway.app:app --host 0.0.0.0 --port 8001

# 前端
cd frontend && PORT=3000 npx next start -p 3000
```

### 分享到 GitHub

```bash
# 提交所有源码修改（排除本地配置）
git add backend/app/channels/feishu.py
git add backend/app/gateway/routers/threads.py
git add backend/app/gateway/routers/artifacts.py
git add frontend/src/core/threads/hooks.ts
git add frontend/src/core/artifacts/
git add frontend/src/components/workspace/artifacts/
git add frontend/src/components/workspace/chats/chat-box.tsx
git add frontend/src/app/workspace/chats/[thread_id]/page.tsx
git add frontend/src/app/workspace/agents/[agent_name]/chats/[thread_id]/page.tsx
git add frontend/src/content/
git add docs/
git commit -m "综合功能增强：文件树、飞书渠道、全量历史、三栏布局、预览面板"
```

---

## 版本历史

| 日期 | 版本 | 修改内容 |
|------|------|---------|
| 2026-05-13 | v1.0 | 文件树功能、三栏布局 |
| 2026-05-14 | v2.0 | 预览面板增强、技能文档 |
| 2026-05-14 | v3.0 | 飞书渠道集成、全量历史 API、前端网络修复 |
