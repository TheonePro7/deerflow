# DeerFlow 开发规则（Claude Code 用）

## 第一条：每次修改后必须更新文档
修改任何 deerflow 代码后，必须同步更新 `/root/deerflow/docs/CHANGELOG-MODIFICATIONS.md`，记录：
- 改了哪些文件
- 为什么改
- 修复了什么

## 第二条：使用 superpowers 技能
开发前先检查 `/root/.claude/plugins/cache/superpowers-marketplace/superpowers/5.1.0/skills/` 下是否有适用的技能：

| 场景 | 必须用的技能 |
|------|------------|
| 排查 Bug | `systematic-debugging` — 系统化追踪链路 |
| 修完代码 | `verification-before-completion` — 先跑测试再自行验收 |
| 动手之前 | `writing-plans` — 先写计划再编码 |
| 合并分支 | `finishing-a-development-branch` — 检查 changelog、测试、质量 |
| 每次启动 | `using-superpowers` — 检查当前任务是否有可用技能 |

**强制规则：** 如果有技能适用，必须先调用 Skill 工具加载技能内容再执行任务。

## 第三条：项目背景
- 当前分支：`feat/langmem-integration`
- 记忆系统：LangMem（与 JSON 记忆并行运行）
- 模型：DeepSeek V4 Flash（不支持 vision/image_url）
- 关键文档：`/root/deerflow/docs/CHANGELOG-MODIFICATIONS.md`

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **deerflow** (23223 symbols, 37189 relationships, 286 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/deerflow/context` | Codebase overview, check index freshness |
| `gitnexus://repo/deerflow/clusters` | All functional areas |
| `gitnexus://repo/deerflow/processes` | All execution flows |
| `gitnexus://repo/deerflow/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
