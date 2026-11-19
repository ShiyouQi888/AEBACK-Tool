// Aeback mind map canvas — draggable nodes, editable branches, color, and layout direction.
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type PointerEvent } from 'react'
import CanvasHeader from './CanvasHeader'
import Icon, { type IconName } from './Icon'
import type { ThemeMode } from './ThemeToggleButton'
import { useCanvasController, useViewportSize } from '../lib/useCanvasController'
import { assertMindMapProjectFileSize, createMindMapOutline, createMindMapProject, createMindMapSvg, parseMindMapProject } from '../lib/mindmap-export'
import { downloadCanvasRaster } from '../lib/canvas-export'
import { downloadText, readTextFile } from '../lib/files'
import type { MindMapArtifact, MindMapDirection, MindMapLineStyle, MindMapNode, NodeColor } from '../types'

type MindMapEditorProps = {
  artifact: MindMapArtifact
  onChange: (artifact: MindMapArtifact) => void
  onBack: () => void
  onDelete: () => void
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
const directions: Array<{ value: MindMapDirection; label: string; icon: IconName }> = [
  { value: 'radial', label: '放射', icon: 'mindmap' },
  { value: 'right', label: '向右', icon: 'arrow' },
  { value: 'left', label: '向左', icon: 'back' },
  { value: 'down', label: '向下', icon: 'branch' },
]
const lineStyles: Array<{ value: MindMapLineStyle; label: string; icon: IconName }> = [
  { value: 'curve', label: '曲线', icon: 'curve' },
  { value: 'orthogonal', label: '自动折线', icon: 'elbow' },
]
type MindMapSide = 'up' | 'right' | 'down' | 'left'
const sideLabels: Record<MindMapSide, string> = { up: '上方', right: '右侧', down: '下方', left: '左侧' }

function createId() {
  return `map-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`
}

function getLayout(nodes: MindMapNode[], direction: MindMapDirection, width: number, height: number, offsetX = 0, offsetY = 0) {
  const root = nodes.find((node) => node.parentId === null) ?? nodes[0]
  const positions = new Map<string, { x: number; y: number; depth: number }>()
  if (!root) return positions
  const center = { x: offsetX + width / 2, y: offsetY + height / 2 }
  const nodeById = new Map(nodes.map((node) => [node.id, node] as const))
  const parentById = new Map<string, string | null>()
  nodes.forEach((node) => {
    if (node.id === root.id) { parentById.set(node.id, null); return }
    const parentId = node.parentId && nodeById.has(node.parentId) && node.parentId !== node.id ? node.parentId : root.id
    parentById.set(node.id, parentId)
  })

  // Break malformed parent cycles so every node is laid out exactly once.
  nodes.forEach((node) => {
    const path = new Set<string>()
    let current: string | null = node.id
    while (current && current !== root.id) {
      if (path.has(current)) { parentById.set(current, root.id); break }
      path.add(current)
      current = parentById.get(current) ?? null
    }
  })

  const children = new Map<string, MindMapNode[]>()
  nodes.forEach((node) => {
    if (node.id === root.id) return
    const parentId = parentById.get(node.id) ?? root.id
    children.set(parentId, [...(children.get(parentId) ?? []), node])
  })
  const depthById = new Map<string, number>()
  const ranges = new Map<string, { first: number; last: number }>()
  let leafCount = 0
  const collectRanges = (node: MindMapNode, depth: number): { first: number; last: number } => {
    depthById.set(node.id, depth)
    const descendants = children.get(node.id) ?? []
    if (!descendants.length) {
      const slot = leafCount++
      const range = { first: slot, last: slot }
      ranges.set(node.id, range)
      return range
    }
    const childRanges = descendants.map((child) => collectRanges(child, depth + 1))
    const range = { first: childRanges[0].first, last: childRanges[childRanges.length - 1].last }
    ranges.set(node.id, range)
    return range
  }
  collectRanges(root, 0)

  const leafTotal = Math.max(1, leafCount)
  const slotFor = (node: MindMapNode) => {
    const range = ranges.get(node.id) ?? { first: 0, last: 0 }
    return (range.first + range.last) / 2 - (leafTotal - 1) / 2
  }
  positions.set(root.id, { ...center, depth: 0 })

  if (direction === 'radial') {
    const angleFor = (node: MindMapNode) => -Math.PI / 2 + ((slotFor(node) + (leafTotal - 1) / 2 + 0.5) / leafTotal) * Math.PI * 2
    const depthGroups = new Map<number, MindMapNode[]>()
    nodes.filter((node) => node.id !== root.id).forEach((node) => {
      const depth = depthById.get(node.id) ?? 1
      depthGroups.set(depth, [...(depthGroups.get(depth) ?? []), node])
    })
    let previousRadius = 0
    ;[...depthGroups.keys()].sort((a, b) => a - b).forEach((depth) => {
      const group = depthGroups.get(depth) ?? []
      const sortedAngles = group.map(angleFor).map((angle) => (angle + Math.PI * 2) % (Math.PI * 2)).sort((a, b) => a - b)
      let minGap = Math.PI * 2
      if (sortedAngles.length > 1) {
        minGap = Math.min(...sortedAngles.map((angle, index) => {
          const next = sortedAngles[(index + 1) % sortedAngles.length] + (index === sortedAngles.length - 1 ? Math.PI * 2 : 0)
          return next - angle
        }))
      }
      const angleForChord = Math.min(Math.PI, minGap)
      const minSeparationRadius = sortedAngles.length > 1 ? 190 / Math.max(0.001, 2 * Math.sin(angleForChord / 2)) : 0
      const radius = Math.max(230 + (depth - 1) * 210, previousRadius + 210, minSeparationRadius)
      group.forEach((node) => {
        const angle = angleFor(node)
        positions.set(node.id, { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius, depth })
      })
      previousRadius = radius
    })
  } else {
    nodes.filter((node) => node.id !== root.id).forEach((node) => {
      const depth = depthById.get(node.id) ?? 1
      const slot = slotFor(node)
      if (direction === 'down') positions.set(node.id, { x: center.x + slot * 194, y: center.y + depth * 112, depth })
      else {
        const sign = direction === 'right' ? 1 : -1
        positions.set(node.id, { x: center.x + sign * depth * 212, y: center.y + slot * 88, depth })
      }
    })
  }

  return positions
}

function defaultColor(node: MindMapNode, rootId: string, index: number): NodeColor {
  if (node.color) return node.color
  if (node.id === rootId) return 'blue'
  return palette[(index - 1) % palette.length]?.value ?? 'blue'
}

function getVisibleNodes(nodes: MindMapNode[], rootId: string) {
  const children = new Map<string, MindMapNode[]>()
  nodes.forEach((node) => {
    if (node.parentId) children.set(node.parentId, [...(children.get(node.parentId) ?? []), node])
  })
  const visible: MindMapNode[] = []
  const visited = new Set<string>()
  const nodeIds = new Set(nodes.map((node) => node.id))
  const visit = (node: MindMapNode) => {
    if (visited.has(node.id)) return
    visited.add(node.id)
    visible.push(node)
    if (!node.collapsed) (children.get(node.id) ?? []).forEach(visit)
  }
  const root = nodes.find((node) => node.id === rootId)
  if (root) visit(root)
  nodes.forEach((node) => { if (!visited.has(node.id) && (!node.parentId || !nodeIds.has(node.parentId))) visit(node) })
  return visible
}

function getDescendantCount(nodeId: string, nodes: MindMapNode[]) {
  const children = new Map<string, MindMapNode[]>()
  nodes.forEach((node) => {
    if (node.parentId) children.set(node.parentId, [...(children.get(node.parentId) ?? []), node])
  })
  const count = (id: string, visited = new Set<string>()): number => {
    if (visited.has(id)) return 0
    const nextVisited = new Set(visited).add(id)
    return (children.get(id) ?? []).reduce((total, child) => total + 1 + count(child.id, nextVisited), 0)
  }
  return count(nodeId)
}

function MindMapEditor({ artifact, onChange, onBack, onDelete, theme, onToggleTheme }: MindMapEditorProps) {
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
  const root = artifact.nodes.find((node) => node.parentId === null) ?? artifact.nodes[0]
  const [selectedId, setSelectedId] = useState(root?.id ?? '')
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [exportNotice, setExportNotice] = useState('')
  const inlineInputRef = useRef<HTMLInputElement>(null)
  const projectFileRef = useRef<HTMLInputElement>(null)
  const exportMenuRef = useRef<HTMLDetailsElement>(null)
  const lastNodeTapRef = useRef<{ id: string; time: number } | null>(null)
  const selected = artifact.nodes.find((node) => node.id === selectedId) ?? root
  const direction = artifact.direction ?? 'radial'
  const connectionStyle = artifact.connectionStyle ?? 'curve'
  const visibleNodes = useMemo(() => root ? getVisibleNodes(artifact.nodes, root.id) : [], [artifact.nodes, root?.id])
  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes])
  const [historyStatus, setHistoryStatus] = useState({ canUndo: false, canRedo: false })
  const artifactRef = useRef(artifact)
  const historyRef = useRef({ past: [] as MindMapArtifact[], future: [] as MindMapArtifact[], group: null as string | null, changedAt: 0 })
  artifactRef.current = artifact
  const refreshHistoryStatus = () => setHistoryStatus({ canUndo: historyRef.current.past.length > 0, canRedo: historyRef.current.future.length > 0 })
  const commitChange = (next: MindMapArtifact, group?: string) => {
    const history = historyRef.current
    const now = Date.now()
    const coalesce = Boolean(group && group === history.group && now - history.changedAt < 750)
    if (!coalesce) history.past = [...history.past.slice(-49), artifactRef.current]
    history.future = []
    history.group = group ?? null
    history.changedAt = now
    artifactRef.current = next
    onChange(next)
    refreshHistoryStatus()
  }
  const undo = () => {
    const history = historyRef.current
    const previous = history.past.pop()
    if (!previous) return
    history.future = [...history.future.slice(-49), artifactRef.current]
    history.group = null
    artifactRef.current = previous
    onChange(previous)
    refreshHistoryStatus()
  }
  const redo = () => {
    const history = historyRef.current
    const next = history.future.pop()
    if (!next) return
    history.past = [...history.past.slice(-49), artifactRef.current]
    history.group = null
    artifactRef.current = next
    onChange(next)
    refreshHistoryStatus()
  }
  const finishHistoryGroup = () => { historyRef.current.group = null }
  const layout = useMemo(() => getLayout(artifact.nodes, direction, layoutBounds.width, layoutBounds.height, layoutBounds.offsetX, layoutBounds.offsetY), [artifact.nodes, direction, layoutBounds, size.height, size.width])
  const moveNode = (id: string, x: number, y: number) => commitChange({ ...artifactRef.current, nodes: artifactRef.current.nodes.map((node) => node.id === id ? { ...node, x, y } : node) }, 'drag')
  const canvas = useCanvasController(size.width, size.height, moveNode)

  const fitLayout = (nodes: MindMapNode[], positions: Map<string, { x: number; y: number; depth: number }>, viewport = layoutBounds.viewport) => {
    const bounds = nodes.reduce((current, node) => {
      const point = positions.get(node.id) ?? { x: size.width / 2, y: size.height / 2, depth: 1 }
      const halfWidth = point.depth === 0 ? 89 : 77
      const halfHeight = point.depth === 0 ? 32 : 27
      return { minX: Math.min(current.minX, point.x - halfWidth), minY: Math.min(current.minY, point.y - halfHeight), maxX: Math.max(current.maxX, point.x + halfWidth), maxY: Math.max(current.maxY, point.y + halfHeight) }
    }, { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY })
    canvas.fitBounds(bounds, viewport)
  }

  useEffect(() => {
    if (editingId) {
      inlineInputRef.current?.focus()
      inlineInputRef.current?.select()
    }
  }, [editingId])

  useEffect(() => {
    if (!root) return
    const positions = new Map(artifact.nodes.map((node) => {
      const point = layout.get(node.id) ?? { x: size.width / 2, y: size.height / 2, depth: 1 }
      return [node.id, { ...point, x: node.x ?? point.x, y: node.y ?? point.y }] as const
    }))
    fitLayout(artifact.nodes, positions)
  }, [artifact.id, size.height, size.width])

  if (!root) return <div className="canvas-empty">Aeback 导图没有中心节点。</div>

  const positionFor = (node: MindMapNode) => ({
    x: node.x ?? layout.get(node.id)?.x ?? size.width / 2,
    y: node.y ?? layout.get(node.id)?.y ?? size.height / 2,
    depth: layout.get(node.id)?.depth ?? 1,
  })
  const addDirectionalNode = (parentId: string, side: MindMapSide) => {
    const parent = artifact.nodes.find((node) => node.id === parentId)
    if (!parent) return
    const parentPosition = positionFor(parent)
    const gapX = 220
    const gapY = 110
    const offset = side === 'right' ? { x: gapX, y: 0 }
      : side === 'left' ? { x: -gapX, y: 0 }
        : side === 'up' ? { x: 0, y: -gapY }
          : { x: 0, y: gapY }
    let x = parentPosition.x + offset.x
    let y = parentPosition.y + offset.y
    const nodeDepth = parentPosition.depth + 1
    const halfWidth = 77
    const halfHeight = 27
    const hasCollision = (candidateX: number, candidateY: number) => artifact.nodes.some((existing) => {
      const position = positionFor(existing)
      const existingHalfWidth = position.depth === 0 ? 89 : 77
      const existingHalfHeight = position.depth === 0 ? 32 : 27
      return candidateX - halfWidth < position.x + existingHalfWidth + 14
        && candidateX + halfWidth > position.x - existingHalfWidth - 14
        && candidateY - halfHeight < position.y + existingHalfHeight + 14
        && candidateY + halfHeight > position.y - existingHalfHeight - 14
    })
    for (let attempt = 0; hasCollision(x, y) && attempt < artifact.nodes.length + 10; attempt += 1) {
      x += offset.x === 0 ? 0 : Math.sign(offset.x) * gapX
      y += offset.y === 0 ? 0 : Math.sign(offset.y) * gapY
    }
    const node: MindMapNode = {
      id: createId(),
      text: '新节点',
      parentId,
      x,
      y,
      color: palette[artifact.nodes.length % palette.length]?.value ?? 'blue',
    }
    const nextNodes = [...artifact.nodes.map((existing) => existing.id === parentId ? { ...existing, collapsed: false } : existing), node]
    commitChange({ ...artifact, nodes: nextNodes })
    setSelectedId(node.id)
    setInspectorOpen(false)
    const fullCanvas = { left: 88, right: size.width - 24, top: 76, bottom: size.height - 72 }
    if (x - halfWidth < fullCanvas.left || x + halfWidth > fullCanvas.right || y - halfHeight < fullCanvas.top || y + halfHeight > fullCanvas.bottom) {
      const positions = new Map(artifact.nodes.map((existing) => {
        const position = positionFor(existing)
        return [existing.id, position] as const
      }))
      positions.set(node.id, { x, y, depth: nodeDepth })
      fitLayout(nextNodes, positions, fullCanvas)
    }
  }

  const sideForDirection = (): MindMapSide => direction === 'down' ? 'down' : direction === 'left' ? 'left' : 'right'

  const addNode = () => addDirectionalNode(selected?.id ?? root.id, sideForDirection())

  const addSiblingNode = (node: MindMapNode) => addDirectionalNode(node.parentId ?? node.id, sideForDirection())

  const toggleCollapse = (nodeId: string) => {
    const node = artifact.nodes.find((item) => item.id === nodeId)
    if (!node) return
    commitChange({ ...artifact, nodes: artifact.nodes.map((item) => item.id === nodeId ? { ...item, collapsed: !item.collapsed } : item) })
    setSelectedId(nodeId)
    setInspectorOpen(true)
  }

  const duplicateNodeById = (nodeId: string) => {
    const source = artifact.nodes.find((node) => node.id === nodeId)
    if (!source || source.id === root.id) return
    const subtree: MindMapNode[] = []
    const visited = new Set<string>()
    const collect = (parentId: string) => artifact.nodes.filter((node) => node.parentId === parentId && !visited.has(node.id)).forEach((node) => {
      visited.add(node.id)
      subtree.push(node)
      collect(node.id)
    })
    visited.add(source.id)
    subtree.push(source)
    collect(source.id)
    const ids = new Map(subtree.map((node) => [node.id, createId()] as const))
    const clones = subtree.map((node) => {
      const position = positionFor(node)
      return {
        ...node,
        id: ids.get(node.id)!,
        parentId: node.id === source.id ? source.parentId : ids.get(node.parentId ?? '') ?? source.parentId,
        x: position.x + 42,
        y: position.y + 28,
      }
    })
    const nextNodes = [...artifact.nodes, ...clones]
    commitChange({ ...artifact, nodes: nextNodes })
    setSelectedId(ids.get(source.id)!)
    setInspectorOpen(true)
    fitLayout(nextNodes, new Map(nextNodes.map((node) => [node.id, positionFor(node)] as const)))
  }

  const duplicateSelected = () => { if (selected) duplicateNodeById(selected.id) }

  const beginInlineEdit = (node: MindMapNode) => {
    setSelectedId(node.id)
    setEditingText(node.text)
    setEditingId(node.id)
  }

  const handleNodePointerDown = (event: PointerEvent<SVGGElement>, node: MindMapNode, position: { x: number; y: number }) => {
    const now = Date.now()
    const previousTap = lastNodeTapRef.current
    if (previousTap?.id === node.id && now - previousTap.time < 360) {
      lastNodeTapRef.current = null
      event.preventDefault()
      event.stopPropagation()
      beginInlineEdit(node)
      return
    }
    lastNodeTapRef.current = { id: node.id, time: now }
    setSelectedId(node.id)
    setInspectorOpen(true)
    canvas.startNodeDrag(node.id, position.x, position.y, event)
  }

  const commitInlineEdit = () => {
    if (editingId) {
      const text = editingText.trim()
      if (text) commitChange({ ...artifact, nodes: artifact.nodes.map((node) => node.id === editingId ? { ...node, text } : node) }, 'node-text')
    }
    setEditingId(null)
  }

  const deleteNodeById = (nodeId: string) => {
    if (nodeId === root.id) return
    const removed = new Set([nodeId])
    let changed = true
    while (changed) {
      changed = false
      for (const node of artifact.nodes) {
        if (node.parentId && removed.has(node.parentId) && !removed.has(node.id)) { removed.add(node.id); changed = true }
      }
    }
    const nextNodes = artifact.nodes.filter((node) => !removed.has(node.id))
    commitChange({ ...artifact, nodes: nextNodes })
    setSelectedId(artifact.nodes.find((node) => node.id === nodeId)?.parentId ?? root.id)
    const positions = new Map(nextNodes.map((node) => [node.id, positionFor(node)] as const))
    fitLayout(nextNodes, positions)
  }

  const deleteNode = () => { if (selected) deleteNodeById(selected.id) }

  const setDirection = (nextDirection: MindMapDirection) => {
    const nextLayout = getLayout(artifact.nodes, nextDirection, layoutBounds.width, layoutBounds.height, layoutBounds.offsetX, layoutBounds.offsetY)
    commitChange({
      ...artifact,
      direction: nextDirection,
      nodes: artifact.nodes.map((node) => ({ ...node, ...(nextLayout.get(node.id) ?? {}) })),
    })
    fitLayout(artifact.nodes, nextLayout)
  }

  const arrangeNodes = () => {
    const nextLayout = getLayout(artifact.nodes, direction, layoutBounds.width, layoutBounds.height, layoutBounds.offsetX, layoutBounds.offsetY)
    const nextNodes = artifact.nodes.map((node) => ({ ...node, ...(nextLayout.get(node.id) ?? {}) }))
    commitChange({ ...artifact, nodes: nextNodes })
    fitLayout(nextNodes, nextLayout)
  }

  const setConnectionStyle = (nextStyle: MindMapLineStyle) => {
    commitChange({ ...artifact, connectionStyle: nextStyle })
  }

  const setParent = (parentId: string) => {
    if (!selected || selected.id === root.id) return
    const descendants = new Set<string>()
    const collectDescendants = (id: string) => artifact.nodes.filter((node) => node.parentId === id).forEach((node) => { descendants.add(node.id); collectDescendants(node.id) })
    collectDescendants(selected.id)
    if (parentId === selected.id || descendants.has(parentId)) return
    const nextNodes = artifact.nodes.map((node) => node.id === selected.id ? { ...node, parentId, x: undefined, y: undefined } : node.id === parentId ? { ...node, collapsed: false } : node)
    const nextLayout = getLayout(nextNodes, direction, layoutBounds.width, layoutBounds.height, layoutBounds.offsetX, layoutBounds.offsetY)
    commitChange({ ...artifact, nodes: nextNodes.map((node) => ({ ...node, ...(nextLayout.get(node.id) ?? {}) })) })
    fitLayout(nextNodes, nextLayout)
  }

  const focusNode = (nodeId: string) => {
    setSelectedId(nodeId)
    setInspectorOpen(true)
    requestAnimationFrame(() => document.getElementById(`mindmap-node-${nodeId}`)?.focus())
  }

  const activateNode = (event: KeyboardEvent<SVGGElement>, node: MindMapNode) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      if (event.shiftKey) redo()
      else undo()
      return
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault()
      redo()
      return
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
      event.preventDefault()
      duplicateNodeById(node.id)
      return
    }
    if (event.key === 'Tab') {
      event.preventDefault()
      addDirectionalNode(node.id, sideForDirection())
      return
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      addSiblingNode(node)
      return
    }
    if (event.key === ' ') {
      event.preventDefault()
      setSelectedId(node.id)
      setInspectorOpen(true)
      return
    }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      const parentKey = direction === 'down' ? 'ArrowUp' : direction === 'left' ? 'ArrowRight' : 'ArrowLeft'
      const childKey = direction === 'down' ? 'ArrowDown' : direction === 'left' ? 'ArrowLeft' : 'ArrowRight'
      if (event.key === parentKey && node.parentId) {
        event.preventDefault()
        focusNode(node.parentId)
        return
      }
      if (event.key === childKey) {
        const firstChild = visibleNodes.find((item) => item.parentId === node.id)
        if (firstChild) { event.preventDefault(); focusNode(firstChild.id) }
        return
      }
      const siblingKeys = direction === 'down' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown']
      if (siblingKeys.includes(event.key)) {
        const siblings = visibleNodes.filter((item) => item.parentId === node.parentId)
        const index = siblings.findIndex((item) => item.id === node.id)
        const next = siblings[index + (event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1)]
        if (next) { event.preventDefault(); focusNode(next.id) }
        return
      }
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && node.id !== root.id) { event.preventDefault(); deleteNodeById(node.id) }
  }

  const visibleParents = artifact.nodes.filter((node) => {
    if (!selected || node.id === selected.id) return false
    const descendants = new Set<string>()
    const collectDescendants = (id: string) => artifact.nodes.filter((child) => child.parentId === id).forEach((child) => { descendants.add(child.id); collectDescendants(child.id) })
    collectDescendants(selected.id)
    return !descendants.has(node.id)
  })

  const closeExportMenu = () => { if (exportMenuRef.current) exportMenuRef.current.open = false }
  const getExportSvg = () => createMindMapSvg(artifact, new Map(artifact.nodes.map((node) => [node.id, positionFor(node)] as const)))
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
    downloadText(artifact.title, 'aeback', createMindMapProject(artifact), 'application/vnd.aeback.project+json;charset=utf-8')
  }
  const exportOutline = () => {
    closeExportMenu()
    downloadText(artifact.title, 'md', createMindMapOutline(artifact), 'text/markdown;charset=utf-8')
  }
  const importProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    closeExportMenu()
    try {
      assertMindMapProjectFileSize(file)
      const project = parseMindMapProject(JSON.parse(await readTextFile(file)))
      if (!window.confirm(`导入「${project.title}」并替换当前思维导图？当前版本可用撤销恢复。`)) return
      commitChange({ ...project, id: artifact.id, updatedAt: new Date().toISOString() })
      setSelectedId(project.nodes.find((node) => node.parentId === null)?.id ?? '')
      setInspectorOpen(true)
      canvas.resetCamera()
      setExportNotice('工程已导入')
    } catch (error) {
      setExportNotice(error instanceof Error ? error.message : '工程导入失败')
    } finally {
      input.value = ''
      window.setTimeout(() => setExportNotice(''), 4000)
    }
  }

  return (
    <div className="canvas-workspace canvas-workspace--mindmap">
      <svg
        ref={canvas.svgRef}
        className="full-canvas"
        viewBox={`0 0 ${size.width} ${size.height}`}
        preserveAspectRatio="none"
        aria-label={`${artifact.title} 思维导图画布`}
        onPointerDown={canvas.startPan}
        onPointerMove={canvas.onPointerMove}
        onPointerUp={(event) => { canvas.stopGesture(event); finishHistoryGroup() }}
        onPointerCancel={(event) => { canvas.stopGesture(event); finishHistoryGroup() }}
        onWheel={canvas.onWheel}
      >
        <defs><pattern id="aeback-mindmap-grid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M 26 0 H 0 V 26" fill="none" stroke="var(--aeback-grid)" strokeWidth="1" /></pattern></defs>
        <rect className="canvas-background" x="0" y="0" width={size.width} height={size.height} fill="url(#aeback-mindmap-grid)" />
        <g transform={`translate(${canvas.camera.x} ${canvas.camera.y}) scale(${canvas.camera.zoom})`}>
          {visibleNodes.filter((node) => node.parentId && visibleNodeIds.has(node.parentId)).map((node) => {
            const fromNode = artifact.nodes.find((item) => item.id === node.parentId)!
            const from = positionFor(fromNode)
            const to = positionFor(node)
            const dx = to.x - from.x
            const dy = to.y - from.y
            const midpointX = (from.x + to.x) / 2
            const midpointY = (from.y + to.y) / 2
            const horizontal = Math.abs(dx) >= Math.abs(dy)
            const controlX = horizontal ? midpointX : from.x
            const controlY = horizontal ? from.y : midpointY
            const path = connectionStyle === 'orthogonal'
              ? horizontal
                ? `M ${from.x} ${from.y} L ${midpointX} ${from.y} L ${midpointX} ${to.y} L ${to.x} ${to.y}`
                : `M ${from.x} ${from.y} L ${from.x} ${midpointY} L ${to.x} ${midpointY} L ${to.x} ${to.y}`
              : `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`
            return <path key={`edge-${node.id}`} className={`mindmap-connection mindmap-connection--${connectionStyle} mindmap-connection--${defaultColor(node, root.id, artifact.nodes.indexOf(node))}`} d={path} />
          })}
          {visibleNodes.map((node) => {
            const position = positionFor(node)
            const nodeWidth = position.depth === 0 ? 178 : 154
            const nodeHeight = position.depth === 0 ? 64 : 54
            const selectedNode = node.id === selected?.id
            const color = defaultColor(node, root.id, artifact.nodes.indexOf(node))
            const childCount = artifact.nodes.filter((child) => child.parentId === node.id).length
            const hiddenCount = node.collapsed ? getDescendantCount(node.id, artifact.nodes) : 0
            return <g key={node.id} id={`mindmap-node-${node.id}`} data-node-id={node.id} className={`canvas-node mindmap-node${selectedNode ? ' canvas-node--selected' : ''}`} transform={`translate(${position.x - nodeWidth / 2} ${position.y - nodeHeight / 2})`} role="button" tabIndex={0} aria-label={`编辑节点：${node.text}`} onPointerDown={(event) => handleNodePointerDown(event, node, position)} onKeyDown={(event) => activateNode(event, node)}>
              <title>{node.text}</title>
              <rect className="canvas-node-shape" width={nodeWidth} height={nodeHeight} rx={position.depth === 0 ? 16 : 13} data-color={color} style={{ fillOpacity: Math.max(0, Math.min(100, node.opacity ?? 100)) / 100 }} />
              {editingId === node.id ? <foreignObject className="mindmap-inline-editor" x="4" y="4" width={nodeWidth - 8} height={nodeHeight - 8}>
                <input ref={inlineInputRef} aria-label="编辑节点文字" value={editingText} onChange={(event) => setEditingText(event.target.value)} onBlur={commitInlineEdit} onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => { event.stopPropagation(); if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } }} />
              </foreignObject> : <text className="canvas-node-label" x={nodeWidth / 2} y={nodeHeight / 2 + 4} textAnchor="middle">{node.text.length > (position.depth === 0 ? 12 : 10) ? `${node.text.slice(0, position.depth === 0 ? 11 : 9)}…` : node.text}</text>}
              {editingId !== node.id && (['up', 'right', 'down', 'left'] as MindMapSide[]).map((side) => {
                const point = side === 'up' ? { x: nodeWidth / 2, y: 0 }
                  : side === 'right' ? { x: nodeWidth, y: nodeHeight / 2 }
                    : side === 'down' ? { x: nodeWidth / 2, y: nodeHeight }
                      : { x: 0, y: nodeHeight / 2 }
                return <g key={side} className="mindmap-add-handle" transform={`translate(${point.x} ${point.y})`} role="button" tabIndex={selectedNode ? 0 : -1} aria-label={`在节点${sideLabels[side]}添加节点`} onPointerDown={(event) => { event.stopPropagation(); setSelectedId(node.id) }} onClick={(event) => { event.preventDefault(); event.stopPropagation(); addDirectionalNode(node.id, side) }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); addDirectionalNode(node.id, side) } }}>
                  <title>{`在${sideLabels[side]}添加节点`}</title>
                  <circle className="mindmap-add-handle-bg" r="10" />
                  <path d="M -3.5 0 H 3.5 M 0 -3.5 V 3.5" />
                </g>
              })}
              {editingId !== node.id && childCount > 0 && <g className={`mindmap-collapse-handle${node.collapsed ? ' mindmap-collapse-handle--collapsed' : ''}`} transform={`translate(${nodeWidth - 2} 2)`} role="button" tabIndex={selectedNode ? 0 : -1} aria-label={node.collapsed ? `展开分支，包含 ${hiddenCount} 个节点` : '折叠分支'} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.preventDefault(); event.stopPropagation(); toggleCollapse(node.id) }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); toggleCollapse(node.id) } }}>
                <title>{node.collapsed ? `展开 ${hiddenCount} 个节点` : '折叠分支'}</title>
                <circle r="10" /><text textAnchor="middle" y="3.2">{node.collapsed ? hiddenCount : '−'}</text>
              </g>}
            </g>
          })}
        </g>
      </svg>

      <CanvasHeader title={artifact.title} onTitleChange={(title) => commitChange({ ...artifact, title }, 'map-title')} onBack={onBack} onDelete={onDelete} theme={theme} onToggleTheme={onToggleTheme}>
        <details className="canvas-export-menu" ref={exportMenuRef}>
          <summary className="canvas-header-action" aria-label="导出或导入思维导图"><Icon name="download" size={15} /><span>导出</span></summary>
          <div className="canvas-export-dropdown">
            <button type="button" onClick={() => void exportRaster('png')}>导出 PNG 图片</button>
            <button type="button" onClick={() => void exportRaster('jpg')}>导出 JPG 图片</button>
            <button type="button" onClick={exportSvg}>导出 SVG 矢量图</button>
            <button type="button" onClick={exportProject}>导出 Aeback 工程</button>
            <button type="button" onClick={exportOutline}>导出 Markdown 大纲</button>
            <div className="canvas-export-divider" />
            <button type="button" onClick={() => projectFileRef.current?.click()}>导入 Aeback 工程</button>
            <input ref={projectFileRef} hidden type="file" accept=".aeback,application/json" aria-label="选择 Aeback 思维导图工程" onChange={(event) => void importProject(event)} />
          </div>
        </details>
      </CanvasHeader>
      {exportNotice && <div className="canvas-export-status" role="status">{exportNotice}</div>}
      <div className="canvas-tool-rail" role="toolbar" aria-label="思维导图工具">
        <button className="canvas-tool-primary" type="button" aria-label="添加节点" title="添加节点" onClick={addNode}><Icon name="plus" size={18} /></button>
        <div className="history-controls" role="group" aria-label="撤销与重做"><button className="direction-button" type="button" aria-label="撤销" title="撤销 Ctrl+Z" disabled={!historyStatus.canUndo} onClick={undo}><Icon name="undo" size={16} /></button><button className="direction-button" type="button" aria-label="重做" title="重做 Ctrl+Shift+Z" disabled={!historyStatus.canRedo} onClick={redo}><Icon name="redo" size={16} /></button></div>
        <div className="canvas-tool-separator" />
        <div className="direction-controls" role="group" aria-label="布局方向">
          {directions.map(({ value, label, icon }) => <button className={`direction-button${direction === value ? ' direction-button--active' : ''}`} type="button" key={value} aria-label={label} title={label} aria-pressed={direction === value} onClick={() => setDirection(value)}><Icon name={icon} size={16} /></button>)}
        </div>
        <div className="canvas-tool-separator" />
        <div className="line-style-controls" role="group" aria-label="连线样式">
          {lineStyles.map(({ value, label, icon }) => <button className={`direction-button${connectionStyle === value ? ' direction-button--active' : ''}`} type="button" key={value} aria-label={label} title={label} aria-pressed={connectionStyle === value} onClick={() => setConnectionStyle(value)}><Icon name={icon} size={16} /></button>)}
        </div>
        <div className="canvas-tool-separator" />
        <button className="direction-button" type="button" aria-label="自动整理布局" title="自动整理布局" onClick={arrangeNodes}><Icon name="arrange" size={16} /></button>
        <div className="canvas-tool-separator" />
        <button className={`canvas-tool-toggle${inspectorOpen ? ' canvas-tool-toggle--active' : ''}`} type="button" aria-label={inspectorOpen ? '隐藏节点属性' : '显示节点属性'} aria-pressed={inspectorOpen} title={inspectorOpen ? '隐藏节点属性' : '显示节点属性'} onClick={() => setInspectorOpen((open) => !open)}><Icon name="list" size={16} /></button>
      </div>
      <div className="canvas-zoom" role="toolbar" aria-label="画布缩放">
        <button type="button" aria-label="放大" onClick={canvas.zoomIn}>+</button><span>{Math.round(canvas.camera.zoom * 100)}%</span><button type="button" aria-label="缩小" onClick={canvas.zoomOut}>−</button><i /><button type="button" aria-label="重置画布" title="重置画布" onClick={canvas.resetCamera}><Icon name="grid" size={15} /></button>
      </div>
      {selected && inspectorOpen && <aside className="canvas-inspector" aria-label="节点属性">
        <div className="canvas-inspector-heading"><span>节点</span>{selected.id !== root.id && <div className="canvas-inspector-actions"><button type="button" aria-label="复制节点分支" title="复制节点分支" onClick={duplicateSelected}><Icon name="duplicate" size={15} /></button><button type="button" aria-label="删除节点" title="删除节点" onClick={deleteNode}><Icon name="trash" size={15} /></button></div>}</div>
        <label className="canvas-label" htmlFor="mindmap-node-name">内容</label>
        <input id="mindmap-node-name" value={selected.text} onChange={(event) => commitChange({ ...artifact, nodes: artifact.nodes.map((node) => node.id === selected.id ? { ...node, text: event.target.value } : node) }, 'node-text')} />
        {selected.id !== root.id && <>
          <label className="canvas-label" htmlFor="mindmap-node-parent">父节点</label>
          <select id="mindmap-node-parent" value={selected.parentId ?? root.id} onChange={(event) => setParent(event.target.value)}>{visibleParents.map((node) => <option key={node.id} value={node.id}>{node.text}</option>)}</select>
        </>}
        <span className="canvas-label">节点颜色</span>
        <div className="color-palette" role="group" aria-label="节点颜色">{palette.map((color) => <button className={`color-swatch color-swatch--${color.value}${defaultColor(selected, root.id, artifact.nodes.indexOf(selected)) === color.value ? ' color-swatch--selected' : ''}`} type="button" key={color.value} aria-label={color.label} aria-pressed={defaultColor(selected, root.id, artifact.nodes.indexOf(selected)) === color.value} title={color.label} onClick={() => commitChange({ ...artifact, nodes: artifact.nodes.map((node) => node.id === selected.id ? { ...node, color: color.value } : node) })} />)}</div>
        <label className="canvas-label canvas-opacity-label" htmlFor="mindmap-node-opacity"><span>填充透明度</span><output htmlFor="mindmap-node-opacity">{selected.opacity ?? 100}%</output></label>
        <input className="canvas-opacity-slider" id="mindmap-node-opacity" type="range" min="0" max="100" step="5" value={selected.opacity ?? 100} aria-label="节点填充透明度" onChange={(event) => { const opacity = Number(event.target.value); commitChange({ ...artifact, nodes: artifact.nodes.map((node) => node.id === selected.id ? { ...node, opacity } : node) }, 'opacity') }} onPointerUp={finishHistoryGroup} onKeyUp={finishHistoryGroup} />
      </aside>}
      <div className="canvas-help">拖动节点 · 空白处平移 · 滚轮缩放</div>
    </div>
  )
}

export default MindMapEditor
