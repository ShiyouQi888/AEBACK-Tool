// Aeback mind map exports — portable project, outline, SVG, PNG, and JPEG.
import type { MindMapArtifact, MindMapNode, NodeColor } from '../types'

export type MindMapExportPosition = { x: number; y: number; depth: number }

const MAX_PROJECT_BYTES = 4 * 1024 * 1024
const MAX_PROJECT_NODES = 10_000
const colors: Record<NodeColor, { fill: string; stroke: string; edge: string }> = {
  blue: { fill: '#b7c2ff', stroke: '#7589eb', edge: '#8797d5' },
  violet: { fill: '#d4b7ff', stroke: '#a879da', edge: '#ad8fc9' },
  green: { fill: '#a9e1c4', stroke: '#68b88c', edge: '#80b99c' },
  amber: { fill: '#ffd985', stroke: '#d6a84d', edge: '#c6a466' },
  coral: { fill: '#ffb9ae', stroke: '#d87e72', edge: '#c48b83' },
  slate: { fill: '#c2ccdc', stroke: '#8996aa', edge: '#9aa4b3' },
}
const colorNames = Object.keys(colors) as NodeColor[]

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character] ?? character)
}

function escapeMarkdown(value: string) {
  return value.replace(/[\\`*_{}\[\]()#+.!|>-]/g, '\\$&').replace(/\r?\n/g, '<br>')
}

function resolvedColor(node: MindMapNode, rootId: string, index: number): NodeColor {
  return node.color ?? (node.id === rootId ? 'blue' : colorNames[(index - 1 + colorNames.length) % colorNames.length])
}

function labelFor(node: MindMapNode, depth: number) {
  const limit = depth === 0 ? 12 : 10
  return node.text.length > limit ? `${node.text.slice(0, limit - 1)}…` : node.text
}

export function createMindMapSvg(artifact: MindMapArtifact, positions: Map<string, MindMapExportPosition>) {
  const root = artifact.nodes.find((node) => node.parentId === null) ?? artifact.nodes[0]
  if (!root) throw new Error('思维导图没有可导出的节点。')

  const nodeWidth = (depth: number) => depth === 0 ? 178 : 154
  const nodeHeight = (depth: number) => depth === 0 ? 64 : 54
  const bounds = artifact.nodes.reduce((current, node) => {
    const point = positions.get(node.id) ?? { x: 0, y: 0, depth: 1 }
    const width = nodeWidth(point.depth) / 2
    const height = nodeHeight(point.depth) / 2
    return {
      minX: Math.min(current.minX, point.x - width),
      minY: Math.min(current.minY, point.y - height),
      maxX: Math.max(current.maxX, point.x + width),
      maxY: Math.max(current.maxY, point.y + height),
    }
  }, { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY })
  const padding = 56
  const width = Math.ceil(bounds.maxX - bounds.minX + padding * 2)
  const height = Math.ceil(bounds.maxY - bounds.minY + padding * 2)
  const toX = (x: number) => x - bounds.minX + padding
  const toY = (y: number) => y - bounds.minY + padding
  const indexById = new Map(artifact.nodes.map((node, index) => [node.id, index] as const))
  const edges = artifact.nodes.filter((node) => node.parentId && positions.has(node.id) && positions.has(node.parentId)).map((node) => {
    const parent = artifact.nodes.find((item) => item.id === node.parentId)!
    const from = positions.get(parent.id)!
    const to = positions.get(node.id)!
    const fromX = toX(from.x)
    const fromY = toY(from.y)
    const toNodeX = toX(to.x)
    const toNodeY = toY(to.y)
    const dx = toNodeX - fromX
    const dy = toNodeY - fromY
    const midpointX = (fromX + toNodeX) / 2
    const midpointY = (fromY + toNodeY) / 2
    const horizontal = Math.abs(dx) >= Math.abs(dy)
    const controlX = horizontal ? midpointX : fromX
    const controlY = horizontal ? fromY : midpointY
    const path = artifact.connectionStyle === 'orthogonal'
      ? horizontal
        ? `M ${fromX} ${fromY} L ${midpointX} ${fromY} L ${midpointX} ${toNodeY} L ${toNodeX} ${toNodeY}`
        : `M ${fromX} ${fromY} L ${fromX} ${midpointY} L ${toNodeX} ${midpointY} L ${toNodeX} ${toNodeY}`
      : `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toNodeX} ${toNodeY}`
    const palette = colors[resolvedColor(node, root.id, indexById.get(node.id) ?? 0)]
    return `<path d="${path}" fill="none" stroke="${palette.edge}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`
  }).join('\n')
  const nodes = artifact.nodes.map((node) => {
    const point = positions.get(node.id) ?? { x: 0, y: 0, depth: 1 }
    const nodeW = nodeWidth(point.depth)
    const nodeH = nodeHeight(point.depth)
    const x = toX(point.x) - nodeW / 2
    const y = toY(point.y) - nodeH / 2
    const color = colors[resolvedColor(node, root.id, indexById.get(node.id) ?? 0)]
    const opacity = Math.max(0, Math.min(100, node.opacity ?? 100)) / 100
    return `<g><title>${escapeXml(node.text)}</title><rect x="${x}" y="${y}" width="${nodeW}" height="${nodeH}" rx="${point.depth === 0 ? 16 : 13}" fill="${color.fill}" fill-opacity="${opacity}" stroke="${color.stroke}" stroke-width="1.5"/><text x="${toX(point.x)}" y="${toY(point.y) + 4}" text-anchor="middle" fill="#303846" font-family="Inter, Microsoft YaHei, sans-serif" font-size="12" font-weight="570">${escapeXml(labelFor(node, point.depth))}</text></g>`
  }).join('\n')
  const brandY = height - 18
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- AEBACK mind map export -->\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description"><title id="title">${escapeXml(artifact.title)} · AEBACK</title><desc id="description">AEBACK mind map with ${artifact.nodes.length} nodes.</desc><rect width="100%" height="100%" fill="#ffffff"/><g>${edges}\n${nodes}</g><text x="${width - padding}" y="${brandY}" text-anchor="end" fill="#9aa1ac" font-family="Inter, Microsoft YaHei, sans-serif" font-size="10" letter-spacing="1.5">AEBACK</text></svg>`
}

