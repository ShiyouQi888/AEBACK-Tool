// Aeback canvas header — minimal file controls floating above the full-screen canvas.
import type { ReactNode } from 'react'
import Icon from './Icon'

type CanvasHeaderProps = {
  title: string
  onTitleChange: (value: string) => void
  onBack: () => void
  onDelete: () => void
  children?: ReactNode
}

function CanvasHeader({ title, onTitleChange, onBack, onDelete, children }: CanvasHeaderProps) {
  return (
    <header className="canvas-header">
      <div className="canvas-header-left">
        <button className="canvas-back" type="button" aria-label="返回文件列表" onClick={onBack}><Icon name="back" size={17} /></button>
        <span className="canvas-brand-mark">A</span>
        <input aria-label="文件名称" value={title} onChange={(event) => onTitleChange(event.target.value)} />
      </div>
      <div className="canvas-header-right">{children}<button className="canvas-delete" type="button" aria-label="删除文件" title="删除文件" onClick={onDelete}><Icon name="trash" size={16} /></button></div>
    </header>
  )
}

export default CanvasHeader
