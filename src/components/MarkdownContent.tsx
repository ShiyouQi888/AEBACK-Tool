// Aeback Markdown renderer — safe React output with GFM tables and stable heading anchors.
import { createElement, type ReactNode } from 'react'
import Markdown, { type ExtraProps } from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function MarkdownContent({ content }: { content: string }) {
  const heading = (level: number) => ({ node, children }: ExtraProps & { children?: ReactNode }) => createElement(`h${level}`, { id: `aeback-heading-${node?.position?.start.offset ?? 0}` }, children)
  return <Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
    h1: heading(1), h2: heading(2), h3: heading(3), h4: heading(4), h5: heading(5), h6: heading(6),
    a: ({ node: _node, ...props }) => props.href ? <a {...props} target={props.href.startsWith('#') ? undefined : '_blank'} rel="noopener noreferrer" /> : <span>{props.children}</span>,
  }}>{content}</Markdown>
}
