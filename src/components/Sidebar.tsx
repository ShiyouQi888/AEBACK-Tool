// Aeback navigation — direct entry to each personal tool and recent work.
import { TOOL_LABELS, type ToolType, type WorkspaceArtifact, type WorkspaceView } from '../types'
import Icon, { type IconName } from './Icon'

const toolItems: Array<{ type: ToolType; icon: IconName }> = [
  { type: 'mindmap', icon: 'mindmap' },
  { type: 'graph', icon: 'network' },
  { type: 'document', icon: 'document' },
  { type: 'table', icon: 'table' },
]

type SidebarProps = {
  view: WorkspaceView
  artifacts: WorkspaceArtifact[]
  selectedId: string | null
  onNavigate: (view: WorkspaceView) => void
  onOpen: (artifact: WorkspaceArtifact) => void
  onExport: () => void
}

function Sidebar({ view, artifacts, selectedId, onNavigate, onOpen, onExport }: SidebarProps) {
  const recent = [...artifacts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5)
  return (
    <aside className="sidebar">
      <button className="brand-lockup" type="button" onClick={() => onNavigate('library')} aria-label="Aeback 全部文件">
        <span className="brand-mark">A</span><span className="brand-wordmark">AEBACK</span>
      </button>
      <nav className="primary-nav" aria-label="Aeback 工具导航">
        <button className={`nav-link${view === 'library' && !selectedId ? ' nav-link--active' : ''}`} type="button" aria-label="全部文件" aria-current={view === 'library' && !selectedId ? 'page' : undefined} onClick={() => onNavigate('library')}>
          <Icon name="grid" size={17} /><span>全部文件</span>
        </button>
        <div className="nav-divider" />
        {toolItems.map(({ type, icon }) => (
          <button className={`nav-link${view === type ? ' nav-link--active' : ''}`} type="button" key={type} aria-label={TOOL_LABELS[type]} aria-current={view === type ? 'page' : undefined} onClick={() => onNavigate(type)}>
            <Icon name={icon} size={17} /><span>{TOOL_LABELS[type]}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-recent">
        <div className="sidebar-caption">最近打开</div>
        {recent.map((artifact) => (
          <button className={`recent-link${selectedId === artifact.id ? ' recent-link--active' : ''}`} type="button" key={artifact.id} onClick={() => onOpen(artifact)} title={artifact.title}>
            <Icon name={toolItems.find((item) => item.type === artifact.type)?.icon ?? 'document'} size={14} />
            <span>{artifact.title}</span>
          </button>
        ))}
      </div>
      <div className="sidebar-bottom">
        <span className="storage-state"><i />本地工作区</span>
        <button className="export-button" type="button" onClick={onExport}><Icon name="download" size={15} />导出数据</button>
      </div>
    </aside>
  )
}

export default Sidebar
