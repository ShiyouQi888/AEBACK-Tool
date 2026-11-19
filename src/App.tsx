// Aeback personal tools — one small workspace for maps, graphs, documents, and tables.
import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import ArticleImportDialog from './components/ArticleImportDialog'
import Icon from './components/Icon'
import KnowledgeGraphEditor from './components/KnowledgeGraphEditor'
import MindMapEditor from './components/MindMapEditor'
import Sidebar from './components/Sidebar'
import ThemeToggleButton, { type ThemeMode } from './components/ThemeToggleButton'
import LanguageSwitcher from './components/LanguageSwitcher'
import { starterArtifacts } from './data'
import { parseArticle } from './lib/article'
import { useI18n } from './lib/i18n'
import { loadWorkspace, saveWorkspace } from './lib/storage'
import { TOOL_LABELS, type ToolType, type WorkspaceArtifact, type WorkspaceView } from './types'

const toolTypes: ToolType[] = ['mindmap', 'graph', 'document', 'table']
const DocumentEditor = lazy(() => import('./components/DocumentEditor'))
const TableEditor = lazy(() => import('./components/TableEditor'))
const themeStorageKey = 'aeback-theme'
const sidebarCollapsedStorageKey = 'aeback-sidebar-collapsed'
const toolDescriptions: Record<ToolType, string> = {
  mindmap: '把复杂主题拆开，找到清晰的结构。',
  graph: '连接概念与资料，看见知识之间的关系。',
  document: '记录想法、整理笔记，沉淀可复用的内容。',
  table: '用轻量表格追踪计划、清单与进度。',
}

