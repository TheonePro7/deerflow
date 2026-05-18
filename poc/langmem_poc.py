"""
LangMem PoC — test memory extraction and search with DeepSeek.
Does NOT modify any DeerFlow code. Uses a separate InMemoryStore.
"""
import json, os, uuid
from datetime import datetime, timezone

os.environ["DEEPSEEK_API_KEY"] = "sk-29624b839f89489791baad3d5c05f8e0"

from langgraph.store.memory import InMemoryStore
from langmem import create_memory_manager, create_manage_memory_tool

MODEL = "deepseek-v4-flash"
print(f"⚡ Using model: {MODEL}")
print()

# ── Step 1: Create a test store ──────────────────────────────────────────
store = InMemoryStore()
print("✅ InMemoryStore created")

# ── Step 2: Create memory manager ─────────────────────────────────────────
manager = create_memory_manager(
    MODEL,
    instructions="""从对话中提取关键信息，包括：
1. 用户偏好（语言、风格）
2. 工作领域和背景
3. 技术决策和理由
4. 项目需求和目标
对每条信息标记类型。如果对话太短或没有实质性信息，返回空列表。""",
)
print("✅ Memory manager created")

# ── Step 3: Create memory tool ────────────────────────────────────────────
memory_tool = create_manage_memory_tool(
    namespace=("memories", "{langgraph_user_id}"),
    store=store,
)
print(f"✅ Memory tool created: {memory_tool.name}")
print()

# ── Step 4: Run a test extraction ─────────────────────────────────────────
from langchain_core.messages import HumanMessage, AIMessage
from langmem.knowledge.extraction import MemoryState

test_conversations = [
    {
        "name": "对话1：项目介绍",
        "messages": [
            HumanMessage(content="你好，我是做AI教育的创业者，主要面向中小学生的AI编程培训。我们目前用Python和JavaScript做教学。"),
            AIMessage(content="了解了，AI编程教育是个很有前景的方向。中小学生的课程设计上，可视化编程和游戏化学习效果比较好。"),
            HumanMessage(content="对，我们目前在开发一个基于Web的在线编程平台，集成了AI辅助教学功能。"),
        ],
    },
    {
        "name": "对话2：技术选型",
        "messages": [
            HumanMessage(content="我在技术选型上比较纠结。后端目前在用FastAPI，但考虑要不要换到Node.js。前端用的是Next.js。"),
            AIMessage(content="FastAPI对于AI相关的项目其实很合适，特别是你本身就要调用各种AI API。性能上Python异步框架足够支撑教育平台的并发量。"),
            HumanMessage(content="有道理，那我就继续用FastAPI了。数据库方面呢？我现在用的PostgreSQL。"),
        ],
    },
]

for conv in test_conversations:
    print(f"\n{'='*60}")
    print(f"📝 {conv['name']}")
    print(f"{'='*60}")

    try:
        result = manager.invoke({
            "messages": conv["messages"],
            "max_steps": 1,
            "existing": [],
        })
        print(f"  Result type: {type(result).__name__}")
        if isinstance(result, list):
            for item in result:
                if hasattr(item, 'model_dump'):
                    print(f"  - {item.model_dump()}")
                else:
                    print(f"  - {item}")
        else:
            print(f"  {result}")
    except Exception as e:
        import traceback
        print(f"  ❌ Error: {e}")
        traceback.print_exc()

print()
print("✅ PoC complete!")
