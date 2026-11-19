// Aeback starter workspace — four editable examples that demonstrate each tool.
import type { WorkspaceArtifact } from './types'

const updatedAt = '2026-11-18T09:00:00.000Z'
const legacyStarterDocument = '# 产品目标\n\n把常用的个人知识工具放在一个轻量工作台中。\n\n# 核心工具\n\n思维导图用于梳理结构，知识图谱从文章中提取节点和关系，智能文档与智能表格承载日常工作。'
const starterDocumentContent = `**AEBACK · PERSONAL KNOWLEDGE WORKSPACE**

# 让想法彼此连接

AEBACK 把思考、整理与记录放进一个清晰的个人工作台。用合适的工具表达内容，再把重要的知识留在自己的工作区。

> [!NOTE]
> 这是 AEBACK 的内置示例文档。你可以直接修改、复制或删除它。

## 四种工具，一处工作区

### 思维导图

把复杂主题拆成层次清楚的节点。自由移动节点，调整布局方向、颜色与连接方式。

### 知识图谱

导入文章后提取主题节点与关系。继续整理来源、概念和人物，让知识之间的连接一目了然。

### 智能文档

使用 Markdown 记录内容，借助标题大纲、提示块和代码块保持文档清晰。

### 智能表格

整理计划与资料，使用筛选、排序、公式和单元格格式完成日常管理。

## 本地优先

AEBACK 工作区保存在当前浏览器中。你可以随时导出 JSON 备份，再在需要时整理和恢复自己的资料。

---

*© 2026 AEBACK. 保留所有权利。*`

export const starterArtifacts: WorkspaceArtifact[] = [
  {
    id: 'map-learning',
    type: 'mindmap',
    title: '年度学习地图',
    updatedAt,
    nodes: [
      { id: 'map-root', text: '年度学习', parentId: null },
      { id: 'map-1', text: '阅读', parentId: 'map-root' },
      { id: 'map-2', text: '产品设计', parentId: 'map-root' },
      { id: 'map-3', text: '写作', parentId: 'map-root' },
      { id: 'map-4', text: '认知科学', parentId: 'map-1' },
      { id: 'map-5', text: '交互模式', parentId: 'map-2' },
      { id: 'map-6', text: '每周复盘', parentId: 'map-3' },
    ],
  },
  {
    id: 'graph-cognition',
    type: 'graph',
    title: '认知科学入门',
    updatedAt,
    rootId: 'graph-root',
    nodes: [
      { id: 'graph-root', text: '认知科学', kind: 'concept', description: '研究心智、信息处理与行为的跨学科领域。' },
      { id: 'graph-1', text: '注意力', kind: 'concept', description: '选择并持续处理部分信息的认知过程。' },
      { id: 'graph-2', text: '工作记忆', kind: 'concept', description: '短时保持和操作信息的有限容量系统。' },
      { id: 'graph-3', text: '长期记忆', kind: 'concept', description: '较长时间储存并可再次提取的信息。' },
      { id: 'graph-4', text: '认知负荷', kind: 'concept', description: '完成任务时工作记忆所承受的总加工需求。' },
      { id: 'graph-5', text: '间隔练习', kind: 'idea', description: '把学习分散到多个时间点，以促进长期记忆。' },
      { id: 'graph-6', text: '主动回忆', kind: 'idea', description: '不看答案尝试提取信息，帮助强化记忆。' },
    ],
    edges: [
      { id: 'edge-1', fromId: 'graph-root', toId: 'graph-1', label: '研究', directed: true },
      { id: 'edge-2', fromId: 'graph-root', toId: 'graph-2', label: '包含', directed: true },
      { id: 'edge-3', fromId: 'graph-root', toId: 'graph-3', label: '包含', directed: true },
      { id: 'edge-4', fromId: 'graph-2', toId: 'graph-4', label: '受影响于', directed: true },
      { id: 'edge-5', fromId: 'graph-3', toId: 'graph-5', label: '强化', directed: true },
      { id: 'edge-6', fromId: 'graph-3', toId: 'graph-6', label: '提取方式', directed: true },
    ],
    sourceText: '',
  },
  {
    id: 'doc-aeback',
    type: 'document',
    title: 'AEBACK 产品手册',
    updatedAt,
    content: starterDocumentContent,
  },
  {
    id: 'table-reading',
    type: 'table',
    title: '阅读计划',
    updatedAt,
    columns: ['书名', '主题', '进度', '评分'],
    columnTypes: ['text', 'text', 'text', 'number'],
    rows: [
      ['卡片笔记写作法', '写作', '完成', '5'],
      ['深度工作', '注意力', '阅读中', ''],
      ['设计中的设计', '产品设计', '待读', ''],
    ],
  },
]

// Upgrade only the untouched built-in example; preserve documents edited by the user.
export function refreshStarterExample(artifacts: WorkspaceArtifact[]): WorkspaceArtifact[] {
  const starter = starterArtifacts.find((artifact) => artifact.id === 'doc-aeback' && artifact.type === 'document')
  if (!starter || starter.type !== 'document') return artifacts
  let changed = false
  const refreshed = artifacts.map((artifact) => {
    if (artifact.id !== 'doc-aeback' || artifact.type !== 'document' || artifact.title !== 'AEBACK 产品方向' || artifact.content !== legacyStarterDocument) return artifact
    changed = true
    return { ...starter, updatedAt: new Date().toISOString() }
  })
  return changed ? refreshed : artifacts
}
