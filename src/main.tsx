// Aeback application entry point.
import React from 'react'
import ReactDOM from 'react-dom/client'
import { useEffect, useState } from 'react'
import App from './App'
import LandingPage from './components/LandingPage'
import { I18nProvider, useI18n } from './lib/i18n'
import './styles.css'
import './editors.css'

function AebackRoot() {
  const { locale } = useI18n()
  const [pathname, setPathname] = useState(() => window.location.pathname)
  const isWorkspace = pathname.replace(/\/+$/, '') === '/workspace'

  useEffect(() => {
    const syncPath = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', syncPath)
    return () => window.removeEventListener('popstate', syncPath)
  }, [])

  useEffect(() => {
    document.title = locale === 'en-US'
      ? isWorkspace ? 'AEBACK — Personal tools' : 'AEBACK — Personal knowledge workspace'
      : isWorkspace ? 'AEBACK — 个人工具' : 'AEBACK — 个人知识工作台'
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (description) description.content = locale === 'en-US'
      ? isWorkspace ? 'Aeback personal tools workspace' : 'Aeback — personal knowledge workspace'
      : isWorkspace ? 'Aeback 个人工具工作台' : 'Aeback — 个人知识工作台'
    if (!isWorkspace) {
      try { document.documentElement.dataset.theme = window.localStorage.getItem('aeback-theme') === 'light' ? 'light' : 'dark' }
      catch { document.documentElement.dataset.theme = 'dark' }
    }
  }, [isWorkspace, locale])

  const enterWorkspace = () => {
    window.history.pushState({ page: 'workspace' }, '', '/workspace')
    setPathname('/workspace')
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  return isWorkspace ? <App /> : <LandingPage onEnterWorkspace={enterWorkspace} />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider><AebackRoot /></I18nProvider>
  </React.StrictMode>,
)
