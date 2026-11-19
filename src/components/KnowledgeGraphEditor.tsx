// Aeback knowledge graph canvas — movable nodes, editable links, source context, and article import.
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type PointerEvent } from 'react'
import ArticleImportDialog from './ArticleImportDialog'
import CanvasHeader from './CanvasHeader'
import Icon, { type IconName } from './Icon'
import type { ThemeMode } from './ThemeToggleButton'
import { useCanvasController, useViewportSize } from '../lib/useCanvasController'
import { assertGraphProjectFileSize, createGraphProject, createGraphReport, createGraphSvg, parseGraphProject } from '../lib/graph-export'
import { downloadCanvasRaster } from '../lib/canvas-export'
import { downloadText, readTextFile } from '../lib/files'
import type { GraphArtifact, GraphLineStyle, KnowledgeEdge, KnowledgeNode, KnowledgeNodeKind, NodeColor } from '../types'

type KnowledgeGraphEditorProps = {
  artifact: GraphArtifact
  onChange: (artifact: GraphArtifact) => void
  onBack: () => void
  onDelete: () => void
  onImportArticle: (title: string, text: string) => void
  theme: ThemeMode
  onToggleTheme: () => void
}

const palette: Array<{ value: NodeColor; label: string }> = [
  { value: 'blue', label: '蓝色' },
  { value: 'violet', label: '紫色' },
  { value: 'green', label: '绿色' },
  { value: 'amber', label: '橙色' },
  { value: 'coral', label: '珊瑚色' },
  { value: 'slate', label: '灰色' },
]
const nodeKinds: Array<{ value: KnowledgeNodeKind; label: string }> = [
  { value: 'concept', label: '概念' }, { value: 'person', label: '人物' }, { value: 'project', label: '项目' },
  { value: 'book', label: '书籍' }, { value: 'idea', label: '想法' }, { value: 'article', label: '文章' },
]
const kindLabels = Object.fromEntries(nodeKinds.map((kind) => [kind.value, kind.label])) as Record<KnowledgeNodeKind, string>
const edgeLabels = ['相关', '包含', '启发', '引用', '因果', '属于', '支持', '反对']
const lineStyles: Array<{ value: GraphLineStyle; label: string; icon: IconName }> = [
  { value: 'curve', label: '曲线', icon: 'curve' }, { value: 'orthogonal', label: '自动折线', icon: 'elbow' },
]
type KnowledgeSide = 'up' | 'right' | 'down' | 'left'
const sideLabels: Record<KnowledgeSide, string> = { up: '上方', right: '右侧', down: '下方', left: '左侧' }

function createId() {
  return `knowledge-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`
}

function getGraphLayout(nodes: KnowledgeNode[], rootId: string, edges: KnowledgeEdge[], width: number, height: number, offsetX = 0, offsetY = 0) {
  const positions = new Map<string, { x: number; y: number }>()
  const root = nodes.find((node) => node.id === rootId) ?? nodes[0]
  if (!root) return positions
  const center = { x: offsetX + width / 2, y: offsetY + height / 2 }
  const adjacency = new Map(nodes.map((node) => [node.id, [] as string[]]))
  edges.forEach((edge) => {
    adjacency.get(edge.fromId)?.push(edge.toId)
    adjacency.get(edge.toId)?.push(edge.fromId)
  })
  const depths = new Map<string, number>([[root.id, 0]])
  const queue = [root.id]
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const id = queue[cursor]
    for (const nextId of adjacency.get(id) ?? []) {
      if (depths.has(nextId)) continue
      depths.set(nextId, (depths.get(id) ?? 0) + 1)
      queue.push(nextId)
    }
  }
  const maxDepth = Math.max(1, ...depths.values())
  nodes.forEach((node) => { if (!depths.has(node.id)) depths.set(node.id, maxDepth + 1) })
  const rings = new Map<number, KnowledgeNode[]>()
  nodes.filter((node) => node.id !== root.id).forEach((node) => {
    const depth = depths.get(node.id) ?? 1
    rings.set(depth, [...(rings.get(depth) ?? []), node])
  })
  positions.set(root.id, center)
  rings.forEach((ring, depth) => {
    const radius = Math.max(190, Math.min(width * .39, height * .38), ring.length * 78) + (depth - 1) * 170
    ring.forEach((node, index) => {
      const angle = index / Math.max(ring.length, 1) * Math.PI * 2 - Math.PI / 2
      positions.set(node.id, { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius })
    })
  })
  return positions
}

