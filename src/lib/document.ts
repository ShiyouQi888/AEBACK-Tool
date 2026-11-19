// Aeback document structure — parse headings from Markdown syntax, excluding code and ordinary paragraphs.
import remarkParse from 'remark-parse'
import { unified } from 'unified'

export function documentOutline(content: string) {
  const tree = unified().use(remarkParse).parse(content)
  const textOf = (node: { value?: string; children?: unknown[] }): string => node.value ?? node.children?.map((child) => textOf(child as typeof node)).join('') ?? ''
  return tree.children.filter((node) => node.type === 'heading').map((node) => ({ title: textOf(node), depth: node.depth, offset: node.position?.start.offset ?? 0 }))
}
