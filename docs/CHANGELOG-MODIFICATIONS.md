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
9. [@ 文件引用 + / 命令系统](#9--文件引用--命令系统)
10. [UI 优化](#10-ui-优化)
11. [技能中文化](#11-技能中文化)
12. [计费与用量统计](#12-计费与用量统计)
13. [布局偏好记忆](#13-布局偏好记忆)
14. [语音输入功能](#14-语音输入功能)
15. [文件变更总览](#15-文件变更总览)
16. [部署说明](#16-部署说明)
17. [LangMem 记忆系统（实验性）](#17-langmem-记忆系统实验性)
18. [DeepSeek image_url 400 错误 — 三层防御修复](#18-deepseek-image_url-400-错误--三层防御修复)
19. [LangMem 集成修复（提取 & 注入全链路修复）](#19-langmem-集成修复提取--注入全链路修复)
20. [Skills 管理页面 + GitHub 热门技能](#20-skills-管理页面--github-热门技能)
21. [前端性能优化](#21-前端性能优化)

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

增强右侧产物预览面板的文件渲染能力，支持多种文件类型的内联预览，避免不必要的强制下载。

### 涉及文件

| 文件 | 修改类型 |
|------|---------|
| `frontend/src/components/workspace/artifacts/artifact-file-detail.tsx` | 修改 |
| `backend/app/gateway/routers/artifacts.py` | 修改 |

### 预览逻辑

预览面板根据文件扩展名自动选择最合适的展示方式：

```
文件请求 → 检查扩展名
  ├── .md, .html, .txt, .json, .js, .ts, .py, .css 等
  │   └── 内联代码/HTML/Markdown 渲染（CodeEditor / Streamdown）
  ├── .jpg, .jpeg, .png, .gif, .bmp, .webp, .svg, .ico, .heic
  │   └── 内联 <img> 标签渲染（SVG 也直接显示，不再强制下载）
  ├── .pdf
  │   └── 浏览器原生 <iframe> 预览
  ├── .pptx, .ppt, .xlsx, .xls, .docx, .doc
  │   └── 显示下载提示（浏览器无法内联预览 Office 文件）
  └── 其他
      └── CodeEditor 代码视图（可切换 preview/code 模式）
```

### 支持的预览类型

| 文件类型 | 预览方式 | 说明 |
|---------|---------|------|
| 图片 (jpg/png/gif/webp) | 内联 `<img>` | 直接显示图片 |
| **SVG** | **内联 `<img>`** | **原本强制下载，现改为直接显示** |
| PDF | `<iframe>` | 浏览器原生预览 |
| Markdown/HTML | Streamdown / iframe | 渲染为富文本 |
| 代码文件 (js/ts/py等) | CodeEditor | 语法高亮显示 |
| Office (pptx/docx/xlsx) | 下载提示 | 浏览器无法内联预览 |

### 核心改进

- **SVG 不再强制下载**：之前所有 SVG 文件都被当作"活动内容"强制下载，现在改为内联 `<img>` 渲染，可直接查看
- **智能模式切换**：代码文件支持 `code` / `preview` 两种视图模式切换，方便查看源码或渲染效果
- **图片类型扩展**：增加了 webp、bmp、ico、heic 等更多图片格式的支持

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



## 9. @ 文件引用 + / 命令系统

### 概述

在对话输入框中增加 `@` 文件引用和 `/` 命令系统，提升用户与 AI 交互的便捷性。

### 涉及文件

| 文件 | 修改类型 |
|------|---------|
| `frontend/src/components/ai-elements/mention-popover.tsx` | **新增** |
| `frontend/src/components/workspace/input-box.tsx` | 修改 |

### 9.1 @ 文件引用

**触发方式：** 在输入框中输入 `@`（前面有空格或行首），自动弹出工作区文件列表。

**功能：**
- 从 `/api/threads/{id}/files/tree` 获取当前对话的文件列表
- 输入文字自动模糊过滤文件名
- 键盘 ↑↓ 选择 + Enter 确认
- 选中的文件插入为 `@文件名` 格式
- 发送时自动展开为 `/mnt/user-data/完整路径` 给 AI 处理

**触发规则：**
- `@` 在词边界触发（前面有空格、行首或标点），不会在邮箱 `@` 时触发
- 如果 `@` 后面跟了空格（输入完成），弹出层自动关闭

### 9.2 / 命令系统

**触发方式：** 在行首输入 `/`，弹出命令列表。

**可用命令：**

| 命令 | 功能 |
|------|------|
| `/skill` | 主动调用一个技能，选择后弹出技能列表 |
| `/help` | 显示帮助面板，包含所有命令说明 |

**技能列表：**
- 从 `/api/skills` 加载所有可用技能
- 显示为两列网格：左列技能名、右列中文描述
- 支持模糊搜索技能名称

### 9.3 ESC 关闭

- 按 ESC 关闭弹出层，**不删除已输入的文字**
- 在技能子选择中按 ESC 回到命令列表（再按一次完全关闭）

### 实现细节

`mention-popover.tsx` 核心逻辑：

```typescript
// 检测触发器：从文本中找到最后一个符合条件的 @ 或 /
function findLastTrigger(text: string): MentionState | null {
  // @: 词边界后，且后面没有空格（仍在输入中）
  // /: 行首，且后面没有空格
}

// 处理选择：替换触发位置的内容
const handleSelect = (itemId: string) => {
  if (state.type === "@") {
    onInsert(itemId, { start: state.triggerPos, end: triggerEnd });
  }
  // /skill → 进入技能子选择
  // /help → 显示帮助面板
};
```

---

## 10. UI 优化

### 10.1 @/ 弹出层布局优化

**改动：** `frontend/src/components/ai-elements/mention-popover.tsx`

| 项目 | 改前 | 改后 |
|------|------|------|
| 布局 | 图标+名称+描述 挤在一行 | **两列网格**：左130px 名称，右侧描述 |
| 描述字号 | `text-xs`（12px） | **`text-sm`（14px）** |
| 行高 | 默认 | **leading-snug**，更舒适 |
| 项目间距 | 紧凑 | **py-3**，每项更清晰 |

### 10.2 @ 命令的视觉效果

```
┌──────────────────────────────────────────────┐
│  🔍 搜索文件/技能...                           │
├──────────────────────────────────────────────┤
│  📄 技能名称             这是技能的中文描述... │
│  📄 另一个技能           更长的中文描述...     │
│  📄 第三个技能           会自动换行到这里...   │
└──────────────────────────────────────────────┘
```

---

## 11. 技能中文化

### 概述

将所有 21 个内置技能的 `description` 字段从英文翻译为中文，方便中文用户理解各技能的用途。

### 涉及文件

`skills/public/*/SKILL.md`（21 个文件的 description 字段）

### 翻译内容

| 技能 | 功能 |
|------|------|
| academic-paper-review | 学术论文审阅分析 |
| chart-visualization | 数据可视化，26种图表类型 |
| claude-to-deerflow | DeerFlow 平台交互 |
| code-documentation | 代码文档生成 |
| consulting-analysis | 专业咨询分析报告 |
| data-analysis | Excel/CSV 数据分析 |
| deep-research | 深度网络研究 |
| find-skills | 发现安装技能 |
| frontend-design | 前端界面设计 |
| github-deep-research | GitHub 仓库深度研究 |
| image-generation | 图像生成 |
| newsletter-generation | 新闻通讯生成 |
| podcast-generation | 播客生成 |
| ppt-generation | PowerPoint 生成 |
| skill-creator | 技能创建与优化 |
| surprise-me | 创意惊喜体验 |
| systematic-literature-review | 系统性文献综述 |
| vercel-deploy-claimable | Vercel 部署 |
| video-generation | 视频生成 |
| web-design-guidelines | Web 设计指南审查 |

bootstrap 技能保留英文（系统内置工作区初始化技能）。

---



## 12. 计费与用量统计

### 概述

接入 DeepSeek 开放平台 API 获取真实账户余额，并结合数据库中的实际 token 消耗计算每日用量和费用。

### 涉及文件

| 文件 | 修改类型 |
|------|---------|
| `backend/app/gateway/routers/billing.py` | **新增** |
| `backend/app/gateway/app.py` | 修改 |
| `frontend/src/components/workspace/billing-overview.tsx` | **新增** |
| `frontend/src/app/workspace/chats/[thread_id]/page.tsx` | 修改 |

### 12.1 后端 API

**新增端点：** `GET /api/billing/overview`

需要认证。返回内容：

```json
{
  "balance": {
    "currency": "CNY",
    "total_balance": "217.97",
    "topped_up_balance": "217.97"
  },
  "daily_usage": [
    { "date": "2026-05-08", "input_tokens": 5000, "output_tokens": 2000, "total_tokens": 7000, "cost": 0.0015 },
    ...
  ],
  "total_input_tokens": 50000,
  "total_output_tokens": 20000,
  "total_tokens": 70000,
  "total_cost": 0.0123
}
```

**余额数据来源：** DeepSeek API `GET /user/balance`（实时）

**用量数据来源：** 数据库 `runs` 表（聚合近 30 天数据，按日期 + 模型分组）

### 12.2 费用计算

基于 runs 表中每条记录的实际 `model_name`、`total_input_tokens`、`total_output_tokens`，结合模型官方定价计算：

| 模型 | 输入价格（每百万 token） | 输出价格（每百万 token） |
|------|------------------------|-------------------------|
| DeepSeek V4 Flash | $0.15 | $0.60 |
| DeepSeek V4 Pro | $0.50 | $2.00 |
| DeepSeek V3 | $0.27 | $1.10 |

未匹配的模型默认使用 DeepSeek V4 Flash 价格。

### 12.3 前端展示

对话页面头部新增余额按钮（`¥217.97`），点击展开费用面板：

```
┌─────────────────────────────────┐
│  费用概览                        │
│                                 │
│  🪙 账户余额                    │
│     可用余额        ¥217.97     │  ← DeepSeek 实时数据
│     充值金额        ¥217.97     │
│  ─────────────────────────────  │
│  📅 今日用量                    │
│     Token 总计      12.3K       │
│     预估费用        ¥0.0018     │  ← 根据模型定价 + 实际用量计算
│  ─────────────────────────────  │
│  📈 近 7 天                     │
│     Token 总计      89.1K       │
│     预估费用        ¥0.0123     │
│     05-08   12.3K / ¥0.0018    │
│     05-09   15.1K / ¥0.0022    │  ← 每日明细
│     ...                         │
└─────────────────────────────────┘
```

### 12.4 关键特性

- **实时余额**：每次打开面板时从 DeepSeek API 获取最新余额
- **精确计算**：费用基于数据库中的实际 token 数 × 模型官方定价，非估算
- **多模型支持**：不同模型使用不同的价格计算
- **历史趋势**：展示近 7 天每日用量和费用变化

### 提交

```
007669c8 feat: 接入 DeepSeek 真实余额 + 每日用量统计
```

---




## 13. 布局偏好记忆

### 概述

用户对话页面的布局偏好（文件树开关、产物面板开关、当前查看的文件）在刷新页面后自动恢复。

### 涉及文件

| 文件 | 修改类型 |
|------|---------|
| `frontend/src/core/hooks/use-persisted-state.ts` | **新增** |
| `frontend/src/components/workspace/artifacts/context.tsx` | 修改 |

### 13.1 实现方式

新增 `usePersistedState` 钩子，用法与 `useState` 一致，但自动同步到 `localStorage`：

```typescript
// 钩子签名
function usePersistedState<T>(prefix: string, initial: T): [T, (v: T) => void]
```

- localStorage key 自动包含当前页面的 thread ID（从 URL 提取）
- 不同对话的布局状态互不干扰
- 非对话页面使用页面路径作为 key 后缀

### 13.2 持久化的状态

| 状态 | localStorage key 示例 | 说明 |
|------|----------------------|------|
| `fileTreeOpen` | `artifacts:fileTreeOpen__thread/xxx` | 文件树是否展开 |
| `artifactsOpen` | `artifacts:artifactsOpen__thread/xxx` | 右侧产物面板是否展开 |
| `selectedArtifact` | `artifacts:selectedArtifact__thread/xxx` | 当前打开的文件路径 |
| `autoOpen` | `artifacts:autoOpen__thread/xxx` | 是否自动打开产物面板 |
| `autoSelect` | `artifacts:autoSelect__thread/xxx` | 是否自动选择文件 |

### 13.3 修复记录

- **第一次提交**：只持久化了 `fileTreeOpen` 和 `selectedArtifact` → 刷新后产物面板仍关闭
- **第二次修复**：补充 `artifactsOpen`、`autoOpen`、`autoSelect` → 三栏布局全部恢复
- **第三次修复**：localStorage key 改用 `window.location.pathname` 直接获取，避免 SSR 时 `usePathname()` 不一致

### 提交

```
a1d81689 feat: 记忆用户布局偏好
c238147d fix: usePersistedState 改用 URL 派生 key
e8efd5bc fix: 透传产物面板状态到 localStorage
```

---

## 14. 语音输入功能

### 概述

在对话输入框中增加语音输入功能，用户可通过麦克风直接说话，语音自动转为文字填入输入框。

### 涉及文件

| 文件 | 修改类型 |
|------|---------|
| `frontend/src/components/workspace/voice-input.tsx` | **新增** |
| `frontend/src/types/speech-recognition.d.ts` | **新增** |
| `frontend/src/components/workspace/input-box.tsx` | 修改 |
| `backend/app/gateway/routers/voice.py` | **新增** |
| `backend/app/gateway/app.py` | 修改 |
| `backend/app/gateway/csrf_middleware.py` | 修改 |

### 14.1 前端语音输入（Web Speech API）

使用浏览器原生 Web Speech API，无需任何 API Key 或外部依赖。

**交互方式：**
- 点击输入框左侧 🎤 按钮开始录音
- 按钮变为红色脉冲动画，提示正在录音
- 录音中实时显示识别中间结果（悬浮气泡）
- 再次点击 🎤 停止录音，识别文字自动填入输入框
- 支持连续识别长句

**快捷键：**
- 麦克风旁 ⚙️ 齿轮按钮 → 点击「修改」→ 按下任意组合键
- 支持自定义任何组合：`Alt+Q`、`Ctrl+Shift+M`、`F2`、`Cmd+B` 等
- 修饰键自动识别（Ctrl / Alt / Shift / Cmd）
- 按键组合存入 `localStorage`，刷新后保留
- 点「关闭快捷键」可禁用
- 桌面全局生效，输入框中打字时不触发 Space 快捷键

**兼容性：**
- Chrome / Edge 桌面版：支持
- Firefox / Safari：部分支持
- 不支持的浏览器自动隐藏语音按钮

**技术实现：**
```typescript
// 使用 callbackRef 避免 useEffect 反复重建 SpeechRecognition
const callbackRef = useRef(onTranscript);
callbackRef.current = onTranscript;

// 按键录制：弹窗监听键盘事件，自动识别组合键
const handler = (e: KeyboardEvent) => {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push(e.metaKey ? "metaKey" : "ctrlKey");
  if (e.altKey) parts.push("altKey");
  if (e.shiftKey) parts.push("shiftKey");
  parts.push(e.code);
  onCapture(parts.join("+"));
};

useEffect(() => {
  const parts = new Set(shortcut.split("+"));
  // 通用匹配：任何组合键都能自动识别
  const handler = (e: KeyboardEvent) => {
    const match = e.code === targetKey && ...;
    if (match) toggleRecording();
  };
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}, [shortcut, toggleRecording]);
```

### 14.2 后端火山引擎 v2 ASR 代理（可选替代）

**新增端点：** `POST /api/voice/transcribe`

接收前端上传的音频文件（WAV/PCM），通过 WebSocket 转发到火山引擎流式语音识别2.0，返回识别文字。

**二进制协议：**
```
请求头格式（4字节）：
  字节0: protocol_version(4bit) | header_size(4bit)
  字节1: message_type(4bit) | flags(4bit)
  字节2: serialization(4bit) | compression(4bit)
  字节3: reserved(8bit)

消息类型：
  0x01 = CLIENT_FULL_REQUEST（配置）
  0x02 = CLIENT_AUDIO_ONLY_REQUEST（音频数据）
  0x09 = SERVER_FULL_RESPONSE（识别结果）
```

**环境变量配置：**
```env
VOLCENGINE_APP_ID=1293409232
VOLCENGINE_ACCESS_TOKEN=你的AccessToken
VOLCENGINE_CLUSTER=你的Cluster
```

### 14.3 修复记录

| 问题 | 原因 | 修复 |
|------|------|------|
| 点击麦克风无反应 | `onTranscript` 内联回调导致 `useEffect` 反复重建 | 改用 `callbackRef` 保存回调 |

### 提交

```
37778a56 feat: 语音输入功能（Web Speech API + 火山引擎 v2 ASR）
afa6b363 fix: 语音按钮点击无反应
```

---

## 15. 文件变更总览

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

## 16. 部署说明

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
| 2026-05-15 | v4.0 | @ 文件引用、/ 命令系统、ESC 关闭、UI 优化 |
| 2026-05-15 | v4.1 | 21 个内置技能描述中文化 |
| 2026-05-15 | v5.0 | DeepSeek 真实余额 + 每日用量统计 + 费用计算 |
| 2026-05-15 | v5.1 | 布局偏好记忆（localStorage 持久化）|
| 2026-05-15 | v5.2 | @ 第二次使用不弹出修复 + Token 面板 UI 优化 |
| 2026-05-16 | v6.0 | 语音输入功能（Web Speech API + 火山引擎 v2 ASR 代理）|
| 2026-05-16 | v6.1 | 语音快捷键自定义（任意组合键录制）|
| 2026-05-16 | v6.2 | 文件树「下载全部文件」ZIP |
| 2026-05-16 | v7.0-rc | LangMem 记忆系统（提取+注入+管理器 CRUD）|
| 2026-05-16 | v7.0-rc.4 | 修复 DeepSeek V4 Flash 不支持 image_url 导致 400 |
| 2026-05-16 | v7.0-rc.5 | view_image_middleware 自动剥离 image_url（兼容旧线程）|
| 2026-05-16 | v7.0-rc.6 | 三层防御：模型能力感知 + context 注入 + 模型级强制剥离 image_url |
| 2026-05-16 | v7.0-rc.7 | 修复 LangMem 提取静默失败：`_run_langmem_extraction` 函数重复定义导致被覆盖 |
| 2026-05-16 | v7.0-rc.8 | 代码清理：移除死代码 `create_manage_memory_tool`、`MemoryState` 导入、不可达 `asyncio.run()` 分支；补充 `__all__` 导出 `LangMemManager` |
| 2026-05-16 | v7.0-rc.9 | 修复 LangMem 沙箱环境 Bug：AsyncSqliteStore.from_conn_string() 不创建父目录，新沙箱中 .deer-flow/ 不存在时静默失败；两处加 os.makedirs() |
| 2026-05-16 | v7.0-rc.9 | 修复 Hook A：_get_langmem_memories 在 async 上下文（abefore_agent）中 new_event_loop() 不生效导致协程从未执行；拆分为 async + sync 双版本；`invoke()` 改为 `asyncio.to_thread()` 避免阻塞事件循环 |

---

## 17. LangMem 记忆系统（实验性）

### 概述

集成 LangMem（LangChain 官方记忆库），在现有 JSON 记忆系统之外增加语义级长期记忆。两者并行运行，互不干扰。

### 涉及文件

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `backend/packages/.../agents/memory/langmem_adapter.py` | **新增** | LangMem 适配器（提取+持久化） |
| `backend/packages/.../agents/memory/updater.py` | 修改 | 对话结束后自动触发 LangMem 提取 |
| `backend/packages/.../agents/lead_agent/prompt.py` | 修改 | 注入 LangMem 记忆到系统提示词 |
| `backend/app/gateway/routers/memory.py` | 修改 | 新增 LangMem CRUD API |
| `frontend/src/app/workspace/memory/page.tsx` | **新增** | 记忆管理页面 |
| `frontend/src/components/workspace/workspace-nav-chat-list.tsx` | 修改 | 左侧导航增加「记忆」入口 |
| `frontend/src/components/ai-elements/message.tsx` | 修改 | 消息内容 break-words 换行 |
| `backend/app/gateway/csrf_middleware.py` | 修改 | 豁免 LangMem API 的 CSRF 检查 |
| `poc/langmem_poc.py` | **新增** | PoC 验证脚本 |
| `poc/test_langmem_full.py` | **新增** | 集成测试脚本 |

### 17.1 三层架构

```
┌─────────────────────────────────────────────────────────────┐
│  ① 提取层（对话结束后触发）                                  │
│                                                             │
│  用户对话完成                                                │
│    → 现有 memory.json 更新（不变）                            │
│    → 同时触发 LangMem 提取（异步线程，不阻塞）                │
│    → 调用 DeepSeek 模型分析对话 → 提取结构化记忆               │
│    → 存入 langmem.db（SQLite）                               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ② 存储层（LangMem Adapter）                                 │
│                                                             │
│  langmem.db (AsyncSqliteStore)                              │
│    └── 命名空间: ("memories", user_id, "semantic")           │
│    └── 每条记忆: key + {content, type, updated_at}           │
│    └── 分类: 用户偏好 / 工作领域 / 技术决策 / 项目需求 / 目标  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ③ 注入层（对话开始时触发）                                  │
│                                                             │
│  用户新建对话                                                │
│    → 读取 langmem.db 中该用户的所有记忆                       │
│    → 格式化为【长期记忆】区块                                │
│    → 与现有 JSON 记忆一起注入 System Prompt                   │
│    → AI 在回复中自动引用记忆                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 17.2 记忆管理器（前端）

左侧导航「智能体」下方新增「记忆」入口，支持：

| 功能 | 操作 | API |
|------|------|-----|
| 查看所有记忆 | 点击「记忆」 | `GET /api/langmem` |
| 新建记忆 | 点击「添加记忆」→ 填内容 → 保存 | `POST /api/langmem` |
| 编辑记忆 | hover → 点击 ✏️ → 修改 → 保存 | `PUT /api/langmem/{id}` |
| 删除记忆 | hover → 点击 🗑️ | `DELETE /api/langmem/{id}` |

### 17.3 修复记录

| 问题 | 原因 | 修复 |
|------|------|------|
| 记忆提取了但未持久化 | extract() 返回列表未存入库 | 增加 `store.aput()` 持久化 |
| `store.alist()` 不存在 | LangGraph API 无此方法 | 改用 `store.asearch()` |
| CRUD 返回 403 | CSRF 中间件拦截 PUT/DELETE | 豁免 `/api/langmem` 路径 |
| 消息内容横向滚动条 | 缺少 `break-words` CSS | 消息组件增加自动换行 |

### 17.4 测试验证

```
注入测试记忆 → AI 对话 → 验证记忆是否影响行为
  ├── 称呼「主公」 ✅
  ├── 引用 FastAPI 技术栈 ✅
  ├── 引用 PostgreSQL 数据库 ✅
  └── 4/5 测试通过
```

### 17.5 提交记录

```
8760509f fix: 记忆管理页 - 修复 alist→asearch + UI 重做
843dba09 fix: 消息内容换行 + LangMem CRUD 403
bfcc6e04 docs: 更新 changelog - 记忆管理器等
eab4a53b feat: LangMem 记忆注入 + 完整测试套件
1afbd9bc feat: LangMem 集成（与现有记忆系统并行运行）

---

## 18. DeepSeek image_url 400 错误 — 三层防御修复

### 概述

DeepSeek V4 Flash 不支持 `image_url` 内容块，收到后会返回 HTTP 400 错误。这些 `image_url` 块的来源可能是 view_image 中间件注入、readability 工具转换、或遗留线程中的历史消息。

采用**三层防御**策略彻底解决：

| 层级 | 文件 | 策略 |
|------|------|------|
| **① 源头阻断** | `view_image_middleware.py` | 对非 vision 模型不生成 image_url，只注入文字描述 |
| **② 运行时上下文** | `client.py` | 将 `model_name` 注入 `runtime.context`，使中间件能准确感知当前模型能力 |
| **③ 最后防线 ⭐** | `patched_deepseek.py` | 在 API 请求发送前，强制剥离所有消息中的 `image_url` 内容块 |

### 涉及文件

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `backend/packages/.../agents/middlewares/view_image_middleware.py` | 修改 | 新增 `_model_supports_vision()`，注入/剥离根据模型能力自适应；`abefore_model` 补充剥离逻辑 |
| `backend/packages/.../agents/lead_agent/agent.py` | 修改 | ViewImageMiddleware 改为**始终注册**，由中间件运行时自我决策 |
| `backend/packages/.../client.py` | 修改 | `runtime.context` 增加 `model_name` 字段，使中间件能获取当前模型名 |
| `backend/packages/.../models/patched_deepseek.py` | 修改 | **新增** `_strip_image_url_from_content()` 静态方法，在 API payload 层面强制剥离所有 `image_url` 块 |

### 18.1 三层防御详解

#### ① 源头阻断（ViewImageMiddleware）

中间件在 `before_model` / `abefore_model` 中检测当前模型是否支持 vision：

```python
supports_vision = self._model_supports_vision(runtime)
if not supports_vision:
    self._sanitize_image_blocks(state)  # 剥离遗留 image_url
return self._inject_image_message(state, supports_vision=supports_vision)
```

- 支持 vision 的模型：注入完整图片消息（含 base64 image_url）
- 不支持 vision 的模型：仅注入文字描述，同时清理历史消息中的 image_url

#### ② 运行时上下文注入（client.py）

`runtime.context` 原本只包含 `thread_id` 和 `agent_name`，缺少 `model_name`，导致中间件无法准确判断模型能力。修复后：

```python
context = {"thread_id": thread_id}
if self._agent_name:
    context["agent_name"] = self._agent_name
if self._model_name:                         # ← 新增
    context["model_name"] = self._model_name  # ← 新增
```

#### ③ 最后防线（patched_deepseek.py）

**最关键的修复**——在 `_get_request_payload()` 中，消息发送给 DeepSeek API 之前强制剥离 `image_url`：

```python
# Strip image_url blocks from ALL messages before sending to DeepSeek API.
# DeepSeek models do NOT support image_url; if any reach the API they
# return a 400 error. This is the last line of defense regardless of
# where the image_url blocks came from (middleware, readability, etc.).
for msg in payload_messages:
    if "content" in msg:
        msg["content"] = self._strip_image_url_from_content(msg["content"])
```

无论 `image_url` 从哪来，在 DeepSeek 收到之前都会被清除，从物理上杜绝 400 错误。

### 18.2 修复的问题

| 问题 | 原因 | 修复 |
|------|------|------|
| DeepSeek V4 Flash 收到 image_url → 400 错误 | ViewImageMiddleware 只在 `supports_vision=True` 时注册，非 vision 模型无法剥离遗留消息中的 image_url | 始终注册中间件 + 模型级强制剥离（双重保险） |
| 异步版本 `abefore_model` 未执行剥离 | `abefore_model` 只调了 `_inject_image_message`，没有剥离逻辑 | `abefore_model` 现在与 `before_model` 行为一致 |
| `runtime.context` 缺少 `model_name` | 上下文构建时只传了 `thread_id` 和 `agent_name`，中间件无法获取模型名 | `client.py` 增加 `model_name` 注入 |
| 中间件/readability 等可能引入 image_url | 中间件层面无法覆盖所有入口 | `patched_deepseek.py` 在 API payload 层面做最终拦截 |

### 提交

```
0b2a7762 fix: view_image_middleware 自动剥离 image_url 内容块
73f188ae fix: DeepSeek V4 Flash 不支持 image_url 导致 LLM 400 错误
（当前改动 — 三层防御：模型能力感知 + context 注入 + 模型级强制剥离）
```


---

## 19. LangMem 集成修复（提取 & 注入全链路修复）

### 概述

LangMem 集成存在**提取（写）** 和**注入（读/Hook A）** 两个环节的严重 Bug，导致整个 LangMem 记忆系统在实际对话中完全不生效——记忆既不提取也不注入，相当于整个系统形同虚设。

### 涉及文件

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `backend/packages/.../agents/memory/updater.py` | 修改 | 删除重复的 `_run_langmem_extraction` 定义（两版参数签名不同，后版覆盖前版导致静默失败） |
| `backend/packages/.../agents/memory/langmem_adapter.py` | 修改 | 移除死代码 `create_manage_memory_tool`、`MemoryState` 导入、不可达 `asyncio.run()` 分支；`invoke()` 改为 `asyncio.to_thread()` 避免阻塞事件循环；补充 `__all__` 导出 |
| `backend/packages/.../agents/memory/__init__.py` | 修改 | 导出 `LangMemManager`、`is_available` |
| `backend/packages/.../agents/lead_agent/prompt.py` | 修改 | `_get_langmem_memories` 拆分为 async 版本 `_fetch_langmem_memories` + sync 包装器，适配 async/sync 双上下文 |
| `backend/packages/harness/pyproject.toml` | 修改 | `[project.optional-dependencies]` 新增 `langmem = ["langmem"]` 可选依赖 |

### 19.1 提取断裂（写）

**问题：** `updater.py` 中 `_run_langmem_extraction` 被定义了两次，签名不同：

| 定义 | 行号 | 签名 | 行为 |
|------|------|------|------|
| 第一版 | 628 | `(messages, user_id)` | 完整：内部创建 Store 和 Manager |
| 第二版 | 669 | `(manager, messages, user_id)` | 简版：需要外部传入 Manager |

Python 使用最后一个定义。调用方传参 `(messages, effective_user)` -> 第二版收到：

```
manager = messages       <- 消息列表当成 manager
messages = user_id        <- user_id 当成 messages
user_id = ???             <- 缺参
```

-> `manager.extract(messages)` -> `list.extract()` -> **AttributeError** -> 被 `except Exception` 吃掉 -> **静默失败**，LangMem 从来没真正提取过记忆。

**修复：** 删除第二版定义，保留第一版完整实现。

### 19.2 注入断裂（Hook A 读）

**问题：** `_get_langmem_memories()` 使用 `asyncio.new_event_loop()` + `loop.run_until_complete()` 运行 async 代码。但该方法被 `DynamicContextMiddleware.abefore_agent()`（async 上下文）调用，此时已存在运行中的事件循环，`new_event_loop()` 创建的协程**从未被执行**，Hook A 一直在静默返回空字符串。

服务器日志中的证据：
```
RuntimeWarning: coroutine '_get_langmem_memories.<locals>._fetch' was never awaited
```

**修复：** 将函数拆分为 async 版本 `_fetch_langmem_memories` + sync 包装器 `_get_langmem_memories`，自动检测运行时上下文选择执行策略。

### 19.3 sync 阻塞 async

**问题：** `LangMemManager.extract()` 是 async 方法，但内部 `self._manager.invoke()` 是 sync 调用，直接阻塞事件循环。

**修复：** 改为 `await asyncio.to_thread(self._manager.invoke, ...)`，将 sync 调用委托到线程池执行。

### 19.4 其他清理

| 问题 | 修复 |
|------|------|
| `create_manage_memory_tool` 初始化后从未使用 | 移除 |
| `from langmem.knowledge.extraction import MemoryState` 未使用 | 移除 |
| `asyncio.run()` 不可达分支（extract() 总是在事件循环中调用） | 移除，统一 `await` |
| `from deerflow.config.app_config import AppConfig` 未使用 | 移除 |
| `langmem_adapter.py` 无 `__all__` | 补充 |
| `__init__.py` 未导出 `LangMemManager`、`is_available` | 补充 |

### 提交

```
（当前改动 — LangMem 全链路修复：提取去重 + Hook A async/sync 双版本 + invoke 非阻塞 + 代码清理）
```

---

## 20. Skills 管理页面 + GitHub 热门技能

### 概述

在左侧导航栏新增「Skills」菜单项，提供 Skills & MCP 管理页面。页面包含三个功能区块：查看已安装技能、MCP 服务器配置、GitHub 热门技能榜单。

### 涉及文件

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `frontend/src/app/workspace/skills/page.tsx` | **新增** | Skills 管理页面：已安装技能列表、MCP 服务器列表、GitHub 热门技能（日/周/月榜） |
| `frontend/src/components/workspace/workspace-nav-chat-list.tsx` | 修改 | 左侧导航栏新增「Skills」入口（位于「记忆」下方） |
| `backend/app/gateway/routers/skills.py` | 修改 | 新增 `GET /api/skills/trending` 端点，搜索 GitHub 上与 AI Agent / Skills 相关的热门仓库 |

### 20.1 Skills 管理页面

- **已安装技能**：从 `GET /api/skills` 读取，显示名称、描述、分类、启用状态
- **MCP 服务器**：从 `GET /api/mcp/config` 读取，显示名称、命令、启用状态
- **GitHub 热门**：日榜/周榜/月榜切换，搜索 GitHub AI Agent 相关仓库

### 20.2 CLAUDE.md 开发规则

新增 `/root/deerflow/CLAUDE.md`，包含三条开发规则：
1. 每次修改后必须更新 CHANGELOG-MODIFICATIONS.md
2. 开发前必须检查 superpowers 技能是否适用
3. 项目背景信息（分支、记忆系统、模型能力等）

### 版本历史

| 日期 | 版本 | 修改内容 |
|------|------|---------|
| 2026-05-16 | v7.0-rc.10 | Skills 管理页面 + GitHub 热门 API + CLAUDE.md 开发规则 |
| 2026-05-16 | v7.0-rc.11 | 修复 LangMem 沙箱环境 Bug：AsyncSqliteStore 不创建父目录，新沙箱中静默失败 |
| 2026-05-16 | v7.0-rc.12 | 性能优化：消息列表限制 200 条 + 文件树仅在切换对话时刷新 + 记忆列表分页加载（取消 limit=500，改为 offset/limit 分页）|

---

## 21. 前端性能优化

### 概述

针对长对话线程（17,000+ 条消息）导致页面卡顿、文件树频繁刷新、记忆列表无分页等问题进行了优化。

### 涉及文件

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `frontend/src/core/threads/hooks.ts` | 修改 | 消息列表上限 200 条（all-messages 和 runs 回退两条路径均截断） |
| `frontend/src/components/workspace/chats/chat-box.tsx` | 修改 | 文件树 `useEffect` 去掉 `thread.values.artifacts` 依赖，仅在切换对话时刷新 |
| `backend/app/gateway/routers/memory.py` | 修改 | `GET /api/langmem` 增加 `offset` 和 `limit` 参数，支持分页查询 |
| `frontend/src/app/workspace/memory/page.tsx` | 修改 | 记忆列表改为每页 50 条 + 「加载更多」按钮，避免一次性渲染大量数据 |

### 21.1 消息列表性能

**问题：** 主线程有 17,129 条消息，全部渲染到 DOM 中，React 需要管理数千个虚拟 DOM 节点，导致每次输入/响应都严重卡顿。

**修复：** 在 `all-messages` 和 runs 回退两条加载路径中，只保留最近 200 条消息：

```typescript
const MAX_VISIBLE = 200;
setMessages(data.messages.length > MAX_VISIBLE
  ? data.messages.slice(-MAX_VISIBLE)
  : data.messages);
```

### 21.2 文件树刷新

**问题：** `useEffect` 依赖 `thread.values.artifacts`，每次 AI 回复产生新文件时都触发文件树全量重新请求。

**修复：** 改为仅依赖 `threadId`，只在切换对话时刷新一次。

### 21.3 记忆列表分页

**问题：** API 一次性返回最多 500 条，前端全部渲染。如果累积到 5000/50000 条会越来越慢。

**修复：**
- 后端：`GET /api/langmem?offset=0&limit=50` 支持分页
- 前端：首次加载 50 条，底部「加载更多」按钮增量加载

---

## 22. 知识库（共享公司文件）

### 概述

新增公司知识库功能：创建一个共享目录 `/data/company-files/`，所有智能体可在对话中按需加载使用。支持文件上传、删除、预览。

### 涉及文件

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `backend/packages/harness/deerflow/knowledge_base/store.py` | **新增** | 知识库配置读取 + 文件列表 |
| `backend/app/gateway/routers/knowledge_base.py` | **新增** | API：列表、上传、删除、文件内容读取 |
| `backend/app/gateway/routers/__init__.py` | 修改 | 注册知识库路由 |
| `backend/app/gateway/app.py` | 修改 | 注册路由 |
| `frontend/src/app/workspace/knowledge/page.tsx` | **新增** | 知识库管理页面（两栏布局） |
| `frontend/src/app/workspace/knowledge/error.tsx` | **新增** | 错误边界 |
| `frontend/src/components/workspace/workspace-nav-chat-list.tsx` | 修改 | 侧边栏新增「知识库」入口 |
| `frontend/src/components/workspace/chats/chat-box.tsx` | 修改 | 文件树中新增「知识库」加载按钮 |
| `frontend/src/core/artifacts/api.ts` | 修改 | API 返回共享文件数据 |
| `frontend/src/components/workspace/artifacts/file-tree-panel.tsx` | 修改 | 支持展示共享文件分区 |
| `frontend/src/components/workspace/artifacts/knowledge-base-trigger.tsx` | **新增** | 知识库加载按钮组件 |
| `config.yaml` | 修改 | 新增 knowledge_base + sandbox mounts |

### 架构

```
/data/company-files/       ← 共享目录（服务端路径）
    └── 文案/品牌介绍.md
    └── 设计稿/设计规范.md

sandbox mounts: /mnt/shared/  ← Agent 可见路径

对话中：
  [📕 知识库] 按钮 → 加载 → Agent 可读写 /mnt/shared/
```

### 侧边栏页面

侧边栏新增「知识库」入口，管理页面支持：
- 文件树上查看所有文件
- 点击文件预览内容
- 上传文件（多选）
- 删除文件（悬停出现按钮）
- 显示服务端路径提示

### API

```
GET    /api/knowledge-base                     → 配置 + 文件列表
POST   /api/knowledge-base/upload              → 上传文件
DELETE /api/knowledge-base/files?path=...      → 删除文件
GET    /api/knowledge-base/files/content?path= → 读取文件内容
GET    /api/threads/{id}/files/tree            → 返回 shared + thread 两部分
```

### 提交

```
9344b3df feat: knowledge base — shared directory for all agents
92bc9139 feat: knowledge base file management (upload + delete)
60f23e29 feat: knowledge base file preview
c2a5c686 refactor(knowledge): unified three-column layout + preview
```

---

## 23. 自动化任务管理页面

### 概述

将原「计划」日历页面改造为「自动化」任务管理页面，支持查看已安排和已完成的任务。

### 涉及文件

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `frontend/src/app/workspace/plans/page.tsx` | 重写 | FullCalendar → 自动化任务看板 |
| `frontend/src/components/workspace/workspace-nav-chat-list.tsx` | 修改 | "计划" → "自动化" |
| `frontend/src/styles/globals.css` | 修改 | 移除 FullCalendar 样式 |
| `frontend/package.json` | 修改 | 移除 @fullcalendar/* 依赖 |

### UI 设计

深色模式任务看板：
- 顶部：标题「自动化」+ 说明 + 「+ 添加」「从模版添加」按钮
- 已安排：灰色圆点 + 任务名 + 标签 + 时间信息
- 已完成：绿色圆点 + 任务名 + 标签 + 成功状态

### 数据模型

```typescript
interface AutoTask {
  id: string;
  name: string;
  tag: string;           // "Claw", "Deep Research"
  schedule: string;      // "每天 09:00"
  period: string;        // "2026-05-15 ~ 2026-06-15"
  nextRun: string;       // "22小时后开始"
  status: "pending" | "success" | "failed";
}
```

### 提交

```
bbb2b98b feat: replace calendar plans page with automation task page
```

---

## 24. 架构深度解析文档

### 概述

编写了 DeerFlow 完整架构拆解文档（837行），覆盖 Agent 系统、Lead Agent 机制、Sub-Agent 编排、Tool 系统、Skill 系统、Sandbox、Memory、Model 接入、Runtime、Gateway API 等核心模块。

### 涉及文件

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `docs/DEERFLOW_ARCHITECTURE_DEEP_DIVE.md` | **新增** | 架构深度解析文档 |
| `frontend/src/content/zh/reference/architecture-overview.mdx` | **新增** | 中文版（前端可访问） |
| `frontend/src/content/en/reference/architecture-overview.mdx` | **新增** | 英文版 |
| `frontend/src/content/zh/reference/_meta.ts` | 修改 | 添加导航 |
| `frontend/src/content/en/reference/_meta.ts` | 修改 | 添加导航 |

访问路径：`/docs/reference/architecture-overview`

### 更新内容

- **LangMem 记忆系统**：结构化记忆管理、5 种分类、置信度评分、完整 CRUD API
- **LangSmith 追踪**：外部可观测性平台集成说明
- **计划任务系统**：4 个 Agent 工具 + REST API
- **文件目录树**：侧边栏组件和 API 说明
- **知识库**：共享目录架构说明

### 提交

```
d95188e7 style(plans): comprehensive FullCalendar dark theme + zh-cn locale
(架构文档在多轮提交中持续更新)
```

---

## 25. LangSmith 可观测性集成

### 概述

配置 LangSmith 用于 LLM 调用追踪。LangSmith 不是 DeerFlow 原生功能，而是外部可观测性平台。

### 配置

```bash
# .env
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=your-langsmith-api-key
LANGSMITH_PROJECT=deerflow
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
```

### 追踪内容

- 每次 LLM 调用的输入/输出
- Tool 调用链
- Token 消耗统计
- 调用耗时
- Agent 思考过程

访问 https://smith.langchain.com → 选择 deerflow 项目查看。

---

## 26. 文件目录树完整功能

### 功能列表

- ✅ 文件树侧边栏（可拖拽调整宽度）
- ✅ 对话中按需加载（📁 按钮）
- ✅ 从文件系统读取（非 artifacts 列表）
- ✅ 路径简化（去掉 /mnt/user-data/ 层级）
- ✅ 三栏布局（文件树 + 聊天 + 预览）
- ✅ 文件预览支持：md/txt/code/jpg/png/pdf/svg
- ✅ 知识库共享文件（📕 按钮加载）
- ✅ 全系统统一文件树组件 `FileTreePanel`

---

## 27. 子任务状态同步修复

### 问题

子代理实际已经完成（`SubagentStatus.COMPLETED`），但前端 todo 列表仍然显示 "running"。

### 根因

DeerFlow 有两套独立的状态系统：

| 系统 | 状态管理 | 可靠性 |
|------|---------|--------|
| `subagents/executor.py` | 后端代码强制执行 | ✅ 真实 |
| `TodoMiddleware` (todos) | 依赖 LLM 自觉调用 `write_tools` | ❌ LLM 可能忘记标记 |

子代理完成后，结果已传回主线程，但 todo 状态没有同步更新。

### 修复

在 `subagents/executor.py` 中，子代理标记为 `COMPLETED` 后自动同步线程状态中的 todos：

```python
# subagents/executor.py:582-583
result.status = SubagentStatus.COMPLETED
result.completed_at = datetime.now()

# 新增：自动完成 todos
try:
    store = get_thread_store()
    state = store.get_state(self.thread_id)
    if state and "todos" in state:
        for todo in state["todos"]:
            if todo.get("status") in ("pending", "in_progress"):
                todo["status"] = "completed"
        store.update_state(self.thread_id, {"todos": state["todos"]})
except Exception:
    pass  # 非关键路径，失败不影响主流程
```

### 涉及文件

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `backend/packages/harness/deerflow/subagents/executor.py` | 修改 | 子代理完成后自动同步 todo 状态 |

### 提交

```
(当前提交)
```

---

## 28. 子代理孤立事件循环崩溃修复

### 概述

修复 DeerFlow 原始代码中子代理系统的一个架构缺陷：全局共享的 `_isolated_subagent_loop` 在超时后不会自动恢复，导致所有后续子代理任务卡死。

### 根因

```python
# 原始代码（executor.py）
_isolated_subagent_loop: asyncio.AbstractEventLoop | None = None  # 全局共享
_isolated_subagent_loop_thread: threading.Thread | None = None     # 所有子代理共用
```

所有子代理在同一个守护线程的同一个事件循环中执行。当一次执行超时（如 DeepSeek API 挂起）后，该事件循环进入坏状态，**后续所有子代理调用全部卡死**，直到 Gateway 重启。

### 修复

在 `FuturesTimeoutError` 捕获后，自动销毁并重建孤立事件循环：

```python
except FuturesTimeoutError:
    # ... 原有超时处理 ...
    # 新增：自动重建循环，防止后续子代理卡死
    _shutdown_isolated_subagent_loop()
    _get_isolated_subagent_loop()  # 创建全新循环
```

### 涉及文件

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `backend/packages/harness/deerflow/subagents/executor.py` | 修改 | 超时后自动重建孤立事件循环 |

### 提交

```
3beea403 fix: restart isolated subagent loop after timeout
```
