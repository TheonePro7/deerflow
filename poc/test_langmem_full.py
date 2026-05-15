"""
LangMem 完整测试：注入记忆 → 对话 → 验证记忆是否影响 AI 行为

测试流程：
  1. 向 LangMem 存储中注入测试记忆
  2. 模拟一次对话
  3. 检查系统提示词中是否包含记忆
  4. 检查 AI 是否根据记忆调整行为

运行方式：
  cd backend && uv run python3 ../poc/test_langmem_full.py
"""

import os, sys, json, asyncio, tempfile
os.environ["DEEPSEEK_API_KEY"] = "sk-29624b839f89489791baad3d5c05f8e0"

# ── Step 1: 注入测试记忆 ──────────────────────────────────────────────
print("=" * 60)
print("📝 Step 1: 注入测试记忆到 LangMem 存储")
print("=" * 60)

TEST_MEMORIES = [
    {
        "namespace": ("memories", "test_user"),
        "key": "preference_title",
        "value": {
            "content": "[用户偏好] 用户明确要求AI称呼其为「主公」，这是用户最喜欢的称呼方式。",
            "type": "用户偏好",
            "confidence": 0.95,
            "updated_at": "2026-05-16",
        },
    },
    {
        "namespace": ("memories", "test_user"),
        "key": "work_field",
        "value": {
            "content": "[工作领域] 用户是AI教育创业者，面向中小学生提供AI编程培训。公司主要使用Python和JavaScript。",
            "type": "工作领域",
            "confidence": 0.9,
            "updated_at": "2026-05-16",
        },
    },
    {
        "namespace": ("memories", "test_user"),
        "key": "tech_stack",
        "value": {
            "content": "[技术决策] 后端使用FastAPI，前端使用Next.js，数据库使用PostgreSQL。曾考虑切换到Node.js但最终决定保持FastAPI。",
            "type": "技术决策",
            "confidence": 0.85,
            "updated_at": "2026-05-16",
        },
    },
]

from langgraph.store.sqlite.aio import AsyncSqliteStore
from deerflow.config.paths import get_paths

db_path = f"{get_paths().base_dir}/langmem.db"
print(f"  存储路径: {db_path}")

async def inject_memories():
    async with AsyncSqliteStore.from_conn_string(db_path) as store:
        for mem in TEST_MEMORIES:
            await store.aput(mem["namespace"], mem["key"], mem["value"])
            print(f"  ✅ 注入: {mem['key']}")
        print(f"  📊 共注入 {len(TEST_MEMORIES)} 条记忆")

asyncio.run(inject_memories())

# ── Step 2: 测试记忆读取 ──────────────────────────────────────────────
print("\n" + "=" * 60)
print("📝 Step 2: 测试 LangMem 记忆读取")
print("=" * 60)

from deerflow.agents.lead_agent.prompt import _get_langmem_memories

result = _get_langmem_memories("test_user", 2000)
if result:
    print(f"  ✅ 成功读取记忆 ({len(result)} 字符):")
    for line in result.split("\n"):
        print(f"     {line}")
else:
    print("  ❌ 读取失败")

# ── Step 3: 测试记忆注入到系统提示词 ──────────────────────────────────
print("\n" + "=" * 60)
print("📝 Step 3: 测试记忆注入到系统提示词")
print("=" * 60)

# 模拟系统提示词构建
memory_context = _get_langmem_memories("test_user", 2000)
if memory_context:
    system_prompt = f"""你是 DeerFlow AI 助手，一个专业的AI编程教学平台助手。

{memory_context}

请根据以上长期记忆中的信息，为用户提供个性化的服务。"""
    
    print(f"  ✅ 系统提示词构建成功 ({len(system_prompt)} 字符)")
    # 检查记忆是否被包含
    if "主公" in system_prompt:
        print("  ✅ 「主公」称呼记忆已成功注入系统提示词")
    else:
        print("  ❌ 「主公」称呼记忆未注入系统提示词")
else:
    print("  ❌ 无法构建系统提示词")

# ── Step 4: 真实对话测试 ──────────────────────────────────────────────
print("\n" + "=" * 60)
print("📝 Step 4: 真实对话测试 — AI 是否会称呼「主公」")
print("=" * 60)

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from deerflow.models import create_chat_model

try:
    model = create_chat_model("deepseek-v4-flash")
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content="你好，我想了解一下我们现在的技术架构选型。我之前做过什么决策？"),
    ]
    
    print("  发送消息给 AI...")
    response = model.invoke(messages)
    ai_text = response.content
    print(f"\n  🤖 AI 回复:\n{ai_text}\n")
    
    # 验证记忆是否被使用
    checks = {
        "主公": "称呼记忆生效",
        "FastAPI": "技术栈记忆生效",
        "PostgreSQL": "数据库记忆生效",
        "Next.js": "前端技术记忆生效",
        "AI教育": "工作领域记忆生效",
    }
    
    passed = 0
    for keyword, desc in checks.items():
        if keyword in ai_text:
            print(f"  ✅ {desc} — AI 提到了「{keyword}」")
            passed += 1
        else:
            print(f"  ⚠️ {desc} — AI 未提到「{keyword}」")
    
    print(f"\n  📊 测试结果: {passed}/{len(checks)} 通过")
    
except Exception as e:
    print(f"  ❌ 对话测试失败: {e}")
    import traceback
    traceback.print_exc()

# ── 清理 ────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("🧹 清理测试数据")
print("=" * 60)

async def clean():
    async with AsyncSqliteStore.from_conn_string(db_path) as store:
        for mem in TEST_MEMORIES:
            await store.adelete(mem["namespace"], mem["key"])
            print(f"  ✅ 已删除: {mem['key']}")

asyncio.run(clean())
print("\n✅ 测试完成！")
