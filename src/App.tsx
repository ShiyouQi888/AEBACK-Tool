// Aeback personal tools — one small workspace for maps, graphs, documents, and tables.
import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import ArticleImportDialog from './components/ArticleImportDialog'
import DocumentEditor from './components/DocumentEditor'
import Icon from './components/Icon'
import KnowledgeGraphEditor from './components/KnowledgeGraphEditor'
import MindMapEditor from './components/MindMapEditor'
import Sidebar from './components/Sidebar'
import TableEditor from './components/TableEditor'
import ThemeToggleButton, { type ThemeMode } from './components/ThemeToggleButton'
import { starterArtifacts } from './data'
import { parseArticle } from './lib/article'
import { loadWorkspace, saveWorkspace } from './lib/storage'
import { TOOL_LABELS, type ToolType, type WorkspaceArtifact, type WorkspaceView } from './types'

const toolTypes: ToolType[] = ['mindmap', 'graph', 'document', 'table']
const themeStorageKey = 'aeback-theme'
const toolDescriptions: Record<ToolType, string> = {
  mindmap: '把复杂主题拆开，找到清晰的结构。',
  graph: '连接概念与资料，看见知识之间的关系。',
  document: '记录想法、整理笔记，沉淀可复用的内容。',
  table: '用轻量表格追踪计划、清单与进度。',
}

