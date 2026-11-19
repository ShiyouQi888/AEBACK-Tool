// Aeback canvas header — minimal file controls floating above the full-screen canvas.
import type { ReactNode } from 'react'
import Icon from './Icon'
import BrandLogo from './BrandLogo'
import ThemeToggleButton, { type ThemeMode } from './ThemeToggleButton'
import LanguageSwitcher from './LanguageSwitcher'
import { useI18n } from '../lib/i18n'

type CanvasHeaderProps = {
  title: string
  onTitleChange: (value: string) => void
  onBack: () => void
  onDelete: () => void
  theme: ThemeMode
  onToggleTheme: () => void
  children?: ReactNode
}

function CanvasHeader({ title, onTitleChange, onBack, onDelete, theme, onToggleTheme, children }: CanvasHeaderProps) {
  const { t } = useI18n()
  return (
    <header className="canvas-header">
      <div className="canvas-header-left">
        <button className="canvas-back" type="button" aria-label={t('返回文件列表')} onClick={onBack}><Icon name="back" size={17} /></button>
        <BrandLogo compact className="canvas-brand-mark" />
        <input aria-label={t('文件名称')} value={title} onChange={(event) => onTitleChange(event.target.value)} />
      </div>
      <div className="canvas-header-right">{children}<LanguageSwitcher /><ThemeToggleButton theme={theme} onToggle={onToggleTheme} /><button className="canvas-delete" type="button" aria-label={t('删除文件')} title={t('删除文件')} onClick={onDelete}><Icon name="trash" size={16} /></button></div>
    </header>
  )
}

export default CanvasHeader
