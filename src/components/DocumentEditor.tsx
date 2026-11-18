// Aeback smart document — quiet markdown writing with a generated outline.
import { useMemo, useRef, useState } from 'react'
import type { DocumentArtifact } from '../types'
import Icon from './Icon'

type DocumentEditorProps = {
  artifact: DocumentArtifact
  onChange: (artifact: DocumentArtifact) => void
}

function DocumentEditor({ artifact, onChange }: DocumentEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const [showOutline, setShowOutline] = useState(false)
  const outline = useMemo(() => artifact.content.split(/\r?\n/).reduce<Array<{ title: string; offset: number }>>((items, line, index, lines) => {
    const offset = lines.slice(0, index).reduce((sum, row) => sum + row.length + 1, 0)
    const heading = line.match(/^#{1,3}\s+(.+)$/)?.[1]?.trim()
    const paragraph = line.trim()
    const title = heading || (paragraph ? paragraph.slice(0, 32) : '')
    if (title && !items.some((item) => item.title === title)) items.push({ title, offset })
    return items
  }, []), [artifact.content])
  const jumpTo = (offset: number) => {
    editorRef.current?.focus()
    editorRef.current?.setSelectionRange(offset, offset)
  }
  const wordCount = Array.from(artifact.content.trim()).filter((character) => !/\s/.test(character)).length

  return (
    <section className="document-editor-shell">
      <div className="document-toolbar">
        <button className={`tool-button${showOutline ? ' tool-button--active' : ''}`} type="button" onClick={() => setShowOutline((value) => !value)}><Icon name="list" size={16} />大纲</button>
        <span className="document-count">{wordCount} 字</span>
      </div>
      <div className={`document-layout${showOutline ? ' document-layout--with-outline' : ''}`}>
        {showOutline && <aside className="document-outline"><div>大纲</div>{outline.length ? outline.map((item) => <button key={`${item.offset}-${item.title}`} type="button" onClick={() => jumpTo(item.offset)}>{item.title}</button>) : <p>—</p>}</aside>}
        <div className="document-page"><textarea ref={editorRef} aria-label="文档正文" value={artifact.content} onChange={(event) => onChange({ ...artifact, content: event.target.value })} /></div>
      </div>
    </section>
  )
}

export default DocumentEditor