function getNodeHalfSize(node: KnowledgeNode, rootId: string) {
  const radius = node.id === rootId ? 64 : 58
  return { width: radius, height: radius }
}

function getEdgePoint(node: KnowledgeNode, center: { x: number; y: number }, toward: { x: number; y: number }, rootId: string) {
  const dx = toward.x - center.x
  const dy = toward.y - center.y
  const length = Math.max(1, Math.hypot(dx, dy))
  const half = getNodeHalfSize(node, rootId)
  return { x: center.x + dx / length * half.width, y: center.y + dy / length * half.height }
}

function KnowledgeGraphEditor({ artifact, onChange, onBack, onDelete, onImportArticle, theme, onToggleTheme }: KnowledgeGraphEditorProps) {
  const size = useViewportSize()
  const layoutBounds = useMemo(() => {
    const desktop = size.width > 680
    const offsetX = desktop ? 110 : 88
    const right = desktop ? size.width - 306 : size.width - 12
    const width = Math.max(220, right - offsetX)
    const height = desktop ? size.height : Math.max(280, size.height - Math.min(330, size.height * 0.42) - 24)
    const viewport = { left: offsetX, right, top: desktop ? 76 : 68, bottom: desktop ? size.height - 72 : height }
    return { width, height, offsetX, offsetY: 0, viewport }
  }, [size.height, size.width])
  const root = artifact.nodes.find((node) => node.id === artifact.rootId) ?? artifact.nodes[0]
  const [selectedId, setSelectedId] = useState(root?.id ?? '')
  const [selectedEdgeId, setSelectedEdgeId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [edgeLabel, setEdgeLabel] = useState('相关')
  const [showSource, setShowSource] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [exportNotice, setExportNotice] = useState('')
  const projectFileRef = useRef<HTMLInputElement>(null)
  const exportMenuRef = useRef<HTMLDetailsElement>(null)
  const nodeById = useMemo(() => new Map(artifact.nodes.map((node) => [node.id, node] as const)), [artifact.nodes])
  const nodeOrderKey = artifact.nodes.map((node) => node.id).join('\u0000')
  const selected = nodeById.get(selectedId) ?? root
  const connectionStyle = artifact.connectionStyle ?? 'curve'
  const fallbackPositions = useMemo(() => getGraphLayout(artifact.nodes, artifact.rootId, artifact.edges, layoutBounds.width, layoutBounds.height, layoutBounds.offsetX, layoutBounds.offsetY), [nodeOrderKey, artifact.edges, artifact.rootId, layoutBounds])
  const positionFor = (node: KnowledgeNode) => ({ x: node.x ?? fallbackPositions.get(node.id)?.x ?? size.width / 2, y: node.y ?? fallbackPositions.get(node.id)?.y ?? size.height / 2 })
  const moveNode = (id: string, x: number, y: number) => onChange({ ...artifact, nodes: artifact.nodes.map((node) => node.id === id ? { ...node, x, y } : node) })
  const canvas = useCanvasController(size.width, size.height, moveNode)
  const rootNode = root

  useEffect(() => {
    const handleDeleteSelectedNode = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      const target = event.target
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'))) return
      if (importOpen || searchOpen) return
      if (selectedEdgeId) {
        const edge = artifact.edges.find((item) => item.id === selectedEdgeId)
        if (edge) {
          event.preventDefault()
          onChange({ ...artifact, edges: artifact.edges.filter((item) => item.id !== edge.id) })
        }
        setSelectedEdgeId('')
        return
      }
      const node = artifact.nodes.find((item) => item.id === selectedId)
      if (!node || node.id === rootNode?.id) return
      event.preventDefault()
      onChange({ ...artifact, nodes: artifact.nodes.filter((item) => item.id !== node.id), edges: artifact.edges.filter((edge) => edge.fromId !== node.id && edge.toId !== node.id) })
      setSelectedId(rootNode?.id ?? '')
      setSelectedEdgeId('')
    }

    window.addEventListener('keydown', handleDeleteSelectedNode)
    return () => window.removeEventListener('keydown', handleDeleteSelectedNode)
  }, [artifact, importOpen, onChange, rootNode?.id, searchOpen, selectedEdgeId, selectedId])

  useEffect(() => {
    if (!rootNode) return
    const bounds = artifact.nodes.reduce((current, node) => {
      const point = positionFor(node)
      const half = getNodeHalfSize(node, rootNode.id)
      return { minX: Math.min(current.minX, point.x - half.width), minY: Math.min(current.minY, point.y - half.height), maxX: Math.max(current.maxX, point.x + half.width), maxY: Math.max(current.maxY, point.y + half.height) }
    }, { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY })
    canvas.fitBounds(bounds, layoutBounds.viewport)
  }, [artifact.id, size.height, size.width])

  if (!rootNode) return <div className="canvas-empty">Aeback 图谱没有中心节点。</div>

  const addDirectionalNode = (parentId: string, side: KnowledgeSide) => {
    const parent = artifact.nodes.find((node) => node.id === parentId)
    if (!parent) return
    const origin = positionFor(parent)
    const offset = side === 'right' ? { x: 214, y: 0 } : side === 'left' ? { x: -214, y: 0 } : side === 'up' ? { x: 0, y: -142 } : { x: 0, y: 142 }
    let x = origin.x + offset.x
    let y = origin.y + offset.y
    const hasCollision = (candidateX: number, candidateY: number) => artifact.nodes.some((node) => {
      const point = positionFor(node)
      const half = getNodeHalfSize(node, rootNode.id)
      return candidateX - 58 < point.x + half.width + 18 && candidateX + 58 > point.x - half.width - 18
        && candidateY - 58 < point.y + half.height + 18 && candidateY + 58 > point.y - half.height - 18
    })
    for (let attempt = 0; hasCollision(x, y) && attempt < artifact.nodes.length + 8; attempt += 1) {
      x += offset.x === 0 ? 0 : Math.sign(offset.x) * 214
      y += offset.y === 0 ? 0 : Math.sign(offset.y) * 142
    }
    const node: KnowledgeNode = { id: createId(), text: '新知识点', kind: 'concept', x, y, color: palette[artifact.nodes.length % palette.length]?.value ?? 'blue' }
    const relation = edgeLabel.trim() || '相关'
    const edge: KnowledgeEdge = { id: createId(), fromId: parentId, toId: node.id, label: relation, directed: relation !== '相关' }
    onChange({ ...artifact, nodes: [...artifact.nodes, node], edges: [...artifact.edges, edge] })
    setSelectedId(node.id)
    setSelectedEdgeId('')
  }

  const addNode = () => addDirectionalNode(selected?.id ?? rootNode.id, 'right')

  const addConnection = () => {
    if (!selected || !targetId || targetId === selected.id) return
    const exists = artifact.edges.some((edge) => edge.fromId === selected.id && edge.toId === targetId)
    if (exists) return
    const relation = edgeLabel.trim() || '相关'
    onChange({ ...artifact, edges: [...artifact.edges, { id: createId(), fromId: selected.id, toId: targetId, label: relation, directed: relation !== '相关' }] })
    setTargetId('')
  }

  const updateEdge = (edgeId: string, patch: Partial<KnowledgeEdge>) => onChange({ ...artifact, edges: artifact.edges.map((edge) => edge.id === edgeId ? { ...edge, ...patch } : edge) })

  const removeConnection = (edgeId: string) => {
    onChange({ ...artifact, edges: artifact.edges.filter((edge) => edge.id !== edgeId) })
    if (selectedEdgeId === edgeId) setSelectedEdgeId('')
  }

  const deleteNode = () => {
    if (!selected || selected.id === rootNode.id) return
    onChange({ ...artifact, nodes: artifact.nodes.filter((node) => node.id !== selected.id), edges: artifact.edges.filter((edge) => edge.fromId !== selected.id && edge.toId !== selected.id) })
    setSelectedId(rootNode.id)
    setSelectedEdgeId('')
  }

  const selectWithKey = (event: KeyboardEvent<SVGGElement>, node: KnowledgeNode) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(node.id); setSelectedEdgeId(''); return }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    const point = positionFor(node)
    const neighbors = [...new Set(artifact.edges.filter((edge) => edge.fromId === node.id || edge.toId === node.id).map((edge) => edge.fromId === node.id ? edge.toId : edge.fromId))]
    const candidates = neighbors.map((id) => {
      const other = artifact.nodes.find((item) => item.id === id)
      if (!other) return undefined
      const target = positionFor(other)
      const dx = target.x - point.x
      const dy = target.y - point.y
      const primary = event.key === 'ArrowLeft' ? -dx : event.key === 'ArrowRight' ? dx : event.key === 'ArrowUp' ? -dy : dy
      const perpendicular = event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? Math.abs(dy) : Math.abs(dx)
      return { id, primary, score: Math.hypot(dx, dy) + perpendicular * .4 }
    }).filter((item): item is { id: string; primary: number; score: number } => Boolean(item))
    const directional = candidates.filter((item) => item.primary > 0)
    const nextId = (directional.length ? directional : candidates).sort((a, b) => a.score - b.score)[0]?.id
    if (nextId) {
      event.preventDefault()
      setSelectedId(nextId)
      setSelectedEdgeId('')
      requestAnimationFrame(() => document.getElementById(`knowledge-node-${nextId}`)?.focus())
    }
  }

  const matchesSearch = (node: KnowledgeNode) => {
    const query = searchQuery.trim().toLocaleLowerCase()
    return !query || [node.text, node.description ?? '', node.source ?? '', kindLabels[node.kind ?? 'concept']].join(' ').toLocaleLowerCase().includes(query)
  }
  const focusNode = (node: KnowledgeNode) => {
    setSelectedId(node.id)
    setSelectedEdgeId('')
    requestAnimationFrame(() => document.getElementById(`knowledge-node-${node.id}`)?.focus())
    const point = positionFor(node)
    const half = getNodeHalfSize(node, rootNode.id)
    canvas.fitBounds({ minX: point.x - half.width, minY: point.y - half.height, maxX: point.x + half.width, maxY: point.y + half.height }, layoutBounds.viewport)
  }
  const focusSearchResult = () => {
    const match = artifact.nodes.find(matchesSearch)
    if (match) focusNode(match)
  }
  const fitSelected = () => { if (selected) focusNode(selected) }
  const arrangeGraph = () => {
    const positions = getGraphLayout(artifact.nodes, artifact.rootId, artifact.edges, layoutBounds.width, layoutBounds.height, layoutBounds.offsetX, layoutBounds.offsetY)
    const nodes = artifact.nodes.map((node) => ({ ...node, ...(positions.get(node.id) ?? {}) }))
    onChange({ ...artifact, nodes })
    const bounds = nodes.reduce((current, node) => {
      const point = positions.get(node.id) ?? positionFor(node)
      const half = getNodeHalfSize(node, rootNode.id)
      return { minX: Math.min(current.minX, point.x - half.width), minY: Math.min(current.minY, point.y - half.height), maxX: Math.max(current.maxX, point.x + half.width), maxY: Math.max(current.maxY, point.y + half.height) }
    }, { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY })
    canvas.fitBounds(bounds, layoutBounds.viewport)
  }
  const setConnectionStyle = (style: GraphLineStyle) => onChange({ ...artifact, connectionStyle: style })
  const connections = selected ? artifact.edges.filter((edge) => edge.fromId === selected.id || edge.toId === selected.id) : []
  const selectedColor = selected?.color ?? (selected?.id === rootNode.id ? 'green' : palette[Math.max(0, artifact.nodes.indexOf(selected)) % palette.length]?.value ?? 'blue')

  const closeExportMenu = () => { if (exportMenuRef.current) exportMenuRef.current.open = false }
  const getExportSvg = () => createGraphSvg(artifact, new Map(artifact.nodes.map((node) => [node.id, positionFor(node)] as const)))
  const exportSvg = () => {
    closeExportMenu()
    downloadText(artifact.title, 'svg', getExportSvg(), 'image/svg+xml;charset=utf-8')
  }
  const exportRaster = async (format: 'png' | 'jpg') => {
    closeExportMenu()
    try {
      await downloadCanvasRaster(getExportSvg(), format, artifact.title)
      setExportNotice(`${format.toUpperCase()} 已导出`)
    } catch (error) {
      setExportNotice(error instanceof Error ? error.message : '图片导出失败')
    }
    window.setTimeout(() => setExportNotice(''), 3200)
  }
  const exportProject = () => {
    closeExportMenu()
    downloadText(artifact.title, 'aeback', createGraphProject(artifact), 'application/vnd.aeback.project+json;charset=utf-8')
  }
  const exportReport = () => {
    closeExportMenu()
    downloadText(artifact.title, 'md', createGraphReport(artifact), 'text/markdown;charset=utf-8')
  }
  const importProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    closeExportMenu()
    try {
      assertGraphProjectFileSize(file)
      const project = parseGraphProject(JSON.parse(await readTextFile(file)))
      if (!window.confirm(`导入「${project.title}」并替换当前知识图谱？`)) return
      const replacement = { ...project, id: artifact.id, updatedAt: new Date().toISOString() }
      onChange(replacement)
      setSelectedId(project.rootId)
      setSelectedEdgeId('')
      setTargetId('')
      setShowSource(false)
      setSearchQuery('')
      setSearchOpen(false)
      const fallback = getGraphLayout(project.nodes, project.rootId, project.edges, layoutBounds.width, layoutBounds.height, layoutBounds.offsetX, layoutBounds.offsetY)
      const positions = new Map(project.nodes.map((node) => [node.id, { x: node.x ?? fallback.get(node.id)?.x ?? size.width / 2, y: node.y ?? fallback.get(node.id)?.y ?? size.height / 2 }] as const))
      const bounds = project.nodes.reduce((current, node) => {
        const point = positions.get(node.id)!
        const radius = getNodeHalfSize(node, project.rootId).width
        return { minX: Math.min(current.minX, point.x - radius), minY: Math.min(current.minY, point.y - radius), maxX: Math.max(current.maxX, point.x + radius), maxY: Math.max(current.maxY, point.y + radius) }
      }, { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY })
      canvas.fitBounds(bounds, layoutBounds.viewport)
      setExportNotice('工程已导入')
    } catch (error) {
      setExportNotice(error instanceof Error ? error.message : '工程导入失败')
    } finally {
      input.value = ''
      window.setTimeout(() => setExportNotice(''), 4000)
    }
  }

  return (
    <div className="canvas-workspace canvas-workspace--graph">
      <svg
        ref={canvas.svgRef}
        className="full-canvas"
        viewBox={`0 0 ${size.width} ${size.height}`}
        preserveAspectRatio="none"
        aria-label={`${artifact.title} 知识图谱画布`}
        onPointerDown={canvas.startPan}
        onPointerMove={canvas.onPointerMove}
        onPointerUp={canvas.stopGesture}
        onPointerCancel={canvas.stopGesture}
        onWheel={canvas.onWheel}
      >
        <defs>
          <pattern id="aeback-knowledge-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M 28 0 H 0 V 28" fill="none" stroke="var(--aeback-grid)" strokeWidth="1" /></pattern>
          <marker id="aeback-knowledge-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 1 L 9 5 L 0 9 z" fill="#8993a2" /></marker>
        </defs>
        <rect className="canvas-background" width={size.width} height={size.height} fill="url(#aeback-knowledge-grid)" />
        <g transform={`translate(${canvas.camera.x} ${canvas.camera.y}) scale(${canvas.camera.zoom})`}>
          {artifact.edges.map((edge, index) => {
            const fromNode = nodeById.get(edge.fromId)
            const toNode = nodeById.get(edge.toId)
            if (!fromNode || !toNode) return null
            const from = positionFor(fromNode)
            const to = positionFor(toNode)
            const start = getEdgePoint(fromNode, from, to, rootNode.id)
            const end = getEdgePoint(toNode, to, from, rootNode.id)
            const dx = end.x - start.x
            const dy = end.y - start.y
            const midpointX = (start.x + end.x) / 2
            const midpointY = (start.y + end.y) / 2
            const horizontal = Math.abs(dx) >= Math.abs(dy)
            const path = connectionStyle === 'orthogonal'
              ? horizontal ? `M ${start.x} ${start.y} L ${midpointX} ${start.y} L ${midpointX} ${end.y} L ${end.x} ${end.y}` : `M ${start.x} ${start.y} L ${start.x} ${midpointY} L ${end.x} ${midpointY} L ${end.x} ${end.y}`
              : `M ${start.x} ${start.y} Q ${midpointX - dy * .12} ${midpointY + dx * .12} ${end.x} ${end.y}`
            const dimmed = Boolean(searchQuery.trim() && !matchesSearch(fromNode) && !matchesSearch(toNode))
            return <g key={edge.id} className={`graph-link${edge.directed ? ' graph-link--directed' : ''}${selectedEdgeId === edge.id ? ' graph-link--selected' : ''}${dimmed ? ' graph-link--dimmed' : ''}`} role="button" tabIndex={0} aria-label={`关系：${fromNode.text} ${edge.label ?? '相关'} ${toNode.text}`} onClick={(event) => { event.stopPropagation(); setSelectedEdgeId(edge.id); setSelectedId(fromNode.id) }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedEdgeId(edge.id); setSelectedId(fromNode.id) } if (event.key === 'Delete') removeConnection(edge.id) }}>
              <path d={path} markerEnd={edge.directed ? 'url(#aeback-knowledge-arrow)' : undefined} />
              <text x={midpointX} y={midpointY - 7 - (index % 2) * 4} textAnchor="middle">{edge.label ?? '相关'}</text>
            </g>
          })}
          {artifact.nodes.map((node, index) => {
            const position = positionFor(node)
            const central = node.id === rootNode.id
            const active = node.id === selected?.id
            const color = node.color ?? (central ? 'green' : palette[index % palette.length]?.value ?? 'blue')
            const nodeKind = node.kind ?? (central ? 'concept' : 'idea')
            const dimmed = Boolean(searchQuery.trim() && !matchesSearch(node))
            const half = getNodeHalfSize(node, rootNode.id)
            const sidePoints: Record<KnowledgeSide, { x: number; y: number }> = { up: { x: 0, y: -half.height }, right: { x: half.width, y: 0 }, down: { x: 0, y: half.height }, left: { x: -half.width, y: 0 } }
            return <g key={node.id} id={`knowledge-node-${node.id}`} className={`canvas-node knowledge-node${active ? ' canvas-node--selected' : ''}${dimmed ? ' knowledge-node--dimmed' : ''}${searchQuery.trim() && !dimmed ? ' knowledge-node--match' : ''}`} transform={`translate(${position.x} ${position.y})`} role="button" tabIndex={0} aria-label={`编辑${kindLabels[nodeKind]}节点：${node.text}`} onPointerDown={(event: PointerEvent<SVGGElement>) => { setSelectedId(node.id); setSelectedEdgeId(''); canvas.startNodeDrag(node.id, position.x, position.y, event) }} onKeyDown={(event) => selectWithKey(event, node)}>
              <title>{node.text}</title>
              <circle className="knowledge-node-halo" r={half.width + 9} />
              <circle className={`knowledge-node-shape ${central ? 'knowledge-node-shape--root' : 'knowledge-node-shape--leaf'}`} r={half.width} data-color={color} style={{ fillOpacity: Math.max(0, Math.min(100, node.opacity ?? 100)) / 100 }} />
              <text className="canvas-node-label knowledge-node-title" x="0" y="-2" textAnchor="middle">{node.text.length > 9 ? `${node.text.slice(0, 8)}…` : node.text}</text>
              <text className="knowledge-node-kind" x="0" y="17" textAnchor="middle">{kindLabels[nodeKind]}</text>
              {(['up', 'right', 'down', 'left'] as KnowledgeSide[]).map((side) => <g key={side} className="knowledge-add-handle" transform={`translate(${sidePoints[side].x} ${sidePoints[side].y})`} role="button" tabIndex={active ? 0 : -1} aria-label={`在节点${sideLabels[side]}添加关联节点`} onPointerDown={(event) => { event.stopPropagation(); setSelectedId(node.id) }} onClick={(event) => { event.preventDefault(); event.stopPropagation(); addDirectionalNode(node.id, side) }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); addDirectionalNode(node.id, side) } }}><circle r="10" /><path d="M -3.5 0 H 3.5 M 0 -3.5 V 3.5" /></g>)}
            </g>
          })}
        </g>
      </svg>

      <CanvasHeader title={artifact.title} onTitleChange={(title) => onChange({ ...artifact, title })} onBack={onBack} onDelete={onDelete} theme={theme} onToggleTheme={onToggleTheme}>
        <button className="canvas-header-action" type="button" onClick={() => setImportOpen(true)}><Icon name="document" size={15} />导入文章</button>
        <details className="canvas-export-menu" ref={exportMenuRef}>
          <summary className="canvas-header-action" aria-label="导出或导入知识图谱"><Icon name="download" size={15} /><span>导出</span></summary>
          <div className="canvas-export-dropdown">
            <button type="button" onClick={() => void exportRaster('png')}>导出 PNG 图片</button>
            <button type="button" onClick={() => void exportRaster('jpg')}>导出 JPG 图片</button>
            <button type="button" onClick={exportSvg}>导出 SVG 矢量图</button>
            <button type="button" onClick={exportProject}>导出 Aeback 工程</button>
            <button type="button" onClick={exportReport}>导出 Markdown 报告</button>
            <div className="canvas-export-divider" />
            <button type="button" onClick={() => projectFileRef.current?.click()}>导入 Aeback 工程</button>
            <input ref={projectFileRef} hidden type="file" accept=".aeback,application/json" aria-label="选择 Aeback 知识图谱工程" onChange={(event) => void importProject(event)} />
          </div>
        </details>
        <button className="canvas-header-primary" type="button" onClick={addNode}><Icon name="plus" size={15} />关联节点</button>
      </CanvasHeader>
      {exportNotice && <div className="canvas-export-status" role="status">{exportNotice}</div>}
      <div className="canvas-tool-rail graph-tool-rail" role="toolbar" aria-label="知识图谱工具">
        <div className="graph-tool-group" role="group" aria-label="节点操作">
          <button className="canvas-tool-primary" type="button" aria-label="添加关联节点" title="添加关联节点" onClick={addNode}><Icon name="plus" size={18} /></button>
          <div className="canvas-search-control"><button className={`direction-button${searchOpen ? ' direction-button--active' : ''}`} type="button" aria-label="搜索节点" aria-expanded={searchOpen} title="搜索节点" onClick={() => { setSearchOpen((open) => !open); setSearchQuery('') }}><Icon name="search" size={16} /></button>{searchOpen && <input className="graph-search-input" autoFocus aria-label="搜索知识节点" placeholder="搜索节点" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') focusSearchResult(); if (event.key === 'Escape') { setSearchOpen(false); setSearchQuery('') } }} />}</div>
          {selected?.id !== rootNode.id && <button className="direction-button graph-tool-danger" type="button" aria-label="删除选中节点" title="删除选中节点" onClick={deleteNode}><Icon name="trash" size={16} /></button>}
        </div>
        <div className="canvas-tool-separator" />
        <div className="graph-tool-group graph-line-style-controls" role="group" aria-label="关系线样式">{lineStyles.map(({ value, label, icon }) => <button className={`direction-button${connectionStyle === value ? ' direction-button--active' : ''}`} type="button" key={value} aria-label={label} title={label} aria-pressed={connectionStyle === value} onClick={() => setConnectionStyle(value)}><Icon name={icon} size={16} /></button>)}</div>
        <div className="canvas-tool-separator" />
        <div className="graph-tool-group" role="group" aria-label="画布布局"><button className="direction-button" type="button" aria-label="整理图谱布局" title="整理图谱布局" onClick={arrangeGraph}><Icon name="arrange" size={16} /></button></div>
      </div>
      <div className="canvas-zoom" role="toolbar" aria-label="画布缩放"><button type="button" aria-label="放大" onClick={canvas.zoomIn}>+</button><span>{Math.round(canvas.camera.zoom * 100)}%</span><button type="button" aria-label="缩小" onClick={canvas.zoomOut}>−</button><i /><button type="button" aria-label="整理视图" title="整理视图" onClick={arrangeGraph}><Icon name="grid" size={15} /></button><i /><span className="canvas-node-count">{artifact.nodes.length} 节点 · {artifact.edges.length} 关系</span></div>
      {selected && <aside className="canvas-inspector" aria-label="图谱节点属性">
        <div className="canvas-inspector-heading"><span>节点</span><div className="canvas-inspector-actions"><button type="button" aria-label="定位节点" title="定位节点" onClick={fitSelected}><Icon name="mindmap" size={15} /></button>{selected.id !== rootNode.id && <button type="button" aria-label="删除节点" title="删除节点" onClick={deleteNode}><Icon name="trash" size={15} /></button>}</div></div>
        <label className="canvas-label" htmlFor="graph-node-name">名称</label>
        <input id="graph-node-name" value={selected.text} onChange={(event) => onChange({ ...artifact, nodes: artifact.nodes.map((node) => node.id === selected.id ? { ...node, text: event.target.value } : node) })} />
        <label className="canvas-label" htmlFor="graph-node-kind">类型</label>
        <select id="graph-node-kind" value={selected.kind ?? (selected.id === rootNode.id ? 'concept' : 'idea')} onChange={(event) => onChange({ ...artifact, nodes: artifact.nodes.map((node) => node.id === selected.id ? { ...node, kind: event.target.value as KnowledgeNodeKind } : node) })}>{nodeKinds.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}</select>
        <label className="canvas-label" htmlFor="graph-node-description">说明</label>
        <textarea id="graph-node-description" className="canvas-textarea" value={selected.description ?? ''} placeholder="补充节点说明" onChange={(event) => onChange({ ...artifact, nodes: artifact.nodes.map((node) => node.id === selected.id ? { ...node, description: event.target.value } : node) })} />
        {selected.source && <div className="knowledge-evidence"><span>来源摘录</span><p>{selected.source}</p></div>}
        <span className="canvas-label">节点颜色</span>
        <div className="color-palette" role="group" aria-label="节点颜色">{palette.map((color) => <button className={`color-swatch color-swatch--${color.value}${selectedColor === color.value ? ' color-swatch--selected' : ''}`} type="button" key={color.value} aria-label={color.label} aria-pressed={selectedColor === color.value} title={color.label} onClick={() => onChange({ ...artifact, nodes: artifact.nodes.map((node) => node.id === selected.id ? { ...node, color: color.value } : node) })} />)}</div>
        <label className="canvas-label canvas-opacity-label" htmlFor="graph-node-opacity"><span>填充透明度</span><output htmlFor="graph-node-opacity">{selected.opacity ?? 100}%</output></label>
        <input className="canvas-opacity-slider" id="graph-node-opacity" type="range" min="0" max="100" step="5" value={selected.opacity ?? 100} aria-label="节点填充透明度" onChange={(event) => { const opacity = Number(event.target.value); onChange({ ...artifact, nodes: artifact.nodes.map((node) => node.id === selected.id ? { ...node, opacity } : node) }) }} />
        <label className="canvas-label" htmlFor="graph-edge-target">新建关系</label>
        <div className="canvas-connect-row"><select id="graph-edge-target" value={targetId} onChange={(event) => setTargetId(event.target.value)}><option value="">选择节点</option>{artifact.nodes.filter((node) => node.id !== selected.id).map((node) => <option key={node.id} value={node.id}>{node.text}</option>)}</select><input aria-label="关系名称" list="knowledge-relation-options" value={edgeLabel} onChange={(event) => setEdgeLabel(event.target.value)} /><datalist id="knowledge-relation-options">{edgeLabels.map((label) => <option key={label} value={label} />)}</datalist><button type="button" aria-label="连接节点" title="连接节点" disabled={!targetId} onClick={addConnection}><Icon name="arrow" size={15} /></button></div>
        {connections.length > 0 && <div className="canvas-connections"><span className="canvas-label">关联关系</span>{connections.map((edge) => { const otherId = edge.fromId === selected.id ? edge.toId : edge.fromId; const other = nodeById.get(otherId); return <div className={`canvas-connection-row${selectedEdgeId === edge.id ? ' canvas-connection-row--selected' : ''}`} key={edge.id}><span title={other?.text}>{other?.text ?? '节点'}</span><input className="canvas-connection-label" aria-label={`关系名称：${other?.text ?? '节点'}`} value={edge.label ?? '相关'} onFocus={() => setSelectedEdgeId(edge.id)} onChange={(event) => updateEdge(edge.id, { label: event.target.value })} /><button type="button" className={`canvas-edge-direction${edge.directed ? ' canvas-edge-direction--active' : ''}`} aria-label={edge.directed ? '改为无向关系' : '改为有向关系'} aria-pressed={Boolean(edge.directed)} title={edge.directed ? '有向关系' : '无向关系'} onClick={() => updateEdge(edge.id, { directed: !edge.directed })}><Icon name="arrow" size={13} /></button><button type="button" aria-label="删除关系" title="删除关系" onClick={() => removeConnection(edge.id)}><Icon name="close" size={13} /></button></div> })}</div>}
        {artifact.sourceText && <button className="canvas-source-toggle" type="button" aria-expanded={showSource} onClick={() => setShowSource((value) => !value)}>{showSource ? '收起原文' : '查看原文'}</button>}
      </aside>}
      {showSource && artifact.sourceText && <section className="canvas-source-panel"><header><span>导入原文</span><button type="button" aria-label="关闭原文" onClick={() => setShowSource(false)}><Icon name="close" size={15} /></button></header><p>{artifact.sourceText}</p></section>}
      <div className="canvas-help">拖动节点 · 空白处平移 · 滚轮缩放</div>
      {importOpen && <ArticleImportDialog onClose={() => setImportOpen(false)} onImport={(title, text) => { setImportOpen(false); onImportArticle(title, text) }} />}
    </div>
  )
}

export default KnowledgeGraphEditor
