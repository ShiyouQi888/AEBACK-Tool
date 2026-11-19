// Aeback Markdown renderer — safe React output with GFM, syntax highlighting, and portable code blocks.
import { Children, createElement, isValidElement, useEffect, useRef, useState, type ReactNode } from 'react'
import Markdown, { type ExtraProps } from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import type { Plugin } from 'unified'

type HastNode = { type: string; tagName?: string; value?: string; properties?: Record<string, unknown>; children?: HastNode[] }

const rehypeInlineHighlight: Plugin<[], HastNode> = () => (tree) => {
  const visit = (parent: HastNode) => {
    if (parent.type === 'element' && (parent.tagName === 'pre' || parent.tagName === 'code')) return
    if (!parent.children) return
    const next: HastNode[] = []
    for (const child of parent.children) {
      if (child.type !== 'text' || !child.value) {
        visit(child)
        next.push(child)
        continue
      }
      const pattern = /==([^=\n]+)==/g
      let cursor = 0
      for (const match of child.value.matchAll(pattern)) {
        const index = match.index ?? 0
        if (index > cursor) next.push({ type: 'text', value: child.value.slice(cursor, index) })
        next.push({ type: 'element', tagName: 'mark', properties: {}, children: [{ type: 'text', value: match[1] }] })
        cursor = index + match[0].length
      }
      if (cursor === 0) next.push(child)
      else if (cursor < child.value.length) next.push({ type: 'text', value: child.value.slice(cursor) })
    }
    parent.children = next
  }
  visit(tree)
}

const languageNames: Record<string, string> = {
  bash: 'Bash', sh: 'Shell', shell: 'Shell', c: 'C', cpp: 'C++', cs: 'C#', css: 'CSS', diff: 'Diff', go: 'Go',
  html: 'HTML', java: 'Java', js: 'JavaScript', javascript: 'JavaScript', json: 'JSON', jsx: 'JSX', kt: 'Kotlin',
  md: 'Markdown', markdown: 'Markdown', py: 'Python', python: 'Python', rb: 'Ruby', rust: 'Rust', sql: 'SQL',
  swift: 'Swift', ts: 'TypeScript', typescript: 'TypeScript', tsx: 'TSX', xml: 'XML', yaml: 'YAML', yml: 'YAML',
}

function flattenText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(flattenText).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return flattenText(node.props.children)
  return ''
}

function CodeBlock({ language, source, children, interactive }: { language: string; source: string; children: ReactNode; interactive: boolean }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const resetTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(resetTimer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(source)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
    window.clearTimeout(resetTimer.current)
    resetTimer.current = window.setTimeout(() => setCopyState('idle'), 1600)
  }

  const languageLabel = languageNames[language.toLowerCase()] ?? (language ? language.toUpperCase() : 'TEXT')
  return <div className="document-codeblock">
    {interactive && <div className="document-codeblock-toolbar"><span>{languageLabel}</span><button type="button" onClick={() => void copy()}>{copyState === 'copied' ? '已复制' : copyState === 'failed' ? '复制失败' : '复制代码'}</button></div>}
    <pre>{children}</pre>
  </div>
}

export default function MarkdownContent({ content, interactive = true }: { content: string; interactive?: boolean }) {
  const heading = (level: number) => ({ node, children }: ExtraProps & { children?: ReactNode }) => createElement(`h${level}`, { id: `aeback-heading-${node?.position?.start.offset ?? 0}` }, children)
  return <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight, rehypeInlineHighlight]} skipHtml components={{
    h1: heading(1), h2: heading(2), h3: heading(3), h4: heading(4), h5: heading(5), h6: heading(6),
    a: ({ node: _node, ...props }) => props.href ? <a {...props} target={props.href.startsWith('#') ? undefined : '_blank'} rel="noopener noreferrer" /> : <span>{props.children}</span>,
    pre: ({ node: _node, children }) => {
      const code = Children.toArray(children).find((child) => isValidElement(child) && child.type === 'code')
      if (!isValidElement<{ className?: string; children?: ReactNode }>(code)) return <pre>{children}</pre>
      const language = code.props.className?.match(/(?:language|lang)-([\w+-]+)/)?.[1] ?? ''
      return <CodeBlock language={language} source={flattenText(code.props.children)} interactive={interactive}>{children}</CodeBlock>
    },
  }}>{content}</Markdown>
}
