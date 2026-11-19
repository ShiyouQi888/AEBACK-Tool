// Aeback website frame — shared navigation, language switcher, and brand footer.
import type { AnchorHTMLAttributes, MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import BrandLogo from './BrandLogo'
import LanguageSwitcher from './LanguageSwitcher'
import { useI18n } from '../lib/i18n'

export type SiteNavigate = (path: string) => void

type SiteLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'> & {
  to: string
  onNavigate: SiteNavigate
}

export function SiteLink({ to, onNavigate, target, children, ...props }: SiteLinkProps) {
  const handleClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (target === '_blank' || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (to.startsWith('#')) return
    event.preventDefault()
    onNavigate(to)
  }
  return <a {...props} href={to} target={target} onClick={handleClick}>{children}</a>
}

type WebsiteShellProps = { currentPath: string; onNavigate: SiteNavigate; children: ReactNode }

function WebsiteShell({ currentPath, onNavigate, children }: WebsiteShellProps) {
  const { t } = useI18n()
  const year = new Date().getFullYear()
  return <div className="marketing-site">
    <header className="site-header">
      <SiteLink className="site-brand" to="/" onNavigate={onNavigate} aria-label="AEBACK"><BrandLogo /></SiteLink>
      <nav className="site-nav" aria-label={t('官网导航')}>
        <SiteLink to="/tools" onNavigate={onNavigate} aria-current={currentPath.startsWith('/tools') ? 'page' : undefined}>{t('产品工具')}</SiteLink>
        <SiteLink to="/free" onNavigate={onNavigate} aria-current={currentPath === '/free' ? 'page' : undefined}>{t('免费使用')}</SiteLink>
        <SiteLink to="/about" onNavigate={onNavigate} aria-current={currentPath === '/about' ? 'page' : undefined}>{t('关于 AEBACK')}</SiteLink>
      </nav>
      <div className="site-header-actions">
        <LanguageSwitcher />
        <SiteLink className="site-button site-button--primary site-header-cta" to="/workspace" onNavigate={onNavigate}>{t('进入工作台')}</SiteLink>
      </div>
    </header>
    {children}
    <footer className="site-footer site-container">
      <SiteLink className="site-footer-brand" to="/" onNavigate={onNavigate} aria-label="AEBACK"><BrandLogo /><span>AEBACK</span></SiteLink>
      <nav className="site-footer-nav" aria-label={t('页脚导航')}>
        <SiteLink to="/tools" onNavigate={onNavigate}>{t('所有工具')}</SiteLink>
        <SiteLink to="/free" onNavigate={onNavigate}>{t('免费使用')}</SiteLink>
        <SiteLink to="/privacy" onNavigate={onNavigate}>{t('隐私与本地数据')}</SiteLink>
        <SiteLink to="/about" onNavigate={onNavigate}>{t('关于 AEBACK')}</SiteLink>
      </nav>
      <span>{t('© {year} AEBACK. 保留所有权利。', { year })}</span>
    </footer>
  </div>
}

export default WebsiteShell