export function createMindMapProject(artifact: MindMapArtifact) {
  return JSON.stringify({
    brand: 'AEBACK',
    format: 'aeback/mind-map',
    version: 1,
    exportedAt: new Date().toISOString(),
    artifact,
  }, null, 2)
}

export function createMindMapOutline(artifact: MindMapArtifact) {
  const root = artifact.nodes.find((node) => node.parentId === null) ?? artifact.nodes[0]
  if (!root) throw new Error('思维导图没有可导出的节点。')
  const children = new Map<string, MindMapNode[]>()
  artifact.nodes.forEach((node) => {
    if (node.parentId) children.set(node.parentId, [...(children.get(node.parentId) ?? []), node])
  })
  const lines = [`<!-- AEBACK mind map outline -->`, `# ${escapeMarkdown(artifact.title)}`, '']
  const visited = new Set<string>()
  const visit = (node: MindMapNode, depth: number) => {
    if (visited.has(node.id)) return
    visited.add(node.id)
    lines.push(`${'  '.repeat(depth)}- ${escapeMarkdown(node.text)}`)
    ;(children.get(node.id) ?? []).forEach((child) => visit(child, depth + 1))
  }
  visit(root, 0)
  artifact.nodes.filter((node) => !visited.has(node.id)).forEach((node) => visit(node, 0))
  return `${lines.join('\n')}\n`
}

export function parseMindMapProject(value: unknown): MindMapArtifact {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('文件内容不是有效的 AEBACK 工程。')
  const project = value as Record<string, unknown>
  if (project.brand !== 'AEBACK' || project.format !== 'aeback/mind-map' || project.version !== 1) throw new Error('不支持此工程格式或版本。')
  const candidate = project.artifact
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) throw new Error('工程文件缺少思维导图数据。')
  const source = candidate as Record<string, unknown>
  if (source.type !== 'mindmap' || typeof source.id !== 'string' || typeof source.title !== 'string' || !Array.isArray(source.nodes)) throw new Error('工程文件的思维导图数据无效。')
  if (source.nodes.length < 1 || source.nodes.length > MAX_PROJECT_NODES) throw new Error(`工程必须包含 1 到 ${MAX_PROJECT_NODES.toLocaleString()} 个节点。`)

  const nodes: MindMapNode[] = []
  const ids = new Set<string>()
  for (const entry of source.nodes) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('工程内包含无效节点。')
    const node = entry as Record<string, unknown>
    if (typeof node.id !== 'string' || !node.id || node.id.length > 200 || ids.has(node.id) || typeof node.text !== 'string' || node.text.length > 4_000 || !(node.parentId === null || typeof node.parentId === 'string')) throw new Error('工程内包含无效或重复的节点。')
    if ((node.x !== undefined && (typeof node.x !== 'number' || !Number.isFinite(node.x))) || (node.y !== undefined && (typeof node.y !== 'number' || !Number.isFinite(node.y)))) throw new Error('工程内包含无效的节点坐标。')
    if (node.color !== undefined && (typeof node.color !== 'string' || !colorNames.includes(node.color as NodeColor))) throw new Error('工程内包含不支持的节点颜色。')
    if (node.opacity !== undefined && (typeof node.opacity !== 'number' || !Number.isFinite(node.opacity) || node.opacity < 0 || node.opacity > 100)) throw new Error('工程内包含无效的透明度。')
    if (node.collapsed !== undefined && typeof node.collapsed !== 'boolean') throw new Error('工程内包含无效的分支状态。')
    ids.add(node.id)
    nodes.push(node as unknown as MindMapNode)
  }

  const roots = nodes.filter((node) => node.parentId === null)
  if (roots.length !== 1 || nodes.some((node) => node.parentId !== null && !ids.has(node.parentId))) throw new Error('工程必须是包含单一中心节点的完整树结构。')
  const parentById = new Map(nodes.map((node) => [node.id, node.parentId] as const))
  const resolved = new Set<string>()
  nodes.forEach((node) => {
    let cursor: string | null = node.id
    const path = new Set<string>()
    while (cursor && !resolved.has(cursor)) {
      if (path.has(cursor)) throw new Error('工程内存在循环节点关系。')
      path.add(cursor)
      cursor = parentById.get(cursor) ?? null
    }
    path.forEach((id) => resolved.add(id))
  })
  if (source.direction !== undefined && !['radial', 'right', 'left', 'down'].includes(String(source.direction))) throw new Error('工程内包含不支持的布局方向。')
  if (source.connectionStyle !== undefined && !['curve', 'orthogonal'].includes(String(source.connectionStyle))) throw new Error('工程内包含不支持的连线样式。')
  if (typeof source.title !== 'string' || source.title.length > 240) throw new Error('工程标题无效。')

  return { ...source, id: source.id, title: source.title, type: 'mindmap', nodes, updatedAt: new Date().toISOString() } as MindMapArtifact
}

export function assertMindMapProjectFileSize(file: File) {
  if (file.size > MAX_PROJECT_BYTES) throw new Error(`工程文件不能超过 ${MAX_PROJECT_BYTES / 1024 / 1024} MB。`)
}
