// Aeback knowledge graph exports — portable graph projects and relationship reports.
import type { GraphArtifact, KnowledgeEdge, KnowledgeNode, KnowledgeNodeKind, NodeColor } from '../types'

export type GraphExportPosition = { x: number; y: number }

const MAX_PROJECT_BYTES = 4 * 1024 * 1024
const MAX_NODES = 10_000
const MAX_EDGES = 30_000
const colors: Record<NodeColor, { fill: string; stroke: string }> = {
  blue: { fill: '#b7c2ff', stroke: '#7589eb' },
  violet: { fill: '#d4b7ff', stroke: '#a879da' },
  green: { fill: '#a9e1c4', stroke: '#68b88c' },
  amber: { fill: '#ffd985', stroke: '#d6a84d' },
  coral: { fill: '#ffb9ae', stroke: '#d87e72' },
  slate: { fill: '#c2ccdc', stroke: '#8996aa' },
}
const colorNames = Object.keys(colors) as NodeColor[]
const kindLabels: Record<KnowledgeNodeKind, string> = {
  concept: '概念', person: '人物', project: '项目', book: '书籍', idea: '想法', article: '文章',
}
const kindNames = Object.keys(kindLabels) as KnowledgeNodeKind[]

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character] ?? character)
}

function escapeMarkdown(value: string) {
  return value.replace(/[\\`*_{}\[\]()#+.!|>-]/g, '\\$&').replace(/\r?\n/g, '<br>')
}

function colorFor(node: KnowledgeNode, rootId: string, index: number): NodeColor {
  if (node.color) return node.color
  if (node.id === rootId) return 'green'
  const palette: NodeColor[] = ['blue', 'violet', 'green', 'amber', 'coral', 'slate']
  return palette[index % palette.length]
}

function kindFor(node: KnowledgeNode, rootId: string): KnowledgeNodeKind {
  return node.kind ?? (node.id === rootId ? 'concept' : 'idea')
}

function halfSize(node: KnowledgeNode, rootId: string, depths: Map<string, number>) {
  return node.id === rootId ? 64 : 64 / (1 + 0.075 * Math.max(1, depths.get(node.id) ?? 1))
}

function nodeLabel(text: string, radius: number, fontSize: number) {
  const limit = Math.max(3, Math.floor(radius * 1.75 / fontSize))
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text
}

export function createGraphSvg(artifact: GraphArtifact, positions: Map<string, GraphExportPosition>, depths: Map<string, number>) {
  const root = artifact.nodes.find((node) => node.id === artifact.rootId) ?? artifact.nodes[0]
  if (!root) throw new Error('知识图谱没有可导出的节点。')
  const bounds = artifact.nodes.reduce((current, node) => {
    const point = positions.get(node.id) ?? { x: 0, y: 0 }
    const radius = halfSize(node, root.id, depths)
    return {
      minX: Math.min(current.minX, point.x - radius), minY: Math.min(current.minY, point.y - radius),
      maxX: Math.max(current.maxX, point.x + radius), maxY: Math.max(current.maxY, point.y + radius),
    }
  }, { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY })
  const padding = 58
  const width = Math.ceil(bounds.maxX - bounds.minX + padding * 2)
  const height = Math.ceil(bounds.maxY - bounds.minY + padding * 2)
  const toX = (x: number) => x - bounds.minX + padding
  const toY = (y: number) => y - bounds.minY + padding
  const nodeById = new Map(artifact.nodes.map((node) => [node.id, node] as const))
  const edges = artifact.edges.map((edge, index) => {
    const fromNode = nodeById.get(edge.fromId)
    const toNode = nodeById.get(edge.toId)
    const from = positions.get(edge.fromId)
    const to = positions.get(edge.toId)
    if (!fromNode || !toNode || !from || !to) return ''
    const dx = to.x - from.x
    const dy = to.y - from.y
    const length = Math.max(1, Math.hypot(dx, dy))
    const fromRadius = halfSize(fromNode, root.id, depths)
    const toRadius = halfSize(toNode, root.id, depths)
    const start = { x: from.x + dx / length * fromRadius, y: from.y + dy / length * fromRadius }
    const end = { x: to.x - dx / length * toRadius, y: to.y - dy / length * toRadius }
    const edgeDx = end.x - start.x
    const edgeDy = end.y - start.y
    const midpointX = (start.x + end.x) / 2
    const midpointY = (start.y + end.y) / 2
    const horizontal = Math.abs(edgeDx) >= Math.abs(edgeDy)
    const path = artifact.connectionStyle === 'orthogonal'
      ? horizontal ? `M ${toX(start.x)} ${toY(start.y)} L ${toX(midpointX)} ${toY(start.y)} L ${toX(midpointX)} ${toY(end.y)} L ${toX(end.x)} ${toY(end.y)}` : `M ${toX(start.x)} ${toY(start.y)} L ${toX(start.x)} ${toY(midpointY)} L ${toX(end.x)} ${toY(midpointY)} L ${toX(end.x)} ${toY(end.y)}`
      : `M ${toX(start.x)} ${toY(start.y)} Q ${toX(midpointX - edgeDy * .12)} ${toY(midpointY + edgeDx * .12)} ${toX(end.x)} ${toY(end.y)}`
    const label = escapeXml(edge.label ?? '相关')
    const labelY = toY(midpointY - 7 - (index % 2) * 4)
    return `<g><path d="${path}" fill="none" stroke="#cbd2da" stroke-width="1.6"${edge.directed ? ' marker-end="url(#aeback-graph-arrow)"' : ''}/><text x="${toX(midpointX)}" y="${labelY}" text-anchor="middle" fill="#68717e" stroke="#ffffff" stroke-width="4" paint-order="stroke" font-family="Inter, Microsoft YaHei, sans-serif" font-size="10">${label}</text></g>`
  }).join('\n')
  const nodes = artifact.nodes.map((node, index) => {
    const point = positions.get(node.id) ?? { x: 0, y: 0 }
    const radius = halfSize(node, root.id, depths)
    const color = colors[colorFor(node, root.id, index)]
    const opacity = Math.max(0, Math.min(100, node.opacity ?? 100)) / 100
    const kind = kindLabels[kindFor(node, root.id)]
    const titleFontSize = Math.max(7, 12 * radius / 64)
    const kindFontSize = Math.max(6, 9 * radius / 64)
    const description = node.description ? `<desc>${escapeXml(node.description)}</desc>` : ''
    return `<g><title>${escapeXml(node.text)}</title>${description}<circle cx="${toX(point.x)}" cy="${toY(point.y)}" r="${radius}" fill="${color.fill}" fill-opacity="${opacity}" stroke="${color.stroke}" stroke-width="1.5"/><text x="${toX(point.x)}" y="${toY(point.y) - 2}" text-anchor="middle" fill="#303846" font-family="Inter, Microsoft YaHei, sans-serif" font-size="${titleFontSize}" font-weight="620">${escapeXml(nodeLabel(node.text, radius, titleFontSize))}</text><text x="${toX(point.x)}" y="${toY(point.y) + titleFontSize * 1.42}" text-anchor="middle" fill="#424957" font-family="Inter, Microsoft YaHei, sans-serif" font-size="${kindFontSize}" font-weight="570">${kind}</text></g>`
  }).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- AEBACK knowledge graph export -->\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description"><title id="title">${escapeXml(artifact.title)} · AEBACK</title><desc id="description">AEBACK knowledge graph with ${artifact.nodes.length} nodes and ${artifact.edges.length} relationships.</desc><defs><marker id="aeback-graph-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 1 L 9 5 L 0 9 z" fill="#8993a2"/></marker></defs><rect width="100%" height="100%" fill="#ffffff"/><g>${edges}\n${nodes}</g><text x="${width - padding}" y="${height - 18}" text-anchor="end" fill="#9aa1ac" font-family="Inter, Microsoft YaHei, sans-serif" font-size="10" letter-spacing="1.5">AEBACK</text></svg>`
}

export function createGraphProject(artifact: GraphArtifact) {
  return JSON.stringify({ brand: 'AEBACK', format: 'aeback/knowledge-graph', version: 1, exportedAt: new Date().toISOString(), artifact }, null, 2)
}

export function createGraphReport(artifact: GraphArtifact) {
  const nodeById = new Map(artifact.nodes.map((node) => [node.id, node] as const))
  const lines = ['<!-- AEBACK knowledge graph report -->', `# ${escapeMarkdown(artifact.title)}`, '', '## 节点']
  artifact.nodes.forEach((node) => {
    lines.push(`- **${escapeMarkdown(node.text)}**（${kindLabels[kindFor(node, artifact.rootId)]}）`)
    if (node.description) lines.push(`  - 说明：${escapeMarkdown(node.description)}`)
    if (node.source) lines.push(`  - 来源摘录：${escapeMarkdown(node.source)}`)
  })
  lines.push('', '## 关系')
  artifact.edges.forEach((edge) => {
    const from = nodeById.get(edge.fromId)?.text ?? edge.fromId
    const to = nodeById.get(edge.toId)?.text ?? edge.toId
    const arrow = edge.directed ? '→' : '↔'
    lines.push(`- ${escapeMarkdown(from)} ${arrow}（${escapeMarkdown(edge.label ?? '相关')}）${escapeMarkdown(to)}`)
  })
  if (artifact.sourceText) lines.push('', '## 导入原文', '', '```text', artifact.sourceText.replace(/```/g, '`\u200b``'), '```')
  return `${lines.join('\n')}\n`
}

export function parseGraphProject(value: unknown): GraphArtifact {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('文件内容不是有效的 AEBACK 工程。')
  const project = value as Record<string, unknown>
  if (project.brand !== 'AEBACK' || project.format !== 'aeback/knowledge-graph' || project.version !== 1) throw new Error('不支持此工程格式或版本。')
  if (!project.artifact || typeof project.artifact !== 'object' || Array.isArray(project.artifact)) throw new Error('工程文件缺少知识图谱数据。')
  const source = project.artifact as Record<string, unknown>
  if (source.type !== 'graph' || typeof source.id !== 'string' || typeof source.title !== 'string' || typeof source.rootId !== 'string' || !Array.isArray(source.nodes) || !Array.isArray(source.edges)) throw new Error('工程文件的知识图谱数据无效。')
  if (source.nodes.length < 1 || source.nodes.length > MAX_NODES || source.edges.length > MAX_EDGES) throw new Error(`工程最多支持 ${MAX_NODES.toLocaleString()} 个节点和 ${MAX_EDGES.toLocaleString()} 条关系。`)

  const nodes: KnowledgeNode[] = []
  const ids = new Set<string>()
  for (const entry of source.nodes) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('工程内包含无效节点。')
    const node = entry as Record<string, unknown>
    if (typeof node.id !== 'string' || !node.id || node.id.length > 200 || ids.has(node.id) || typeof node.text !== 'string' || node.text.length > 4_000) throw new Error('工程内包含无效或重复的节点。')
    if (node.kind !== undefined && (typeof node.kind !== 'string' || !kindNames.includes(node.kind as KnowledgeNodeKind))) throw new Error('工程内包含不支持的节点类型。')
    if (node.color !== undefined && (typeof node.color !== 'string' || !colorNames.includes(node.color as NodeColor))) throw new Error('工程内包含不支持的节点颜色。')
    if (node.opacity !== undefined && (typeof node.opacity !== 'number' || !Number.isFinite(node.opacity) || node.opacity < 0 || node.opacity > 100)) throw new Error('工程内包含无效的透明度。')
    if ((node.x !== undefined && (typeof node.x !== 'number' || !Number.isFinite(node.x))) || (node.y !== undefined && (typeof node.y !== 'number' || !Number.isFinite(node.y)))) throw new Error('工程内包含无效的节点坐标。')
    if ((node.description !== undefined && (typeof node.description !== 'string' || node.description.length > 100_000)) || (node.source !== undefined && (typeof node.source !== 'string' || node.source.length > 100_000))) throw new Error('工程内包含无效的节点资料。')
    ids.add(node.id)
    nodes.push(node as unknown as KnowledgeNode)
  }
  if (!ids.has(source.rootId)) throw new Error('工程中的中心节点不存在。')

  const edges: KnowledgeEdge[] = []
  const edgeIds = new Set<string>()
  for (const entry of source.edges) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('工程内包含无效关系。')
    const edge = entry as Record<string, unknown>
    if (typeof edge.id !== 'string' || !edge.id || edge.id.length > 200 || edgeIds.has(edge.id) || typeof edge.fromId !== 'string' || typeof edge.toId !== 'string' || !ids.has(edge.fromId) || !ids.has(edge.toId)) throw new Error('工程内包含无效或重复的关系。')
    if ((edge.label !== undefined && (typeof edge.label !== 'string' || edge.label.length > 500)) || (edge.directed !== undefined && typeof edge.directed !== 'boolean')) throw new Error('工程内包含无效的关系属性。')
    edgeIds.add(edge.id)
    edges.push(edge as unknown as KnowledgeEdge)
  }
  if (source.connectionStyle !== undefined && !['curve', 'orthogonal'].includes(String(source.connectionStyle))) throw new Error('工程内包含不支持的连线样式。')
  if (source.title.length > 240) throw new Error('工程标题无效。')
  if (source.sourceText !== undefined && (typeof source.sourceText !== 'string' || source.sourceText.length > MAX_PROJECT_BYTES)) throw new Error('工程内的原文长度无效。')
  return { ...source, type: 'graph', nodes, edges, updatedAt: new Date().toISOString() } as GraphArtifact
}

export function assertGraphProjectFileSize(file: File) {
  if (file.size > MAX_PROJECT_BYTES) throw new Error(`工程文件不能超过 ${MAX_PROJECT_BYTES / 1024 / 1024} MB。`)
}
