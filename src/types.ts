// Aeback workspace model shared by its mind map, graph, document, and table tools.
export type ToolType = 'mindmap' | 'graph' | 'document' | 'table'
export type WorkspaceView = 'library' | ToolType
export type MindMapDirection = 'radial' | 'right' | 'left' | 'down'
export type MindMapLineStyle = 'curve' | 'orthogonal'
export type GraphLineStyle = 'curve' | 'orthogonal'
export type NodeColor = 'blue' | 'violet' | 'green' | 'amber' | 'coral' | 'slate'

export type MindMapNode = {
  id: string
  text: string
  parentId: string | null
  x?: number
  y?: number
  color?: NodeColor
  opacity?: number
  collapsed?: boolean
}

export type KnowledgeNode = {
  id: string
  text: string
  source?: string
  description?: string
  kind?: KnowledgeNodeKind
  x?: number
  y?: number
  color?: NodeColor
  opacity?: number
}

export type KnowledgeNodeKind = 'concept' | 'person' | 'project' | 'book' | 'idea' | 'article'

export type KnowledgeEdge = {
  id: string
  fromId: string
  toId: string
  label?: string
  directed?: boolean
}

type ArtifactBase = {
  id: string
  title: string
  updatedAt: string
}

export type MindMapArtifact = ArtifactBase & {
  type: 'mindmap'
  nodes: MindMapNode[]
  direction?: MindMapDirection
  connectionStyle?: MindMapLineStyle
}

export type GraphArtifact = ArtifactBase & {
  type: 'graph'
  rootId: string
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
  connectionStyle?: GraphLineStyle
  sourceText?: string
}

export type DocumentArtifact = ArtifactBase & {
  type: 'document'
  content: string
}

export type TableArtifact = ArtifactBase & {
  type: 'table'
  columns: string[]
  rows: string[][]
  columnTypes?: TableColumnType[]
  columnWidths?: number[]
  columnSummaries?: TableSummaryType[]
  groupBy?: number
  rowHeight?: TableRowHeight
  cellColors?: Record<string, TableCellColor>
}

export type TableColumnType = 'text' | 'number' | 'date' | 'checkbox' | 'select' | 'image'
export type TableSummaryType = 'none' | 'count' | 'nonEmptyCount' | 'sum' | 'average' | 'min' | 'max'
export type TableRowHeight = 'compact' | 'normal' | 'comfortable'
export type TableCellColor = 'purple' | 'blue' | 'green' | 'yellow' | 'orange' | 'red'

export type WorkspaceArtifact = MindMapArtifact | GraphArtifact | DocumentArtifact | TableArtifact

export const TOOL_LABELS: Record<ToolType, string> = {
  mindmap: '思维导图',
  graph: '知识图谱',
  document: '智能文档',
  table: '智能表格',
}
