// Aeback article import — paste or open a local text file to create a graph.
import { useState, type ChangeEvent, type FormEvent } from 'react'
import Icon from './Icon'

type ArticleImportDialogProps = {
  onClose: () => void
  onImport: (title: string, text: string) => void
}

function ArticleImportDialog({ onClose, onImport }: ArticleImportDialogProps) {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const content = await file.text()
    setText(content)
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''))
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (text.trim()) onImport(title, text)
  }
  return (
    <div className="modal-scrim" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog-card article-dialog" role="dialog" aria-modal="true" aria-labelledby="article-dialog-title">
        <div className="dialog-header"><h2 id="article-dialog-title">导入文章</h2><button className="icon-button" type="button" aria-label="关闭" onClick={onClose}><Icon name="close" size={17} /></button></div>
        <form onSubmit={submit}>
          <label className="editor-label" htmlFor="article-title">标题</label>
          <input id="article-title" className="text-field" value={title} onChange={(event) => setTitle(event.target.value)} />
          <label className="editor-label" htmlFor="article-content">文章</label>
          <textarea id="article-content" className="text-field article-textarea" value={text} onChange={(event) => setText(event.target.value)} />
          <div className="dialog-footer"><label className="file-picker"><Icon name="document" size={15} />打开文件<input type="file" accept=".txt,.md,.markdown,text/plain,text/markdown" onChange={readFile} /></label><button className="primary-button" type="submit" disabled={!text.trim()}>识别并生成图谱</button></div>
        </form>
      </section>
    </div>
  )
}

export default ArticleImportDialog
