# 🦌 DeerFlow 内置技能完整指南

> 本文档详细介绍了 DeerFlow 的所有内置技能（Skills），包括功能说明、使用场景、触发方式和实用技巧。
> 内置技能位于 `skills/public/` 目录，每个技能是一个独立的 `.skill` 包，可通过 Agent 自动加载或手动安装。

---

## 目录

1. [学术论文评审 (academic-paper-review)](#1-学术论文评审-academic-paper-review)
2. [引导与初始化 (bootstrap)](#2-引导与初始化-bootstrap)
3. [图表可视化 (chart-visualization)](#3-图表可视化-chart-visualization)
4. [Claude ↔ DeerFlow 互操作 (claude-to-deerflow)](#4-claude--deerflow-互操作-claude-to-deerflow)
5. [代码文档生成 (code-documentation)](#5-代码文档生成-code-documentation)
6. [咨询分析报告 (consulting-analysis)](#6-咨询分析报告-consulting-analysis)
7. [数据分析 (data-analysis)](#7-数据分析-data-analysis)
8. [深度研究 (deep-research)](#8-深度研究-deep-research)
9. [技能发现 (find-skills)](#9-技能发现-find-skills)
10. [前端界面设计 (frontend-design)](#10-前端界面设计-frontend-design)
11. [GitHub 深度研究 (github-deep-research)](#11-github-深度研究-github-deep-research)
12. [图片生成 (image-generation)](#12-图片生成-image-generation)
13. [新闻通讯生成 (newsletter-generation)](#13-新闻通讯生成-newsletter-generation)
14. [播客生成 (podcast-generation)](#14-播客生成-podcast-generation)
15. [PPT 生成 (ppt-generation)](#15-ppt-生成-ppt-generation)
16. [技能创建器 (skill-creator)](#16-技能创建器-skill-creator)
17. [惊喜展示 (surprise-me)](#17-惊喜展示-surprise-me)
18. [系统性文献综述 (systematic-literature-review)](#18-系统性文献综述-systematic-literature-review)
19. [Vercel 部署 (vercel-deploy-claimable)](#19-vercel-部署-vercel-deploy-claimable)
20. [视频生成 (video-generation)](#20-视频生成-video-generation)
21. [Web 设计规范检查 (web-design-guidelines)](#21-web-设计规范检查-web-design-guidelines)

---

## 1. 学术论文评审 (academic-paper-review)

### 功能描述
对学术论文、研究文章、预印本进行结构化、同行评议级别的分析评审。遵循 NeurIPS、ICML、ACL、Nature、IEEE 等顶级期刊/会议的评审标准。

### 适用场景
- 审阅论文：提供 URL（arXiv、DOI）、上传 PDF
- 请求 "review this paper"、"analyze this research"、"write a peer review"
- 需要方法论评估、贡献评价、文献定位分析

### 核心能力
| 能力 | 说明 |
|------|------|
| **结构化评审** | 摘要、优势、劣势、方法论评估、贡献评价 |
| **文献定位** | 通过定向文献搜索将论文定位到更广泛的研究图景中 |
| **方法论评估** | 实验设计、统计有效性、可复现性评估 |
| **多格式输出** | 详细评审 + 简洁执行摘要两种格式 |
| **跨学科支持** | 计算机科学、生物学、物理学、社会科学等 |

### 使用技巧 💡
- 提供 PDF URL 比上传文件效果更好（Agent 可以直接分析）
- 可以要求 "评审这篇论文，重点看方法论" 缩小评估范围
- 也可以要求对比多篇论文："帮我比较这两篇论文的贡献"

---

## 2. 引导与初始化 (bootstrap)

### 功能描述
帮助新用户快速了解 DeerFlow 的能力边界，并在用户的 SOUL.md 文件中记录个性化的助手配置偏好。相当于 DeerFlow 的"新手引导"技能。

### 适用场景
- 首次使用 DeerFlow 时引导对话
- 用户想设置助手偏好：语言、风格、专业领域
- 需要了解 DeerFlow 能做什么

### 核心能力
- 引导用户完成初始配置
- 在 SOUL 文件中记录用户偏好（语言、响应风格、专业领域等）
- 展示 DeerFlow 的能力目录

### 使用技巧 💡
- 首次使用时会询问一系列配置问题，完成后会自动存入 SOUL.md
- 可以随时要求 "重新引导我" 来修改初始配置

---

## 3. 图表可视化 (chart-visualization)

### 功能描述
将数据智能地转换为可视化图表。从 26 种图表类型中自动选择最合适的一种，生成 JavaScript 渲染的图表图片。

### 适用场景
- "可视化这些数据"、"画个图表"、"展示数据趋势"
- 需要柱状图、折线图、饼图、散点图等
- 数据分析和展示

### 支持的图表类型（26 种）
| 图表类型 | 说明 |
|---------|------|
| 柱状图 (Bar) | 分类数据对比 |
| 折线图 (Line) | 趋势展示 |
| 饼图 (Pie/Doughnut) | 占比展示 |
| 散点图 (Scatter) | 相关性分析 |
| 面积图 (Area) | 累积趋势 |
| 箱线图 (Boxplot) | 数据分布 |
| 雷达图 (Radar) | 多维度对比 |
| 热力图 (Heatmap) | 矩阵数据 |
| 漏斗图 (Funnel) | 转化率分析 |
| 桑基图 (Sankey) | 流量/路径分析 |
| 鱼骨图 (Fishbone) | 因果分析 |
| 流程图 (Flow) | 流程展示 |
| 地图 (Map) | 地理数据 |
| 旭日图 (Sunburst) | 层级占比 |
| 树图 (Treemap) | 嵌套占比 |
| 词云 (Wordcloud) | 文本频率 |
| ... 及更多 | |

### 使用技巧 💡
- 提供结构化数据（CSV、JSON、表格）而不是描述性文字，图表会更精确
- 可以指定图表类型："画一个柱状图对比各季度销售额"
- 图表会自动渲染为图片，可直接在对话中查看

---

## 4. Claude ↔ DeerFlow 互操作 (claude-to-deerflow)

### 功能描述
通过 HTTP API 与 DeerFlow AI Agent 平台交互。允许 Claude 或其他 Agent 调用 DeerFlow 进行深度研究、分析，并将结果带回当前对话。

### 适用场景
- 当前对话中需要 DeerFlow 的深度研究能力
- 想向 DeerFlow 发送消息/问题进行研究分析
- 启动 DeerFlow 对话线程
- 检查 DeerFlow 状态/健康
- 列出 DeerFlow 中可用的模型/技能/智能体
- 管理 DeerFlow 记忆
- 上传文件到 DeerFlow 线程
- 将复杂的研究任务委托给 DeerFlow

### 核心能力
- 创建和管理 DeerFlow 对话线程
- 发送消息并获取回复
- 查询模型、技能、智能体列表
- 管理记忆系统
- 文件上传

### 使用技巧 💡
- 这是 Claude Code 与 DeerFlow 之间的桥梁，适合在复杂任务中分工协作
- Claude 负责编码和逻辑推理，DeerFlow 负责深度研究和信息检索

---

## 5. 代码文档生成 (code-documentation)

### 功能描述
为代码、API、库、仓库或软件项目生成/创建/改进文档。遵循行业标准的文档最佳实践。

### 适用场景
- "document this code"、"create a README"、"generate API docs"
- "write developer guide"、"add comments to this code"
- 分析代码库以生成文档

### 核心能力
| 文档类型 | 说明 |
|---------|------|
| **README 生成** | 项目简介、安装、使用、贡献指南 |
| **API 参考文档** | 端点、参数、返回值、示例 |
| **行内代码注释** | 函数/类/模块的 JSDoc、Docstring |
| **架构文档** | 系统架构图、模块依赖、数据流 |
| **变更日志** | CHANGELOG 生成 |
| **开发者指南** | 搭建、配置、测试、部署指南 |

### 使用技巧 💡
- 上传整个代码仓库或关键文件，效果更好
- 可以指定文档风格："生成中文 README"、"用 JSDoc 格式"
- 支持增量更新："给这个新函数添加文档"

---

## 6. 咨询分析报告 (consulting-analysis)

### 功能描述
生成专业级的研究报告，包括市场分析、消费者洞察、品牌分析、财务分析、行业研究、竞争情报、投资尽职调查等咨询级分析报告。

### 两阶段工作模式
1. **框架阶段**：生成结构化分析框架（章节骨架 + 数据需求 + 分析逻辑）
2. **报告阶段**：在其他技能完成数据收集后，生成最终咨询级报告（结构化叙述 + 嵌入式图表 + 战略洞察）

### 适用场景
- 需要专业的行业研究报告
- 市场竞争分析
- 品牌策略分析
- 投资尽职调查
- 财务分析报告

### 使用技巧 💡
- 第一阶段生成的框架可以让你审核后再进行数据收集
- 配合 deep-research 技能使用效果最佳
- 可以指定报告格式："生成 PPT ready 的 McKinsey 风格报告"

---

## 7. 数据分析 (data-analysis)

### 功能描述
对 Excel（.xlsx/.xls）或 CSV 文件进行数据分析，生成统计、汇总、透视表、SQL 查询或任何形式的结构化数据探索。

### 适用场景
- 用户上传 Excel/CSV 文件进行分析
- 需要数据统计、汇总、透视表
- 数据清洗和转换
- 多表关联查询

### 核心能力
| 功能 | 说明 |
|------|------|
| **多 Sheet 支持** | 处理 Excel 多工作表 |
| **数据聚合** | 分组统计、汇总计算 |
| **数据过滤** | 条件筛选、排序 |
| **数据透视** | 透视表生成 |
| **数据连接** | 多表 JOIN 查询 |
| **格式导出** | CSV / JSON / Markdown |
| **SQL 查询** | 对结构化数据执行 SQL |

### 使用技巧 💡
- 上传文件后可以直接问："这个月的销售额趋势如何？"
- 可以要求导出结果为 CSV："把结果导出为 CSV"
- 大文件可能会慢，建议先上传再分析

---

## 8. 深度研究 (deep-research)

### 功能描述
对任何需要网络研究的问题进行系统性的多角度深度研究。相比于单次 Web 搜索，提供更全面、深入的研究结果。

### 适用场景
- ⚠️ **替代所有 WebSearch**：任何需要联网信息的问题
- "what is X"、"explain X"、"compare X and Y"、"research X"
- 在内容生成任务之前自动触发
- 需要多角度、多信源的信息收集

### 核心能力
- **多轮搜索**：自动进行多轮搜索以获取全面信息
- **多角度分析**：从不同角度研究问题
- **交叉验证**：多个信源交叉验证信息
- **结构化输出**：组织成条理清晰的研究报告

### 使用技巧 💡
- **这是最常用的技能**——任何需要查找信息的问题都应该触发它
- 研究范围可以指定："深度研究 AI 芯片市场，重点看 NVIDIA 和华为"
- 结果比单次搜索质量高得多，但耗时也更长

---

## 9. 技能发现 (find-skills)

### 功能描述
帮助用户发现和安装 Agent 技能。当用户询问 "how do I do X"、"find a skill for X" 或想扩展能力时触发。

### 适用场景
- "how do I do X"（X 可能有对应的技能）
- "find a skill for X"、"is there a skill for X"
- "can you do X"（X 是某种特殊能力）
- 用户想扩展 Agent 能力
- 想搜索工具、模板或工作流

### 使用技巧 💡
- 在想做某事但 Agent 不会时，先试试 "find a skill for ..."
- 技能安装后即可使用，无需重启

---

## 10. 前端界面设计 (frontend-design)

### 功能描述
创建具有高设计质量的、独特的生产级前端界面。避免通用的 AI 审美风格，生成创意性和精良的 UI 代码。

### 适用场景
- 构建 Web 组件、页面、制品、海报或应用
- 网站、落地页、仪表板、React 组件
- HTML/CSS 布局设计
- 美化任何 Web UI

### 特点
- 生成创意的、精良的代码和 UI 设计
- 避免通用的 AI 审美（不生成千篇一律的设计）
- 支持现代前端框架和样式

### 使用技巧 💡
- 提供参考风格或竞品链接："设计一个类似 Notion 的仪表板"
- 可以迭代优化："导航栏改到左侧"、"颜色换成深色模式"
- 生成的是可直接运行的 HTML/CSS/JS 代码

---

## 11. GitHub 深度研究 (github-deep-research)

### 功能描述
对任何 GitHub 仓库进行多轮深度研究。生成包含执行摘要、时间线、指标分析和 Mermaid 图表的结构化 Markdown 报告。

### 适用场景
- 用户提供 GitHub 仓库 URL
- 需要全面的仓库分析、时间线重建、竞争分析
- 深度调查开源项目

### 核心能力
| 特性 | 说明 |
|------|------|
| **执行摘要** | 仓库概览和关键发现 |
| **时间线分析** | 提交历史、发布节奏、里程碑 |
| **指标分析** | Stars、Forks、贡献者、活跃度 |
| **代码质量** | 语言分布、代码结构 |
| **竞争分析** | 同类项目对比 |
| **Mermaid 图表** | 可视化项目结构和发展趋势 |

### 使用技巧 💡
- 直接提供 GitHub URL 即可触发
- 可以指定分析维度："重点分析贡献者活跃度"
- 对比多个仓库："对比 React 和 Vue 的发展"

---

## 12. 图片生成 (image-generation)

### 功能描述
生成、创建、想象图片，包括角色、场景、产品等视觉内容。支持结构化提示词和参考图片引导生成。

### 适用场景
- "generate an image of..."、"create a picture of..."
- 需要产品图、场景图、角色设计
- 视觉创意和概念设计

### 核心能力
- 结构化提示词生成（优化后的 prompt）
- 参考图片风格迁移
- 多风格支持（写实、卡通、水彩等）

### 使用技巧 💡
- 提示词越具体越好："一只坐在太空飞船里的橘猫，赛博朋克风格"
- 可以提供参考图片："按照这张图的风格生成"
- 生成后可以要求调整："改成暗色调"、"把猫换成人"

---

## 13. 新闻通讯生成 (newsletter-generation)

### 功能描述
生成新闻通讯、邮件摘要、每周汇总、行业简报或策划内容摘要。支持话题研究、多源内容策划和专业格式化。

### 适用场景
- "create a newsletter about X"
- "write a weekly digest"
- "generate a tech roundup"
- "curate news about Y"

### 核心能力
- 话题研究：自动搜索和收集相关话题的内容
- 内容策划：从多个来源甄选和整理
- 专业格式：为邮件或 Web 分发进行格式化
- 定期更新支持

### 使用技巧 💡
- 指定目标受众可以帮助调整语气："写给 CTO 的技术简报"
- 可以设定期望的篇幅："5 个要点，每个 100 字"
- 配合 deep-research 使用可以获得最新资讯

---

## 14. 播客生成 (podcast-generation)

### 功能描述
将文本内容转换为双人对话形式的播客音频。生成自然的双主持人对话风格。

### 适用场景
- "turn this article into a podcast"
- "create a podcast about this topic"
- 将长文内容转化为听觉体验

### 核心能力
- 文本 → 播客对话脚本转换
- 双主持人自然对话风格
- 音频文件生成

### 使用技巧 💡
- 先让 deep-research 生成研究内容，再转成播客
- 可以指定主持人风格："一个严肃一个幽默"、"像科技早报"
- 生成的是音频文件，可以直接下载收听

---

## 15. PPT 生成 (ppt-generation)

### 功能描述
从文本内容生成 PowerPoint（PPT/PPTX）演示文稿。为每张幻灯片生成图片并组合成 PPT 文件。

### 适用场景
- "generate a presentation about X"
- "turn this research into slides"
- "create a PPT for this topic"
- 需要专业的演示文稿

### 核心能力
- 自动生成幻灯片结构
- 每页幻灯片配图
- 专业的排版和设计
- PPTX 文件导出

### 使用技巧 💡
- 先收集内容（使用 deep-research），再生成 PPT："用这些研究内容做 10 页 PPT"
- 可以指定风格："投资风格"、"学术会议风格"、"创业路演风格"
- 生成的是可下载的 PPTX 文件

---

## 16. 技能创建器 (skill-creator)

### 功能描述
创建新技能、修改和优化已有技能，以及评估技能性能。DeerFlow 的"元技能"——用于创建和管理其他技能。

### 适用场景
- 想从零创建自定义技能
- 编辑或优化已有技能
- 运行评估测试技能性能
- 通过方差分析基准测试技能
- 优化技能描述以提高触发准确率

### 核心能力
| 功能 | 说明 |
|------|------|
| **创建技能** | 从零创建自定义 .skill 包 |
| **编辑技能** | 修改已有技能的配置和逻辑 |
| **评估技能** | 运行 eval 集测试技能表现 |
| **基准测试** | 带方差分析的性能基准测试 |
| **描述优化** | 改进触发描述以提高调用准确率 |

### 使用技巧 💡
- 这是 DeerFlow 最强大的技能之一——可以创建你自己的专属技能
- 创建一个好的技能 = 好的 description（触发）+ 清晰的步骤（逻辑）
- 创建后可以用 eval 测试，确保可靠触发

---

## 17. 惊喜展示 (surprise-me)

### 功能描述
通过动态发现和创造性组合其他已启用的技能，为用户创造令人愉悦的、意想不到的"哇"体验。

### 适用场景
- 用户说 "surprise me"
- "show me something interesting"
- "I'm bored, do something creative"
- 用户想要创意展示

### 核心能力
- 动态发现当前可用的技能
- 创造性组合多个技能
- 生成意想不到的创意输出

### 使用技巧 💡
- 纯娱乐性质，适合展示 DeerFlow 的创意能力
- 配合多个已安装的技能使用效果更好

---

## 18. 系统性文献综述 (systematic-literature-review)

### 功能描述
对某个主题跨多篇学术论文进行系统性文献综述、调查或综合。包括带注释的参考书目和跨论文比较。

### 适用场景
- **不适合单篇论文**（单篇请用 academic-paper-review）
- 需要一个主题的系统性文献综述
- annotated bibliographies（带注释的参考书目）
- 跨论文比较和分析
- 需要 APA、IEEE 或 BibTeX 格式输出

### 核心能力
- 在 arXiv 上搜索相关论文
- 多论文综合分析和比较
- APA / IEEE / BibTeX 多种引用格式输出
- 结构化综述报告

### 使用技巧 💡
- 与 academic-paper-review 的区别：这个是综述多篇论文，那个是深入评审单篇
- 可以指定搜索范围："最近 3 年的 transformer 架构改进"
- 输出格式可选 APA、IEEE 或 BibTeX

---

## 19. Vercel 部署 (vercel-deploy-claimable)

### 功能描述
将应用和网站部署到 Vercel。无需认证——返回预览 URL 和可认领的部署链接。

### 适用场景
- "Deploy my app"
- "Deploy this to production"
- "Create a preview deployment"
- "Deploy and give me the link"
- "Push this live"

### 核心能力
- 自动部署到 Vercel
- 生成预览 URL
- 生成可认领的部署链接（claimable link）
- ⚠️ 无需 Vercel 认证，谁都可以认领

### 使用技巧 💡
- 适合快速分享和预览前端项目
- 部署后生成的 claimable link 要尽快认领，防止他人认领
- 适合演示和测试环境

---

## 20. 视频生成 (video-generation)

### 功能描述
生成、创建或想象视频内容。支持结构化提示词和参考图片引导生成。

### 适用场景
- "generate a video about..."
- "create a short video of..."
- 需要短视频、动画或视觉内容

### 核心能力
- 结构化提示词生成
- 参考图片风格迁移
- 多种视频风格支持

### 使用技巧 💡
- 提示词策略与图片生成类似，越具体越好
- 可以提供参考图片："按照这张图的风格生成短视频"

---

## 21. Web 设计规范检查 (web-design-guidelines)

### 功能描述
审查 UI 代码是否符合 Web 界面设计规范。检查可访问性、设计一致性、用户体验最佳实践。

### 适用场景
- "review my UI"
- "check accessibility"
- "audit design" / "review UX"
- "check my site against best practices"

### 核心能力
| 检查项 | 说明 |
|--------|------|
| **可访问性** | WCAG 规范检查 |
| **设计一致性** | 颜色、字体、间距统一性 |
| **UX 最佳实践** | 用户体验规范和模式 |
| **响应式** | 多端适配检查 |
| **性能** | 加载性能建议 |

### 使用技巧 💡
- 提供代码或 URL 都可以审查
- 可以指定检查重点："主要检查可访问性"
- 审查后会提供具体的修复建议

---

## 如何安装和启用技能

### 在对话中触发
Agent 会根据你的问题自动判断是否需要加载技能。例如问 "分析这个数据" 会自动触发 `data-analysis` 或 `chart-visualization`。

### 手动安装
1. 在对话中说 "find a skill for [你想做的事]"
2. Agent 会搜索并推荐合适的技能
3. 确认安装即可

### 配置文件启用
在 `config.yaml` 中配置技能目录：
```yaml
skills:
  directories:
    - ./skills/public
```

---

## 技能选择速查表

| 你的需求 | 对应的技能 |
|---------|-----------|
| 查信息/做研究 | `deep-research` |
| 分析 Excel/CSV | `data-analysis` |
| 可视化数据 | `chart-visualization` |
| 审阅一篇论文 | `academic-paper-review` |
| 综述多篇论文 | `systematic-literature-review` |
| 做商业分析报告 | `consulting-analysis` |
| 写代码文档 | `code-documentation` |
| 设计前端 UI | `frontend-design` |
| 分析 GitHub 项目 | `github-deep-research` |
| 生成图片 | `image-generation` |
| 生成视频 | `video-generation` |
| 生成 PPT | `ppt-generation` |
| 生成播客 | `podcast-generation` |
| 生成新闻通讯 | `newsletter-generation` |
| 部署到 Vercel | `vercel-deploy-claimable` |
| 检查 UI 规范 | `web-design-guidelines` |
| 创建自定义技能 | `skill-creator` |
| 探索 DeerFlow 能力 | `bootstrap` |
| 找更多技能 | `find-skills` |
| 想要惊喜 | `surprise-me` |
| Claude ↔ DeerFlow 协作 | `claude-to-deerflow` |

---

> 📝 本文档自动生成于 2026-05-14，技能版本对应 DeerFlow 2.0。
> 技能文件位于 `skills/public/` 目录，每个技能包含 SKILL.md（逻辑定义）和可选的 scripts/（脚本）、references/（参考）、templates/（模板）子目录。
