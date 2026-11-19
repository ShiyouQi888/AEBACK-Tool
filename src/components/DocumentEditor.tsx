// Aeback document workspace — Markdown editing, safe preview, outline, find, history, and portable exports.
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { DocumentArtifact } from '../types'
import { downloadText, readTextFile } from '../lib/files'
import { useI18n } from '../lib/i18n'
import { useArtifactHistory } from '../lib/useArtifactHistory'
import MarkdownContent from './MarkdownContent'
import { documentOutline } from '../lib/document'
import Icon from './Icon'

type DocumentEditorProps = { artifact: DocumentArtifact; onChange: (artifact: DocumentArtifact) => void }
type View = 'edit' | 'split' | 'preview'
const codeLanguages = [
  { label: '纯文本', id: '' }, { label: 'JavaScript', id: 'javascript' }, { label: 'TypeScript', id: 'typescript' },
  { label: 'Python', id: 'python' }, { label: 'JSON', id: 'json' }, { label: 'HTML', id: 'html' },
  { label: 'CSS', id: 'css' }, { label: 'SQL', id: 'sql' }, { label: 'Bash', id: 'bash' }, { label: 'Markdown', id: 'markdown' },
]

function DocumentEditor({ artifact, onChange }: DocumentEditorProps) {
  const { t, locale } = useI18n()
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
  const wrap = (before: string, after = before, placeholder = t('文字')) => {
    editable()
    const editor = editorRef.current
    const start = editor?.selectionStart ?? artifact.content.length
    const end = editor?.selectionEnd ?? start
    const selection = artifact.content.slice(start, end) || placeholder
    update(artifact.content.slice(0, start) + before + selection + after + artifact.content.slice(end))
    selectText(start + before.length, start + before.length + selection.length)
  }
  const insertCodeBlock = (language: string) => {
    editable()
    const editor = editorRef.current
    const start = editor?.selectionStart ?? artifact.content.length
    const end = editor?.selectionEnd ?? start
    const selected = artifact.content.slice(start, end) || t('代码')
    const prefix = start > 0 && artifact.content[start - 1] !== '\n' ? '\n' : ''
    const suffix = end >= artifact.content.length || artifact.content[end] !== '\n' ? '\n' : ''
    const opening = `${prefix}\`\`\`${language}\n`
    const closing = `\n\`\`\`${suffix}`
    update(artifact.content.slice(0, start) + opening + selected + closing + artifact.content.slice(end))
    selectText(start + opening.length, start + opening.length + selected.length)
  }
  const insertCallout = (kind: 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION' | 'SUCCESS') => {
    editable()
    const editor = editorRef.current
    const start = editor?.selectionStart ?? artifact.content.length
    const end = editor?.selectionEnd ?? start
    const selected = artifact.content.slice(start, end) || t('在此输入内容')
    const before = artifact.content.slice(0, start)
    const after = artifact.content.slice(end)
    const leading = before && !before.endsWith('\n') ? '\n' : ''
    const trailing = after && !after.startsWith('\n') ? '\n' : ''
    const marker = `> [!${kind}]\n`
    const body = selected.split('\n').map((line) => `> ${line}`).join('\n')
    const inserted = `${leading}${marker}${body}${trailing}`
    update(before + inserted + after)
    const bodyStart = start + leading.length + marker.length + 2
    if (!selected.includes('\n')) selectText(bodyStart, bodyStart + selected.length)
    else selectText(start + leading.length + inserted.length)
  }
  const insertBlock = (block: string) => {
    editable()
    const editor = editorRef.current
    const start = editor?.selectionStart ?? artifact.content.length
    const end = editor?.selectionEnd ?? start
    const before = artifact.content.slice(0, start)
    const after = artifact.content.slice(end)
    const leading = before && !before.endsWith('\n') ? '\n' : ''
    const trailing = after && !after.startsWith('\n') ? '\n' : ''
    update(before + leading + block + trailing + after)
    selectText(start + leading.length + block.length)
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
      setMessage(t('已替换 {count} 处', { count: matches.length }))
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
    const body = renderToStaticMarkup(<MarkdownContent content={artifact.content} interactive={false} />)
    const html = `<!doctype html>\n<!-- Aeback document export -->\n<html lang="zh-CN"><meta charset="utf-8"><title>${title}</title><style>body{max-width:800px;margin:48px auto;padding:0 24px;color:#222;font:16px/1.8 system-ui}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px}pre{padding:16px;background:#f4f4f4;white-space:pre-wrap}img{max-width:100%}blockquote{border-left:3px solid #ccc;margin-left:0;padding-left:20px}@media print{body{margin:0;max-width:none}a{color:inherit}}</style><body><h1>${title}</h1>${body}</body></html>`
    const calloutCss = '.document-callout{margin:20px 0;padding:12px 16px;border:1px solid color-mix(in srgb,var(--tone) 30%,transparent);border-left:4px solid var(--tone);border-radius:4px;background:var(--wash);color:#30343c}.document-callout-title{display:flex;align-items:center;gap:8px;margin-bottom:4px;color:var(--tone);font-size:13px;font-weight:700}.document-callout-title span{width:18px;height:18px;display:grid;place-items:center;border:1px solid currentColor;border-radius:50%;font-size:11px}.document-callout-content>:first-child{margin-top:0}.document-callout-content>:last-child{margin-bottom:0}.document-callout--note{--tone:#3973c5;--wash:#eef5ff}.document-callout--tip,.document-callout--success{--tone:#18856c;--wash:#eaf8f3}.document-callout--important{--tone:#7651b5;--wash:#f3edff}.document-callout--warning,.document-callout--caution{--tone:#a9630b;--wash:#fff5e5}'
    const exportedHtml = html.replace('</style>', `${calloutCss}</style>`)
    if (!print) { downloadText(artifact.title, 'html', exportedHtml, 'text/html;charset=utf-8'); return }
    const frame = document.createElement('iframe')
    frame.title = t('Aeback 文档打印')
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0'
    frame.onload = () => { frame.contentWindow?.focus(); frame.contentWindow?.print(); window.setTimeout(() => frame.remove(), 60000) }
    frame.srcdoc = exportedHtml
    document.body.append(frame)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Enter' && event.target === editorRef.current && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      const editor = editorRef.current
      if (editor && editor.selectionStart === editor.selectionEnd) {
        const start = editor.selectionStart
        const lineStart = artifact.content.lastIndexOf('\n', start - 1) + 1
        const lineEnd = artifact.content.indexOf('\n', start)
        const currentLine = artifact.content.slice(lineStart, lineEnd < 0 ? artifact.content.length : lineEnd)
        const list = currentLine.match(/^(\s*(?:[-*+] \[[ xX]\] |[-*+] |\d+[.)] ))(.*)$/)
        if (list) {
          event.preventDefault()
          const [, marker, text] = list
          if (!text.trim()) {
            update(artifact.content.slice(0, lineStart) + artifact.content.slice(lineStart + marker.length))
            selectText(lineStart)
          } else {
            const ordered = marker.match(/^(\s*)(\d+)([.)] )$/)
            const nextMarker = ordered ? `${ordered[1]}${Number(ordered[2]) + 1}${ordered[3]}` : marker.startsWith('- [') ? '- [ ] ' : marker
            update(artifact.content.slice(0, start) + `\n${nextMarker}` + artifact.content.slice(start))
            selectText(start + nextMarker.length + 1)
          }
          return
        }
      }
    }
    if (event.ctrlKey || event.metaKey) {
      const key = event.key.toLowerCase()
      if (event.target instanceof HTMLInputElement && !['f', 's'].includes(key)) return
      if (['z', 'y', 'b', 'i', 'k', 'f', 's'].includes(key)) {
        event.preventDefault()
        if (key === 'z') { if (event.shiftKey) history.redo(); else history.undo() }
        if (key === 'y') history.redo()
        if (key === 'b') wrap('**')
        if (key === 'i') wrap('*')
        if (key === 'k') wrap('[', '](https://)', t('链接文字'))
        if (key === 'f') { setFindOpen(true); requestAnimationFrame(() => findRef.current?.focus()) }
        if (key === 's') setMessage(t('正文会自动保存到本地'))
      }
    }
  }

  return <section className="document-editor-shell aeback-document" onKeyDown={onKeyDown}>
    <div className="editor-commandbar">
      <div className="editor-command-group">
        <button className={`tool-button${showOutline ? ' tool-button--active' : ''}`} type="button" aria-label={t('文档大纲')} aria-pressed={showOutline} onClick={() => setShowOutline((value) => !value)}><Icon name="list" size={16} /></button>
        <button className="tool-button" type="button" aria-label={t('撤销')} title={`${t('撤销')} Ctrl+Z`} disabled={!history.canUndo} onClick={() => { history.undo(); setMessage('') }}><Icon name="undo" size={16} /></button>
        <button className="tool-button" type="button" aria-label={t('重做')} title={`${t('重做')} Ctrl+Shift+Z`} disabled={!history.canRedo} onClick={() => { history.redo(); setMessage('') }}><Icon name="redo" size={16} /></button>
        <button className="tool-button" type="button" aria-label={t('查找替换')} title={`${t('查找替换')} Ctrl+F`} aria-expanded={findOpen} onClick={() => { setFindOpen((value) => !value); requestAnimationFrame(() => findRef.current?.focus()) }}><Icon name="search" size={16} /></button>
      </div>
      <div className="editor-segmented" role="group" aria-label={t('文档视图')}>{([{ id: 'edit', label: '编辑' }, { id: 'split', label: '分屏' }, { id: 'preview', label: '阅读' }] as const).map((item) => <button key={item.id} type="button" aria-pressed={view === item.id} onClick={() => setView(item.id)}>{t(item.label)}</button>)}</div>
      <div className="editor-command-group">
        <button className="tool-button" type="button" onClick={() => importRef.current?.click()}>{t('导入')}</button>
        <details className="editor-menu"><summary>{t('导出')}</summary><div><button type="button" onClick={() => downloadText(artifact.title, 'md', artifact.content, 'text/markdown;charset=utf-8')}>Markdown</button><button type="button" onClick={() => void exportHtml()}>HTML</button><button type="button" onClick={() => void exportHtml(true)}>{t('打印 / PDF')}</button></div></details>
      </div>
    </div>
    {view !== 'preview' && <div className="document-formatbar" role="toolbar" aria-label={t('文字格式')}>
      <button type="button" title={t('一级标题')} onClick={() => prefixLines('# ')}>H1</button><button type="button" title={t('二级标题')} onClick={() => prefixLines('## ')}>H2</button><button type="button" aria-label={t('加粗')} title={`${t('加粗')} Ctrl+B`} onClick={() => wrap('**')}><b>B</b></button><button type="button" aria-label={t('斜体')} title={`${t('斜体')} Ctrl+I`} onClick={() => wrap('*')}><i>I</i></button><button type="button" aria-label={t('删除线')} title={t('删除线')} onClick={() => wrap('~~')}><s>S</s></button><button type="button" aria-label={t('行内代码')} title={t('行内代码')} onClick={() => wrap('`', '`', t('代码'))}>{'`</>'}</button><span />
      <button type="button" aria-label={t('无序列表')} title={t('无序列表')} onClick={() => prefixLines('- ')}><Icon name="list" size={16} /></button><button type="button" aria-label={t('有序列表')} title={t('有序列表')} onClick={() => prefixLines('1. ')}>1.</button><button type="button" aria-label={t('任务列表')} title={t('任务列表')} onClick={() => prefixLines('- [ ] ')}>☐</button><button type="button" aria-label={t('引用')} title={t('引用')} onClick={() => prefixLines('> ')}>❞</button>
      <details className="editor-menu document-callout-menu"><summary aria-label={t('插入提示块')} title={t('提示块')}>▤</summary><div>{([{ kind: 'NOTE', label: '说明块' }, { kind: 'TIP', label: '提示块' }, { kind: 'IMPORTANT', label: '重点块' }, { kind: 'WARNING', label: '警告块' }, { kind: 'CAUTION', label: '注意块' }, { kind: 'SUCCESS', label: '完成块' }] as const).map((item) => <button key={item.kind} type="button" onClick={(event) => { insertCallout(item.kind); event.currentTarget.closest('details')?.removeAttribute('open') }}>{t(item.label)}</button>)}</div></details>
      <button type="button" aria-label={t('高亮文字')} title={t('高亮文字')} onClick={() => wrap('==', '==', t('重点内容'))}>▰</button><button type="button" aria-label={t('插入链接')} title={`${t('链接')} Ctrl+K`} onClick={() => wrap('[', '](https://)', t('链接文字'))}>↗</button><details className="editor-menu document-code-menu"><summary aria-label={t('插入代码块')} title={t('代码块')}>{'</>'}</summary><div>{codeLanguages.map((language) => <button key={language.label} type="button" onClick={(event) => { insertCodeBlock(language.id); event.currentTarget.closest('details')?.removeAttribute('open') }}>{t(language.label)}</button>)}</div></details><button type="button" aria-label={t('插入表格')} title={t('插入表格')} onClick={() => insertBlock('| 列名 | 列名 |\n| --- | --- |\n| 内容 | 内容 |')}><Icon name="table" size={16} /></button><button type="button" aria-label={t('分隔线')} title={t('分隔线')} onClick={() => insertBlock('---')}>―</button>
    </div>}
    {findOpen && <div className="document-findbar"><input ref={findRef} aria-label={t('查找文字')} placeholder={t('查找')} value={query} onChange={(event) => { setQuery(event.target.value); setMatchIndex(-1) }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); findNext(event.shiftKey ? -1 : 1) } if (event.key === 'Escape') setFindOpen(false) }} /><span>{matches.length ? `${matchIndex < 0 ? 0 : matchIndex + 1} / ${matches.length}` : '0'}</span><button className="tool-button" type="button" disabled={!matches.length} onClick={() => findNext(-1)}>{t('上一处')}</button><button className="tool-button" type="button" disabled={!matches.length} onClick={() => findNext()}>{t('下一处')}</button><input aria-label={t('替换文字')} placeholder={t('替换为')} value={replacement} onChange={(event) => setReplacement(event.target.value)} /><button className="tool-button" type="button" disabled={!matches.length} onClick={() => replace(false)}>{t('替换')}</button><button className="tool-button" type="button" disabled={!matches.length} onClick={() => replace(true)}>{t('全部替换')}</button><button className="tool-button" type="button" aria-label={t('关闭查找')} onClick={() => setFindOpen(false)}><Icon name="close" size={14} /></button></div>}
    <div className={`document-layout${showOutline ? ' document-layout--with-outline' : ''}`}>
      {showOutline && <aside className="document-outline" aria-label={t('文档目录')}><div>{t('大纲')}</div>{outline.map((item) => <button key={item.offset} type="button" title={item.title} aria-current={activeHeading === item.offset ? 'location' : undefined} style={{ paddingLeft: 9 + Math.min(item.depth - 1, 3) * 9 }} onClick={() => jumpTo(item.offset)}>{item.title}</button>)}{!outline.length && <p>{t('暂无标题')}</p>}</aside>}
      <div className={`document-panes document-panes--${view}`}>
        {view !== 'preview' && <textarea ref={editorRef} className="document-source" aria-label={t('文档正文')} spellCheck={false} placeholder={t('开始书写…')} value={artifact.content} onChange={(event) => { update(event.target.value, 'typing'); setMessage('') }} onSelect={(event) => { const prefix = event.currentTarget.value.slice(0, event.currentTarget.selectionStart); setCursor({ line: prefix.split('\n').length, column: prefix.length - prefix.lastIndexOf('\n') }) }} onKeyDown={(event) => { if (event.key === 'Tab') { event.preventDefault(); wrap('  ', '', '') } }} />}
        {view !== 'edit' && <div ref={previewRef} className="document-rendered" aria-label={t('文档预览')}><MarkdownContent content={artifact.content} /></div>}
      </div>
    </div>
    <footer className="editor-statusbar"><span role="status">{message || t('{words} 字 · {headings} 个标题', { words: wordCount.toLocaleString(locale), headings: outline.length })}</span><span>{t('行 {line}，列 {column} · Markdown', { line: cursor.line, column: cursor.column })}</span></footer>
    <input ref={importRef} type="file" accept=".md,.markdown,.txt,text/plain,text/markdown" hidden onChange={async (event) => {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
      try { const content = await readTextFile(file); if (artifact.content.trim() && !window.confirm(t('用导入内容替换正文？可以撤销。'))) return; update(content); setMessage(t('已导入 {name}', { name: file.name })) }
      catch (error) { setMessage(error instanceof Error ? t(error.message) : t('导入失败')) }
    }} />
  </section>
}

export default DocumentEditor