function makeId() {
  return `aeback-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function formatUpdated(value: string, locale: string, t: (source: string) => string) {
  const date = new Date(value)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return t('今天')
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date)
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
  const { t, locale } = useI18n()
  const icon = artifact.type === 'mindmap' ? 'mindmap' : artifact.type === 'graph' ? 'network' : artifact.type
  return <button className="file-row" type="button" onClick={() => onOpen(artifact)}>
    <span className={`file-icon file-icon--${artifact.type}`}><Icon name={icon} size={16} /></span>
    <span className="file-row-title">{artifact.title}</span>
    <span className="file-row-type">{t(TOOL_LABELS[artifact.type])}</span>
    <span className="file-row-date">{formatUpdated(artifact.updatedAt, locale, t)}</span>
    <Icon name="arrow" size={15} />
  </button>
}

function App() {
  const { t } = useI18n()
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      return window.localStorage.getItem(themeStorageKey) === 'light' ? 'light' : 'dark'
    } catch {
      return 'dark'
    }
  })
  const [artifacts, setArtifacts] = useState<WorkspaceArtifact[]>(starterArtifacts)
  const [workspaceReady, setWorkspaceReady] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const artifactsRef = useRef(artifacts)
  artifactsRef.current = artifacts
  const [view, setView] = useState<WorkspaceView>('library')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(sidebarCollapsedStorageKey) === 'true'
    } catch {
      return false
    }
  })
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      window.localStorage.setItem(themeStorageKey, theme)
    } catch {
      // Keep the selected theme for this session if storage is unavailable.
    }
  }, [theme])

  useEffect(() => {
    let active = true
    void loadWorkspace(starterArtifacts).then((loaded) => {
      if (!active) return
      setArtifacts(loaded)
      setWorkspaceReady(true)
    }).catch(() => {
      if (!active) return
      setArtifacts(starterArtifacts)
      setWorkspaceReady(true)
    })
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (!workspaceReady) return
    let active = true
    setSaveError(null)
    setIsSaving(true)
    const timeout = window.setTimeout(() => {
      void saveWorkspace(artifacts).then((error) => {
        if (!active) return
        setSaveError(error)
        setIsSaving(false)
      })
    }, 250)
    const saveOnPageHide = () => {
      window.clearTimeout(timeout)
      void saveWorkspace(artifactsRef.current)
    }
    window.addEventListener('pagehide', saveOnPageHide)
    return () => {
      active = false
      window.clearTimeout(timeout)
      window.removeEventListener('pagehide', saveOnPageHide)
    }
  }, [artifacts, workspaceReady])
  useEffect(() => {
    try {
      window.localStorage.setItem(sidebarCollapsedStorageKey, String(sidebarCollapsed))
    } catch {
      // Keep the current sidebar state for this session if storage is unavailable.
    }
  }, [sidebarCollapsed])
  useEffect(() => {
    const dismissOutside = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return
      document.querySelectorAll<HTMLDetailsElement>('#root details[open]').forEach((menu) => {
        if (!menu.contains(target)) menu.open = false
      })
      if (!target.closest('.create-anchor')) setCreateMenuOpen(false)
    }
    const onPointerDown = (event: PointerEvent) => dismissOutside(event.target)
    const onClick = (event: MouseEvent) => dismissOutside(event.target)
    const onFocusIn = (event: FocusEvent) => dismissOutside(event.target)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const openMenus = Array.from(document.querySelectorAll<HTMLDetailsElement>('#root details[open]'))
      const activeMenu = openMenus.find((menu) => menu.contains(document.activeElement)) ?? openMenus[0]
      openMenus.forEach((menu) => { menu.open = false })
      if (activeMenu) {
        event.preventDefault()
        activeMenu.querySelector('summary')?.focus()
      }
      setCreateMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('click', onClick)
    document.addEventListener('focusin', onFocusIn, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('click', onClick)
      document.removeEventListener('focusin', onFocusIn, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

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
      artifact = { id, type, title: t('未命名导图'), updatedAt: new Date().toISOString(), nodes: [{ id: `${id}-root`, text: t('中心主题'), parentId: null }] }
    } else if (type === 'graph') {
      const rootId = `${id}-root`
      artifact = { id, type, title: t('未命名图谱'), updatedAt: new Date().toISOString(), rootId, nodes: [{ id: rootId, text: t('中心主题') }], edges: [] }
    } else if (type === 'document') {
      artifact = { id, type, title: t('未命名文档'), updatedAt: new Date().toISOString(), content: '' }
    } else {
      artifact = { id, type, title: t('未命名表格'), updatedAt: new Date().toISOString(), columns: [t('名称'), t('值')], rows: [['', '']] }
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
    if (!selectedArtifact || !window.confirm(t('删除「{title}」？', { title: selectedArtifact.title }))) return
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

  const pageTitle = selectedArtifact?.title ?? (view === 'library' ? t('全部文件') : t(TOOL_LABELS[view]))
  const mainCreate = () => {
    if (view === 'library') setCreateMenuOpen((open) => !open)
    else createArtifact(view)
  }

  if (!workspaceReady) return <main className="workspace-loading" role="status">{t('正在读取本地工作区…')}</main>

  const renderLibrary = () => (
    <section className="library-page">
      <div className="library-hero">
        <div className="library-hero-copy">
          <p className="eyebrow">AEBACK · PERSONAL WORKSPACE</p>
          <h2>{t('把零散的想法，')}<span>{t('整理成自己的知识。')}</span></h2>
          <p>{t('从一张思维导图开始，连接资料，再把重要内容沉淀下来。')}</p>
        </div>
        <div className="workspace-summary">
          <span className="summary-icon"><Icon name="grid" size={18} /></span>
          <span className="summary-label">{t('工作区内容')}</span>
          <strong>{artifacts.length}</strong>
          <small>{t('件资料保存在本地')}</small>
        </div>
      </div>
      <div className="tool-overview-grid" aria-label={t('工具分类')}>
        {toolTypes.map((type) => {
          const icon = type === 'mindmap' ? 'mindmap' : type === 'graph' ? 'network' : type
          const count = artifacts.filter((artifact) => artifact.type === type).length
          return <button className={`tool-overview-card tool-overview-card--${type}`} type="button" key={type} onClick={() => navigate(type)}>
            <span className="tool-overview-top">
              <span className={`file-icon file-icon--${type}`}><Icon name={icon} size={18} /></span>
              <span className="tool-overview-count">{t('{count} 项', { count })}</span>
            </span>
            <span className="tool-overview-title">{t(TOOL_LABELS[type])}<Icon name="arrow" size={15} /></span>
            <span className="tool-overview-description">{t(toolDescriptions[type])}</span>
          </button>
        })}
      </div>
      <div className="library-section-heading">
        <div><h2>{t('最近内容')}</h2><p>{t('继续整理你正在思考的事')}</p></div>
        <span>{t('{count} 项', { count: filteredArtifacts.length })}</span>
      </div>
      <div className="library-list">
        <div className="list-heading"><span>{t('名称')}</span><span>{t('类型')}</span><span>{t('修改时间')}</span><span /></div>
        {filteredArtifacts.length ? filteredArtifacts.map((artifact) => <ArtifactRow key={artifact.id} artifact={artifact} onOpen={openArtifact} />) : <div className="library-empty">{t('没有匹配的文件')}</div>}
      </div>
    </section>
  )

  const renderToolList = (type: ToolType) => (
    <section className="tool-list-page">
      <div className="tool-list-intro">
        <div className={`file-icon file-icon--${type}`}><Icon name={type === 'mindmap' ? 'mindmap' : type === 'graph' ? 'network' : type} size={20} /></div>
        <div><p className="eyebrow">AEBACK WORKSPACE</p><h2>{t(TOOL_LABELS[type])}</h2><p>{t(toolDescriptions[type])}</p></div>
        <span className="tool-list-count">{t('{count} 项内容', { count: filteredArtifacts.length })}</span>
      </div>
      <div className="library-list">
        <div className="list-heading"><span>{t('名称')}</span><span>{t('类型')}</span><span>{t('修改时间')}</span><span /></div>
        {filteredArtifacts.length ? filteredArtifacts.map((artifact) => <ArtifactRow key={artifact.id} artifact={artifact} onOpen={openArtifact} />) : <div className="library-empty"><button className="text-create" type="button" onClick={() => createArtifact(type)}>{t('新建{tool}', { tool: t(TOOL_LABELS[type]) })}</button></div>}
      </div>
    </section>
  )

  const renderArtifact = () => {
    if (!selectedArtifact) return null
    switch (selectedArtifact.type) {
      case 'document': return <DocumentEditor key={selectedArtifact.id} artifact={selectedArtifact} onChange={updateArtifact} />
      case 'table': return <TableEditor key={selectedArtifact.id} artifact={selectedArtifact} onChange={updateArtifact} />
    }
  }

  if (selectedArtifact?.type === 'mindmap') return <MindMapEditor artifact={selectedArtifact} onChange={updateArtifact} onBack={() => leaveCanvas('mindmap')} onDelete={deleteArtifact} theme={theme} onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} />
  if (selectedArtifact?.type === 'graph') return <KnowledgeGraphEditor artifact={selectedArtifact} onChange={updateArtifact} onBack={() => leaveCanvas('graph')} onDelete={deleteArtifact} onImportArticle={importArticle} theme={theme} onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} />

  return (
    <div className={`aeback-app${sidebarCollapsed ? ' aeback-app--sidebar-collapsed' : ''}`}>
      <Sidebar view={view} artifacts={artifacts} selectedId={selectedId} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((value) => !value)} onNavigate={navigate} onOpen={openArtifact} onExport={exportWorkspace} />
      <main className={`main-area${selectedArtifact?.type === 'table' ? ' main-area--table' : ''}${selectedArtifact?.type === 'document' ? ' main-area--document' : ''}`}>
        <header className="app-header">
          <div className="heading-area">
            {selectedArtifact && <button className="back-button" type="button" aria-label={t('返回文件列表')} onClick={() => { setSelectedId(null); setView(selectedArtifact.type) }}><Icon name="back" size={17} /></button>}
            {selectedArtifact ? <input aria-label={t('文件名称')} className="artifact-title-input" value={selectedArtifact.title} onChange={(event) => updateArtifact({ ...selectedArtifact, title: event.target.value })} /> : <h1>{pageTitle}</h1>}
          </div>
          <div className="header-actions">
            {selectedArtifact && <span className={`editor-save-status${saveError ? ' editor-save-status--error' : ''}`} role="status">{saveError ? t(saveError) : isSaving ? t('正在保存…') : t('本地已保存')}</span>}
            {!selectedArtifact && <label className="global-search"><Icon name="search" size={16} /><input aria-label={t('搜索文件')} value={query} placeholder={t('搜索')} onChange={(event) => setQuery(event.target.value)} /></label>}
            {!selectedArtifact && view === 'graph' && <button className="tool-button header-import" type="button" onClick={() => setImportOpen(true)}><Icon name="document" size={15} />{t('导入文章')}</button>}
            {selectedArtifact && <button className="icon-button header-delete" type="button" aria-label={t('删除文件')} title={t('删除文件')} onClick={deleteArtifact}><Icon name="trash" size={16} /></button>}
            <LanguageSwitcher />
            <ThemeToggleButton theme={theme} onToggle={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} />
            <div className="create-anchor">
              <button className="primary-button" type="button" onClick={mainCreate}><Icon name="plus" size={16} />{t('新建')}</button>
              {createMenuOpen && <div className="create-menu" role="menu">{toolTypes.map((type) => <button type="button" role="menuitem" key={type} onClick={() => createArtifact(type)}><Icon name={type === 'mindmap' ? 'mindmap' : type === 'graph' ? 'network' : type} size={16} />{t(TOOL_LABELS[type])}</button>)}</div>}
            </div>
          </div>
        </header>
        <div className={`main-content${selectedArtifact ? ' main-content--editor' : ''}${selectedArtifact?.type === 'table' ? ' main-content--table' : ''}${selectedArtifact?.type === 'document' ? ' main-content--document' : ''}`}>
          {selectedArtifact ? <Suspense fallback={<div className="tool-empty" role="status">{t('正在打开…')}</div>}>{renderArtifact()}</Suspense> : view === 'library' ? renderLibrary() : renderToolList(view)}
        </div>
      </main>
      {importOpen && <ArticleImportDialog onClose={() => setImportOpen(false)} onImport={importArticle} />}
    </div>
  )
}

export default App
