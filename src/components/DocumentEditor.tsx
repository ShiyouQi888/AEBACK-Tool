// Aeback document workspace — Markdown editing, safe preview, outline, find, history, and portable exports.
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { DocumentArtifact } from '../types'
import { downloadText, readTextFile } from '../lib/files'
import { useArtifactHistory } from '../lib/useArtifactHistory'
import MarkdownContent from './MarkdownContent'
import { documentOutline } from '../lib/document'
import Icon from './Icon'

type DocumentEditorProps = { artifact: DocumentArtifact; onChange: (artifact: DocumentArtifact) => void }
type View = 'edit' | 'split' | 'preview'

function DocumentEditor({ artifact, onChange }: DocumentEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const findRef = useRef<HTMLInputElement>(null)
  const [showOutline, setShowOutline] = useState(true)
  const [activeHeading, setActiveHeading] = useState<number | null>(null)
  const [view, setView] = useState<View>('edit')
  const [findOpen, setFindOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [matchIndex, setMatchIndex] = useState(-1)
  const [message, setMessage] = useState('')
  const [cursor, setCursor] = useState({ line: 1, column: 1 })
  const history = useArtifactHistory(artifact, onChange)
  const outline = useMemo(() => documentOutline(artifact.content), [artifact.content])
  const matches = useMemo(() => {
    if (!query) return []
    const source = artifact.content.toLocaleLowerCase()
    const search = query.toLocaleLowerCase()
    const offsets: number[] = []
    for (let index = source.indexOf(search); index >= 0; index = source.indexOf(search, index + search.length)) offsets.push(index)
    return offsets
  }, [artifact.content, query])
  const wordCount = Array.from(artifact.content).filter((character) => !/\s/.test(character)).length
  const update = (content: string, group = '') => history.commit({ ...artifact, content }, group)
  const selectText = (start: number, end = start) => requestAnimationFrame(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    editor.setSelectionRange(start, end)
    const mirror = document.createElement('div')
    const style = window.getComputedStyle(editor)
    for (const property of ['font', 'line-height', 'letter-spacing', 'padding', 'border', 'box-sizing', 'tab-size', 'overflow-wrap']) mirror.style.setProperty(property, style.getPropertyValue(property))
    Object.assign(mirror.style, { position: 'absolute', visibility: 'hidden', width: `${editor.clientWidth}px`, whiteSpace: 'pre-wrap', wordBreak: 'break-word' })
    mirror.textContent = editor.value.slice(0, start)
    const marker = document.createElement('span')
    marker.textContent = '\u200b'
    mirror.append(marker)
    document.body.append(mirror)
    editor.scrollTop = Math.max(0, marker.offsetTop - editor.clientHeight / 3)
    mirror.remove()
  })
  const editable = () => { if (view === 'preview') setView('edit') }
  const wrap = (before: string, after = before, placeholder = '文字') => {
    editable()
    const editor = editorRef.current
    const start = editor?.selectionStart ?? artifact.content.length
    const end = editor?.selectionEnd ?? start
    const selection = artifact.content.slice(start, end) || placeholder
    update(artifact.content.slice(0, start) + before + selection + after + artifact.content.slice(end))
    selectText(start + before.length, start + before.length + selection.length)
  }
  const prefixLines = (prefix: string) => {
    editable()
    const editor = editorRef.current
    const start = editor?.selectionStart ?? artifact.content.length
    const end = editor?.selectionEnd ?? start
    const lineStart = start === 0 ? 0 : artifact.content.lastIndexOf('\n', start - 1) + 1
    const nextBreak = artifact.content.indexOf('\n', end)
    const lineEnd = nextBreak < 0 ? artifact.content.length : nextBreak
    const lines = artifact.content.slice(lineStart, lineEnd).split('\n')
    const remove = lines.every((line) => line.startsWith(prefix))
    const changed = lines.map((line) => remove ? line.slice(prefix.length) : prefix + line).join('\n')
    update(artifact.content.slice(0, lineStart) + changed + artifact.content.slice(lineEnd))
    selectText(lineStart, lineStart + changed.length)
  }
  const jumpTo = (offset: number) => {
    setActiveHeading(offset)
    if (view === 'preview') previewRef.current?.querySelector(`#aeback-heading-${offset}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    else selectText(offset)
  }
  const findNext = (delta = 1) => {
    if (!matches.length) return
    editable()
    const next = (matchIndex + delta + matches.length) % matches.length
    setMatchIndex(next)
    selectText(matches[next], matches[next] + query.length)
  }
  const replace = (all: boolean) => {
    if (!matches.length) return
    editable()
    if (all) {
      let content = artifact.content
      for (let index = matches.length - 1; index >= 0; index -= 1) content = content.slice(0, matches[index]) + replacement + content.slice(matches[index] + query.length)
      update(content)
      setMessage(`已替换 ${matches.length} 处`)
      setMatchIndex(-1)
    } else {
      const index = matches[matchIndex < 0 ? 0 : matchIndex % matches.length]
      update(artifact.content.slice(0, index) + replacement + artifact.content.slice(index + query.length))
      selectText(index, index + replacement.length)
      setMatchIndex(-1)
    }
  }
  const exportHtml = async (print = false) => {
    const { renderToStaticMarkup } = await import('react-dom/server')
    const title = artifact.title.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
    const body = renderToStaticMarkup(<MarkdownContent content={artifact.content} />)
    const html = `<!doctype html>\n<!-- Aeback document export -->\n<html lang="zh-CN"><meta charset="utf-8"><title>${title}</title><style>body{max-width:800px;margin:48px auto;padding:0 24px;color:#222;font:16px/1.8 system-ui}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px}pre{padding:16px;background:#f4f4f4;white-space:pre-wrap}img{max-width:100%}blockquote{border-left:3px solid #ccc;margin-left:0;padding-left:20px}@media print{body{margin:0;max-width:none}a{color:inherit}}</style><body><h1>${title}</h1>${body}</body></html>`
    if (!print) { downloadText(artifact.title, 'html', html, 'text/html;charset=utf-8'); return }
    const frame = document.createElement('iframe')
    frame.title = 'Aeback 文档打印'
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0'
    frame.onload = () => { frame.contentWindow?.focus(); frame.contentWindow?.print(); window.setTimeout(() => frame.remove(), 60000) }
    frame.srcdoc = html
    document.body.append(frame)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.nativeEvent.isComposing) return
    if (event.ctrlKey || event.metaKey) {
      const key = event.key.toLowerCase()
      if (event.target instanceof HTMLInputElement && !['f', 's'].includes(key)) return
      if (['z', 'y', 'b', 'i', 'k', 'f', 's'].includes(key)) {
        event.preventDefault()
        if (key === 'z') { if (event.shiftKey) history.redo(); else history.undo() }
        if (key === 'y') history.redo()
        if (key === 'b') wrap('**')
        if (key === 'i') wrap('*')
        if (key === 'k') wrap('[', '](https://)', '链接文字')
        if (key === 'f') { setFindOpen(true); requestAnimationFrame(() => findRef.current?.focus()) }
        if (key === 's') setMessage('正文会自动保存到本地')
      }
    }
  }

  return <section className="document-editor-shell aeback-document" onKeyDown={onKeyDown}>
    <div className="editor-commandbar">
      <div className="editor-command-group">
        <button className={`tool-button${showOutline ? ' tool-button--active' : ''}`} type="button" aria-label="文档大纲" aria-pressed={showOutline} onClick={() => setShowOutline((value) => !value)}><Icon name="list" size={16} /></button>
        <button className="tool-button" type="button" aria-label="撤销" title="撤销 Ctrl+Z" disabled={!history.canUndo} onClick={() => { history.undo(); setMessage('') }}><Icon name="undo" size={16} /></button>
        <button className="tool-button" type="button" aria-label="重做" title="重做 Ctrl+Shift+Z" disabled={!history.canRedo} onClick={() => { history.redo(); setMessage('') }}><Icon name="redo" size={16} /></button>
        <button className="tool-button" type="button" aria-label="查找替换" title="查找替换 Ctrl+F" aria-expanded={findOpen} onClick={() => { setFindOpen((value) => !value); requestAnimationFrame(() => findRef.current?.focus()) }}><Icon name="search" size={16} /></button>
      </div>
      <div className="editor-segmented" role="group" aria-label="文档视图">{([{ id: 'edit', label: '编辑' }, { id: 'split', label: '分屏' }, { id: 'preview', label: '阅读' }] as const).map((item) => <button key={item.id} type="button" aria-pressed={view === item.id} onClick={() => setView(item.id)}>{item.label}</button>)}</div>
      <div className="editor-command-group">
        <button className="tool-button" type="button" onClick={() => importRef.current?.click()}>导入</button>
        <details className="editor-menu"><summary>导出</summary><div><button type="button" onClick={() => downloadText(artifact.title, 'md', artifact.content, 'text/markdown;charset=utf-8')}>Markdown</button><button type="button" onClick={() => void exportHtml()}>HTML</button><button type="button" onClick={() => void exportHtml(true)}>打印 / PDF</button></div></details>
      </div>
    </div>
    {view !== 'preview' && <div className="document-formatbar" role="toolbar" aria-label="文字格式">
      <button type="button" title="一级标题" onClick={() => prefixLines('# ')}>H1</button><button type="button" title="二级标题" onClick={() => prefixLines('## ')}>H2</button><button type="button" aria-label="加粗" title="加粗 Ctrl+B" onClick={() => wrap('**')}><b>B</b></button><button type="button" aria-label="斜体" title="斜体 Ctrl+I" onClick={() => wrap('*')}><i>I</i></button><button type="button" aria-label="删除线" title="删除线" onClick={() => wrap('~~')}><s>S</s></button><span />
      <button type="button" aria-label="无序列表" title="无序列表" onClick={() => prefixLines('- ')}><Icon name="list" size={16} /></button><button type="button" aria-label="任务列表" title="任务列表" onClick={() => prefixLines('- [ ] ')}>☐</button><button type="button" aria-label="引用" title="引用" onClick={() => prefixLines('> ')}>❞</button><button type="button" aria-label="插入链接" title="链接 Ctrl+K" onClick={() => wrap('[', '](https://)', '链接文字')}>↗</button><button type="button" aria-label="代码块" title="代码块" onClick={() => wrap('\n```\n', '\n```\n', '代码')}>{'</>'}</button><button type="button" aria-label="插入表格" title="插入表格" onClick={() => wrap('\n', '\n', '| 列名 | 列名 |\n| --- | --- |\n| 内容 | 内容 |')}><Icon name="table" size={16} /></button>
    </div>}
    {findOpen && <div className="document-findbar"><input ref={findRef} aria-label="查找文字" placeholder="查找" value={query} onChange={(event) => { setQuery(event.target.value); setMatchIndex(-1) }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); findNext(event.shiftKey ? -1 : 1) } if (event.key === 'Escape') setFindOpen(false) }} /><span>{matches.length ? `${matchIndex < 0 ? 0 : matchIndex + 1} / ${matches.length}` : '0'}</span><button className="tool-button" type="button" disabled={!matches.length} onClick={() => findNext(-1)}>上一处</button><button className="tool-button" type="button" disabled={!matches.length} onClick={() => findNext()}>下一处</button><input aria-label="替换文字" placeholder="替换为" value={replacement} onChange={(event) => setReplacement(event.target.value)} /><button className="tool-button" type="button" disabled={!matches.length} onClick={() => replace(false)}>替换</button><button className="tool-button" type="button" disabled={!matches.length} onClick={() => replace(true)}>全部替换</button><button className="tool-button" type="button" aria-label="关闭查找" onClick={() => setFindOpen(false)}><Icon name="close" size={14} /></button></div>}
    <div className={`document-layout${showOutline ? ' document-layout--with-outline' : ''}`}>
      {showOutline && <aside className="document-outline" aria-label="文档目录"><div>大纲</div>{outline.map((item) => <button key={item.offset} type="button" title={item.title} aria-current={activeHeading === item.offset ? 'location' : undefined} style={{ paddingLeft: 9 + Math.min(item.depth - 1, 4) * 10 }} onClick={() => jumpTo(item.offset)}>{item.title}</button>)}{!outline.length && <p>暂无标题</p>}</aside>}
      <div className={`document-panes document-panes--${view}`}>
        {view !== 'preview' && <textarea ref={editorRef} className="document-source" aria-label="文档正文" spellCheck={false} placeholder="开始书写…" value={artifact.content} onChange={(event) => { update(event.target.value, 'typing'); setMessage('') }} onSelect={(event) => { const prefix = event.currentTarget.value.slice(0, event.currentTarget.selectionStart); setCursor({ line: prefix.split('\n').length, column: prefix.length - prefix.lastIndexOf('\n') }) }} onKeyDown={(event) => { if (event.key === 'Tab') { event.preventDefault(); wrap('  ', '', '') } }} />}
        {view !== 'edit' && <div ref={previewRef} className="document-rendered" aria-label="文档预览"><MarkdownContent content={artifact.content} /></div>}
      </div>
    </div>
    <footer className="editor-statusbar"><span role="status">{message || `${wordCount.toLocaleString()} 字 · ${outline.length} 个标题`}</span><span>行 {cursor.line}，列 {cursor.column} · Markdown</span></footer>
    <input ref={importRef} type="file" accept=".md,.markdown,.txt,text/plain,text/markdown" hidden onChange={async (event) => {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
      try { const content = await readTextFile(file); if (artifact.content.trim() && !window.confirm('用导入内容替换正文？可以撤销。')) return; update(content); setMessage(`已导入 ${file.name}`) }
      catch (error) { setMessage(error instanceof Error ? error.message : '导入失败') }
    }} />
  </section>
}

export default DocumentEditor
