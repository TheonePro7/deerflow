# DeerFlow 版本回退指南

> 如果在 LangMem 集成或其他功能升级后出现问题，按此指南回退到稳定版本。

## 快速回退（10 秒）

```bash
# 切回稳定分支
git checkout main
git reset --hard v6.2-stable

# 重启后端
cd backend && pkill -f "uvicorn app.gateway"
FEISHU_APP_ID=xxx FEISHU_APP_SECRET=xxx DEEPSEEK_API_KEY=xxx \
PYTHONPATH=. uv run uvicorn app.gateway.app:app --host 0.0.0.0 --port 8001

# 重启前端
cd frontend && pkill -f "next-server"
rm -rf .next && pnpm build && PORT=3000 npx next start -p 3000
```

## 当前稳定版本

| 标签 | 分支 | 提交 | 日期 |
|------|------|------|------|
| `v6.2-stable` | `main` | `de987136` | 2026-05-16 |

## 查看版本历史

```bash
# 查看所有标签
git tag -l

# 查看某个标签的改动
git diff v6.2-stable..HEAD --stat

# 比较当前和稳定版的差异
git log v6.2-stable..HEAD --oneline
```

## 分支策略

```
main (稳定版) ─── v6.2-stable ← 当前稳定
                    \
feat/langmem-integration ─── 实验性集成（随时可删）
```

- `main` 分支始终保留上一个稳定版本
- 所有 LangMem 集成工作在 `feat/langmem-integration` 分支进行
- 集成完成后合并回 `main`，同时打新标签
- 如果集成失败，直接删除分支，`main` 不受影响
