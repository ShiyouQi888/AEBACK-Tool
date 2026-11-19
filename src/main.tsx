// Aeback application entry point.
import React from 'react'
import ReactDOM from 'react-dom/client'
import { useEffect, useState } from 'react'
import App from './App'
import { AboutPage, FreePage, PrivacyPage } from './components/InfoPages'
import LandingPage from './components/LandingPage'
import ToolPage, { toolPageSpecs } from './components/ToolPage'
import ToolsPage from './components/ToolsPage'
import { I18nProvider, useI18n } from './lib/i18n'
import type { ToolType, WorkspaceView } from './types'
import './styles.css'
import './editors.css'

function AebackRoot() {
  const { t } = useI18n()
  const [route, setRoute] = useState(() => ({ pathname: window.location.pathname, search: window.location.search }))
  const pathname = route.pathname.replace(/\/+$/, '') || '/'
  const isWorkspace = pathname === '/workspace'
  const toolType = (Object.keys(toolPageSpecs) as ToolType[]).find((type) => pathname === `/tools/${toolPageSpecs[type].slug}`)
  const initialView = new URLSearchParams(route.search).get('tool')
  const workspaceView: WorkspaceView = initialView === 'mindmap' || initialView === 'graph' || initialView === 'document' || initialView === 'table' ? initialView : 'library'

  useEffect(() => {
    const syncPath = () => setRoute({ pathname: window.location.pathname, search: window.location.search })
    window.addEventListener('popstate', syncPath)
    return () => window.removeEventListener('popstate', syncPath)
  }, [])

  useEffect(() => {
    const title = isWorkspace ? t('个人工具工作台')
      : toolType ? t(toolPageSpecs[toolType].title)
        : pathname === '/tools' ? t('所有工具')
          : pathname === '/free' ? t('免费使用')
            : pathname === '/about' ? t('关于 AEBACK')
              : pathname === '/privacy' ? t('隐私与本地数据')
                : t('个人知识工作台')
    const pageDescription = isWorkspace ? t('AEBACK 个人工具工作台')
      : toolType ? t(toolPageSpecs[toolType].intro)
        : pathname === '/tools' ? t('四种个人工具，各自专注，一起工作。')
          : pathname === '/free' ? t('AEBACK 的四种个人工具免费使用。')
            : pathname === '/about' ? t('AEBACK 个人知识工具工作台。')
              : pathname === '/privacy' ? t('工作区数据保存在当前浏览器。')
                : t('AEBACK 个人知识工具工作台，包含思维导图、知识图谱、智能文档和智能表格。')
    document.title = `${title} — AEBACK`
    const metaDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (metaDescription) metaDescription.content = pageDescription
    if (!isWorkspace) {
      try { document.documentElement.dataset.theme = window.localStorage.getItem('aeback-theme') === 'light' ? 'light' : 'dark' }
      catch { document.documentElement.dataset.theme = 'dark' }
    }
  }, [isWorkspace, pathname, t, toolType])

  const navigate = (path: string) => {
    const destination = new URL(path, window.location.origin)
    window.history.pushState({ page: destination.pathname }, '', `${destination.pathname}${destination.search}${destination.hash}`)
    setRoute({ pathname: destination.pathname, search: destination.search })
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  if (isWorkspace) return <App key={route.search} initialView={workspaceView} />
  if (pathname === '/tools') return <ToolsPage onNavigate={navigate} />
  if (toolType) return <ToolPage type={toolType} currentPath={pathname} onNavigate={navigate} />
  if (pathname === '/free') return <FreePage onNavigate={navigate} />
  if (pathname === '/about') return <AboutPage onNavigate={navigate} />
  if (pathname === '/privacy') return <PrivacyPage onNavigate={navigate} />
  return <LandingPage onNavigate={navigate} />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider><AebackRoot /></I18nProvider>
  </React.StrictMode>,
)
