// Aeback website information pages — free access, product purpose, and browser data handling.
import Icon from './Icon'
import WebsiteShell, { SiteLink, type SiteNavigate } from './WebsiteShell'
import { useI18n } from '../lib/i18n'

export function FreePage({ onNavigate }: { onNavigate: SiteNavigate }) {
  const { t } = useI18n()
  const tools = ['思维导图', '知识图谱', '智能文档', '智能表格']
  return <WebsiteShell currentPath="/free" onNavigate={onNavigate}>
    <main className="site-subpage site-free-page">
      <section className="site-subpage-hero site-container">
        <p className="site-eyebrow"><span />AEBACK · FREE</p>
        <h1>{t('免费，是 AEBACK 最直接的开始方式。')}</h1>
        <p>{t('四种个人工具现在都可以免费使用。打开工作台，直接开始整理自己的内容。')}</p>
        <SiteLink className="site-button site-button--primary" to="/workspace" onNavigate={onNavigate}>{t('免费进入工作台')}</SiteLink>
      </section>
      <section className="site-container site-free-grid">
        {tools.map((tool) => <article key={tool}><span className="site-free-check" aria-hidden="true">✓</span><span>{t(tool)}</span><b>{t('免费使用')}</b></article>)}
      </section>
      <section className="site-container site-free-details">
        <article><h2>{t('无需账号，打开即可开始。')}</h2><p>{t('当前工作台不要求创建账号或绑定支付方式。')}</p></article>
        <article><h2>{t('内容留在当前浏览器。')}</h2><p>{t('工作区保存在浏览器本地。导出 AEBACK JSON 备份，可自行保存一份。')}</p></article>
      </section>
      <section className="site-container site-free-bottom"><p>{t('想先了解每个工具能做什么？')}</p><SiteLink className="site-inline-link" to="/tools" onNavigate={onNavigate}>{t('浏览四种工具')}</SiteLink></section>
    </main>
  </WebsiteShell>
}

export function AboutPage({ onNavigate }: { onNavigate: SiteNavigate }) {
  const { t } = useI18n()
  return <WebsiteShell currentPath="/about" onNavigate={onNavigate}>
    <main className="site-subpage site-about-page">
      <section className="site-subpage-hero site-container">
        <p className="site-eyebrow">AEBACK · ABOUT</p>
        <h1>{t('让个人思考，有一个清楚的工作空间。')}</h1>
        <p>{t('AEBACK 是一组围绕个人知识整理而设计的工具：思维导图、知识图谱、智能文档与智能表格。')}</p>
      </section>
      <section className="site-container site-about-principles">
        <article><span className="site-about-principle-icon"><Icon name="grid" size={18} /></span><h2>{t('工具专注')}</h2><p>{t('每个工具处理一种清晰任务，界面直接，操作围绕内容展开。')}</p></article>
        <article><span className="site-about-principle-icon"><Icon name="link" size={18} /></span><h2>{t('知识相连')}</h2><p>{t('节点、文章、文档和表格帮助你建立自己的内容结构与关系。')}</p></article>
        <article><span className="site-about-principle-icon"><Icon name="document" size={18} /></span><h2>{t('本地优先')}</h2><p>{t('工作区保存在当前浏览器，需要备份时可以导出数据。')}</p></article>
      </section>
      <section className="site-container site-about-cta"><h2>{t('从一个想法开始。')}</h2><SiteLink className="site-button site-button--primary" to="/workspace" onNavigate={onNavigate}>{t('进入工作台')}</SiteLink></section>
    </main>
  </WebsiteShell>
}

export function PrivacyPage({ onNavigate }: { onNavigate: SiteNavigate }) {
  const { t } = useI18n()
  return <WebsiteShell currentPath="/privacy" onNavigate={onNavigate}>
    <main className="site-subpage site-privacy-page">
      <section className="site-subpage-hero site-container">
        <p className="site-eyebrow">AEBACK · PRIVACY</p>
        <h1>{t('本地保存，数据去向清楚。')}</h1>
        <p>{t('AEBACK 当前版本以浏览器本地存储为主，不需要账号登录。')}</p>
      </section>
      <section className="site-container site-privacy-content">
        <article><h2>{t('工作区内容')}</h2><p>{t('思维导图、知识图谱、文档和表格内容保存在浏览器 IndexedDB。旧版工作区会在首次打开时从 localStorage 自动迁移。')}</p></article>
        <article><h2>{t('偏好设置')}</h2><p>{t('界面语言和主题等小型偏好保存在浏览器 localStorage。')}</p></article>
        <article><h2>{t('文章识别与导出')}</h2><p>{t('文章识别在当前页面本地完成。只有你主动导出时，浏览器才会生成备份文件。')}</p></article>
        <article><h2>{t('清理浏览器数据')}</h2><p>{t('清除浏览器站点数据会一并删除本地工作区。清理前请先从工作台导出 AEBACK JSON 备份。')}</p></article>
      </section>
      <section className="site-container site-privacy-cta"><p>{t('需要整理自己的数据？')}</p><SiteLink className="site-inline-link" to="/workspace" onNavigate={onNavigate}>{t('打开工作台')}</SiteLink></section>
    </main>
  </WebsiteShell>
}