function makeId() {
  return `aeback-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function formatUpdated(value: string) {
  const date = new Date(value)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return '今天'
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(date)
}

function getSearchText(artifact: WorkspaceArtifact) {
  switch (artifact.type) {
    case 'mindmap': return [artifact.title, ...artifact.nodes.map((node) => node.text)].join(' ')
    case 'graph': return [artifact.title, artifact.sourceText ?? '', ...artifact.nodes.flatMap((node) => [node.text, node.description ?? '', node.source ?? '', node.kind ?? '']), ...artifact.edges.map((edge) => edge.label ?? '')].join(' ')
    case 'document': return `${artifact.title} ${artifact.content}`
    case 'table': return [artifact.title, ...artifact.columns, ...artifact.rows.flat()].join(' ')
  }
}

function ArtifactRow({ artifact, onOpen }: { artifact: WorkspaceArtifact; onOpen: (artifact: WorkspaceArtifact) => void }) {
  const icon = artifact.type === 'mindmap' ? 'mindmap' : artifact.type === 'graph' ? 'network' : artifact.type
  return <button className="file-row" type="button" onClick={() => onOpen(artifact)}>
    <span className={`file-icon file-icon--${artifact.type}`}><Icon name={icon} size={16} /></span>
    <span className="file-row-title">{artifact.title}</span>
    <span className="file-row-type">{TOOL_LABELS[artifact.type]}</span>
    <span className="file-row-date">{formatUpdated(artifact.updatedAt)}</span>
    <Icon name="arrow" size={15} />
  </button>
}

function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      return window.localStorage.getItem(themeStorageKey) === 'light' ? 'light' : 'dark'
    } catch {
      return 'dark'
    }
  })
  const [artifacts, setArtifacts] = useState<WorkspaceArtifact[]>(() => loadWorkspace(starterArtifacts))
  const [view, setView] = useState<WorkspaceView>('library')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      window.localStorage.setItem(themeStorageKey, theme)
    } catch {
      // Keep the selected theme for this session if storage is unavailable.
    }
  }, [theme])

  useEffect(() => saveWorkspace(artifacts), [artifacts])

  const selectedArtifact = artifacts.find((artifact) => artifact.id === selectedId)
  const filteredArtifacts = useMemo(() => artifacts
    .filter((artifact) => view === 'library' || artifact.type === view)
    .filter((artifact) => !query.trim() || getSearchText(artifact).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [artifacts, query, view])

  const navigate = (nextView: WorkspaceView) => {
    setView(nextView)
    setSelectedId(null)
    setQuery('')
    setCreateMenuOpen(false)
  }

  const openArtifact = (artifact: WorkspaceArtifact) => {
    setView(artifact.type)
    setSelectedId(artifact.id)
    setQuery('')
    setCreateMenuOpen(false)
  }

  const createArtifact = (type: ToolType) => {
    const id = makeId()
    let artifact: WorkspaceArtifact
    if (type === 'mindmap') {
      artifact = { id, type, title: '未命名导图', updatedAt: new Date().toISOString(), nodes: [{ id: `${id}-root`, text: '中心主题', parentId: null }] }
    } else if (type === 'graph') {
      const rootId = `${id}-root`
      artifact = { id, type, title: '未命名图谱', updatedAt: new Date().toISOString(), rootId, nodes: [{ id: rootId, text: '中心主题' }], edges: [] }
    } else if (type === 'document') {
      artifact = { id, type, title: '未命名文档', updatedAt: new Date().toISOString(), content: '' }
    } else {
      artifact = { id, type, title: '未命名表格', updatedAt: new Date().toISOString(), columns: ['名称', '值'], rows: [['', '']] }
    }
    setArtifacts((current) => [artifact, ...current])
    setView(type)
    setSelectedId(id)
    setCreateMenuOpen(false)
  }

  const updateArtifact = (nextArtifact: WorkspaceArtifact) => {
    const updated = { ...nextArtifact, updatedAt: new Date().toISOString() } as WorkspaceArtifact
    setArtifacts((current) => current.map((artifact) => artifact.id === updated.id ? updated : artifact))
  }

  const deleteArtifact = () => {
    if (!selectedArtifact || !window.confirm(`删除「${selectedArtifact.title}」？`)) return
    setArtifacts((current) => current.filter((artifact) => artifact.id !== selectedArtifact.id))
    setSelectedId(null)
  }

  const leaveCanvas = (type: 'mindmap' | 'graph') => {
    setSelectedId(null)
    setView(type)
  }

  const exportWorkspace = () => {
    const backup = { brand: 'AEBACK', version: 2, exportedAt: new Date().toISOString(), artifacts }
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `aeback-workspace-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const importArticle = (title: string, text: string) => {
    const graph = parseArticle(title, text)
    setArtifacts((current) => [graph, ...current])
    setView('graph')
    setSelectedId(graph.id)
    setImportOpen(false)
  }

  const pageTitle = selectedArtifact?.title ?? (view === 'library' ? '全部文件' : TOOL_LABELS[view])
  const mainCreate = () => {
    if (view === 'library') setCreateMenuOpen((open) => !open)
    else createArtifact(view)
  }

  const renderLibrary = () => (
    <section className="library-page">
      <div className="library-hero">
        <div className="library-hero-copy">
          <p className="eyebrow">AEBACK · PERSONAL WORKSPACE</p>
          <h2>把零散的想法，<span>整理成自己的知识。</span></h2>
          <p>从一张思维导图开始，连接资料，再把重要内容沉淀下来。</p>
        </div>
        <div className="workspace-summary">
          <span className="summary-icon"><Icon name="grid" size={18} /></span>
          <span className="summary-label">工作区内容</span>
          <strong>{artifacts.length}</strong>
          <small>件资料保存在本地</small>
        </div>
      </div>
      <div className="tool-overview-grid" aria-label="工具分类">
        {toolTypes.map((type) => {
          const icon = type === 'mindmap' ? 'mindmap' : type === 'graph' ? 'network' : type
          const count = artifacts.filter((artifact) => artifact.type === type).length
          return <button className={`tool-overview-card tool-overview-card--${type}`} type="button" key={type} onClick={() => navigate(type)}>
            <span className="tool-overview-top">
              <span className={`file-icon file-icon--${type}`}><Icon name={icon} size={18} /></span>
              <span className="tool-overview-count">{count} 项</span>
            </span>
            <span className="tool-overview-title">{TOOL_LABELS[type]}<Icon name="arrow" size={15} /></span>
            <span className="tool-overview-description">{toolDescriptions[type]}</span>
          </button>
        })}
      </div>
      <div className="library-section-heading">
        <div><h2>最近内容</h2><p>继续整理你正在思考的事</p></div>
        <span>{filteredArtifacts.length} 项</span>
      </div>
      <div className="library-list">
        <div className="list-heading"><span>名称</span><span>类型</span><span>修改时间</span><span /></div>
        {filteredArtifacts.length ? filteredArtifacts.map((artifact) => <ArtifactRow key={artifact.id} artifact={artifact} onOpen={openArtifact} />) : <div className="library-empty">没有匹配的文件</div>}
      </div>
    </section>
  )

  const renderToolList = (type: ToolType) => (
    <section className="tool-list-page">
      <div className="tool-list-intro">
        <div className={`file-icon file-icon--${type}`}><Icon name={type === 'mindmap' ? 'mindmap' : type === 'graph' ? 'network' : type} size={20} /></div>
        <div><p className="eyebrow">AEBACK WORKSPACE</p><h2>{TOOL_LABELS[type]}</h2><p>{toolDescriptions[type]}</p></div>
        <span className="tool-list-count">{filteredArtifacts.length} 项内容</span>
      </div>
      <div className="library-list">
        <div className="list-heading"><span>名称</span><span>类型</span><span>修改时间</span><span /></div>
        {filteredArtifacts.length ? filteredArtifacts.map((artifact) => <ArtifactRow key={artifact.id} artifact={artifact} onOpen={openArtifact} />) : <div className="library-empty"><button className="text-create" type="button" onClick={() => createArtifact(type)}>新建{TOOL_LABELS[type]}</button></div>}
      </div>
    </section>
  )

  const renderArtifact = () => {
    if (!selectedArtifact) return null
    switch (selectedArtifact.type) {
      case 'document': return <DocumentEditor artifact={selectedArtifact} onChange={updateArtifact} />
      case 'table': return <TableEditor artifact={selectedArtifact} onChange={updateArtifact} />
    }
  }

  if (selectedArtifact?.type === 'mindmap') return <MindMapEditor artifact={selectedArtifact} onChange={updateArtifact} onBack={() => leaveCanvas('mindmap')} onDelete={deleteArtifact} theme={theme} onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} />
  if (selectedArtifact?.type === 'graph') return <KnowledgeGraphEditor artifact={selectedArtifact} onChange={updateArtifact} onBack={() => leaveCanvas('graph')} onDelete={deleteArtifact} onImportArticle={importArticle} theme={theme} onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} />

  return (
    <div className="aeback-app">
      <Sidebar view={view} artifacts={artifacts} selectedId={selectedId} onNavigate={navigate} onOpen={openArtifact} onExport={exportWorkspace} />
      <main className="main-area">
        <header className="app-header">
          <div className="heading-area">
            {selectedArtifact && <button className="back-button" type="button" aria-label="返回文件列表" onClick={() => { setSelectedId(null); setView(selectedArtifact.type) }}><Icon name="back" size={17} /></button>}
            {selectedArtifact ? <input aria-label="文件名称" className="artifact-title-input" value={selectedArtifact.title} onChange={(event) => updateArtifact({ ...selectedArtifact, title: event.target.value })} /> : <h1>{pageTitle}</h1>}
          </div>
          <div className="header-actions">
            {!selectedArtifact && <label className="global-search"><Icon name="search" size={16} /><input aria-label="搜索文件" value={query} placeholder="搜索" onChange={(event) => setQuery(event.target.value)} /></label>}
            {!selectedArtifact && view === 'graph' && <button className="tool-button header-import" type="button" onClick={() => setImportOpen(true)}><Icon name="document" size={15} />导入文章</button>}
            {selectedArtifact && <button className="icon-button header-delete" type="button" aria-label="删除文件" title="删除文件" onClick={deleteArtifact}><Icon name="trash" size={16} /></button>}
            <ThemeToggleButton theme={theme} onToggle={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} />
            <div className="create-anchor">
              <button className="primary-button" type="button" onClick={mainCreate}><Icon name="plus" size={16} />新建</button>
              {createMenuOpen && <div className="create-menu" role="menu">{toolTypes.map((type) => <button type="button" role="menuitem" key={type} onClick={() => createArtifact(type)}><Icon name={type === 'mindmap' ? 'mindmap' : type === 'graph' ? 'network' : type} size={16} />{TOOL_LABELS[type]}</button>)}</div>}
            </div>
          </div>
        </header>
        <div className={`main-content${selectedArtifact ? ' main-content--editor' : ''}`}>
          {selectedArtifact ? renderArtifact() : view === 'library' ? renderLibrary() : renderToolList(view)}
        </div>
      </main>
      {importOpen && <ArticleImportDialog onClose={() => setImportOpen(false)} onImport={importArticle} />}
    </div>
  )
}

export default App
