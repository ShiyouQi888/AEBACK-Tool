// Aeback local article parser — preserves heading/list hierarchy and evidence as graph nodes.
import type { GraphArtifact, KnowledgeEdge, KnowledgeNode, NodeColor } from '../types'

function concise(text: string, limit = 34) {
  const normalized = text.replace(/^#+\s*/, '').replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/, '').replace(/\*\*|__|`/g, '').trim()
  return normalized.length > limit ? `${normalized.slice(0, limit)}…` : normalized
}

function makeId() {
  return `article-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`
}

export function parseArticle(title: string, text: string): GraphArtifact {
  const rootId = makeId()
  const articleTitle = title.trim() || '文章知识图谱'
  const branchColors: NodeColor[] = ['blue', 'violet', 'amber', 'coral', 'slate', 'green']
  const colorByNode = new Map<string, NodeColor>([[rootId, 'green']])
  let nextBranchColor = 0
  const nodes: KnowledgeNode[] = [{ id: rootId, text: articleTitle, kind: 'article', source: articleTitle, color: 'green' }]
  const edges: KnowledgeEdge[] = []
  const headingStack: Array<{ level: number; id: string }> = [{ level: 0, id: rootId }]
  const listStack: Array<{ indent: number; id: string }> = []
  const nodeByText = new Map<string, string>()
  const edgeKeys = new Set<string>()
  const maxNodes = 60

  const addEdge = (fromId: string, toId: string, label: string) => {
    if (fromId === toId) return
    const key = `${fromId}::${toId}::${label}`
    if (edgeKeys.has(key)) return
    edgeKeys.add(key)
    edges.push({ id: makeId(), fromId, toId, label, directed: true })
  }

  const addKnowledge = (fullText: string, parentId: string, kind: KnowledgeNode['kind'], relation: string) => {
    const cleanText = fullText.replace(/\s+/g, ' ').trim()
    const label = concise(cleanText, 34)
    if (label.length < 2) return undefined
    const key = cleanText.toLocaleLowerCase()
    const existingId = nodeByText.get(key)
    if (existingId) {
      addEdge(parentId, existingId, relation)
      return existingId
    }
    if (nodes.length >= maxNodes) return undefined
    const id = makeId()
    const color = parentId === rootId ? branchColors[nextBranchColor++ % branchColors.length] : colorByNode.get(parentId) ?? 'blue'
    nodes.push({ id, text: label, kind, source: cleanText.slice(0, 240), color })
    colorByNode.set(id, color)
    nodeByText.set(key, id)
    addEdge(parentId, id, relation)
    return id
  }

  for (const rawLine of text.split(/\r?\n/)) {
    if (!rawLine.trim()) continue
    const heading = rawLine.match(/^\s*(#{1,6})\s+(.+)$/)
    if (heading) {
      const level = heading[1].length
      while (headingStack.length > 1 && headingStack[headingStack.length - 1].level >= level) headingStack.pop()
      const parentId = headingStack[headingStack.length - 1].id
      const id = addKnowledge(heading[2], parentId, 'concept', '章节')
      listStack.length = 0
      if (id) headingStack.push({ level, id })
      continue
    }

    const bullet = rawLine.match(/^(\s*)(?:[-*+]\s+|\d+[.)]\s+)(.+)$/)
    if (bullet) {
      const indent = bullet[1].replace(/\t/g, '  ').length
      while (listStack.length && listStack[listStack.length - 1].indent >= indent) listStack.pop()
      const parentId = listStack[listStack.length - 1]?.id ?? headingStack[headingStack.length - 1].id
      const id = addKnowledge(bullet[2], parentId, 'idea', '包含')
      if (id) listStack.push({ indent, id })
      continue
    }

    listStack.length = 0
    const paragraph = rawLine.replace(/^\s*>\s?/, '').trim()
    const sentences = paragraph.split(/(?<=[。！？.!?；;])\s*/).map((sentence) => sentence.trim()).filter((sentence) => sentence.length >= 7)
    const parentId = headingStack[headingStack.length - 1].id
    sentences.forEach((sentence) => addKnowledge(sentence, parentId, 'idea', '要点'))
  }

  return {
    id: makeId(),
    type: 'graph',
    title: articleTitle,
    updatedAt: new Date().toISOString(),
    rootId,
    nodes,
    edges,
    sourceText: text,
  }
}
