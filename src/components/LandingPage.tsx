// Aeback official landing page — a direct introduction to the local personal tools workspace.
import BrandLogo from './BrandLogo'
import Icon, { type IconName } from './Icon'
import { useI18n } from '../lib/i18n'
import WebsiteShell, { SiteLink, type SiteNavigate } from './WebsiteShell'

type LandingPageProps = { onNavigate: SiteNavigate }

const tools: Array<{ id: string; slug: string; icon: IconName; title: string; description: string }> = [
  { id: 'mindmap', slug: 'mind-map', icon: 'mindmap', title: '思维导图', description: '拆解主题，拖动节点，调整方向与色彩。' },
  { id: 'graph', slug: 'knowledge-graph', icon: 'network', title: '知识图谱', description: '从文章提取节点与关系，整理知识脉络。' },
  { id: 'document', slug: 'smart-documents', icon: 'document', title: '智能文档', description: '用 Markdown、代码块与提示块组织内容。' },
  { id: 'table', slug: 'smart-tables', icon: 'table', title: '智能表格', description: '管理资料、公式、筛选与单元格格式。' },
]

function LandingPage({ onNavigate }: LandingPageProps) {
  const { t } = useI18n()

  return <WebsiteShell currentPath="/" onNavigate={onNavigate}>
    <main className="site-home" id="top">
    <section className="site-hero site-container">
      <div className="site-hero-copy">
        <p className="site-eyebrow"><span />AEBACK · PERSONAL WORKSPACE <b className="site-free-pill">{t('免费使用')}</b></p>
        <h1>{t('四种个人工具')}<span>{t('全部免费使用')}</span></h1>
        <p className="site-hero-description">{t('思维导图、知识图谱、智能文档与智能表格，打开即用，数据保存在本地。')}</p>
        <div className="site-hero-actions">
          <SiteLink className="site-button site-button--primary" to="/workspace" onNavigate={onNavigate}>{t('免费进入工作台')}</SiteLink>
          <a className="site-button site-button--quiet" href="#tools">{t('了解工具')}</a>
        </div>
        <p className="site-hero-note"><span aria-hidden="true">✓</span>{t('工作区保存在当前浏览器')}</p>
      </div>

      <div className="site-preview-wrap" role="img" aria-label={t('AEBACK 工作台预览')}>
        <div className="site-preview-glow" />
        <div className="site-preview">
          <div className="site-preview-topbar">
            <div className="site-window-dots" aria-hidden="true"><i /><i /><i /></div>
            <span>{t('我的工作区')}</span>
            <span className="site-preview-saved"><i />{t('本地已保存')}</span>
          </div>
          <div className="site-preview-content">
            <aside className="site-preview-sidebar" aria-hidden="true">
              <div className="site-preview-brand"><BrandLogo compact /><b>AEBACK</b></div>
              <span className="is-current"><Icon name="grid" size={13} />{t('全部文件')}</span>
              <span><Icon name="mindmap" size={13} />{t('思维导图')}</span>
              <span><Icon name="network" size={13} />{t('知识图谱')}</span>
              <span><Icon name="document" size={13} />{t('智能文档')}</span>
              <span><Icon name="table" size={13} />{t('智能表格')}</span>
            </aside>
            <div className="site-preview-main">
              <small>{t('AEBACK 工作区')}</small>
              <h2>{t('整理成自己的知识。')}</h2>
              <div className="site-preview-grid">
                {tools.map((tool) => <div className={`site-preview-item site-preview-item--${tool.id}`} key={tool.id}>
                  <span><Icon name={tool.icon} size={14} /></span>
                  <b>{t(tool.title)}</b>
                  <i />
                </div>)}
              </div>
              <div className="site-preview-recent"><span>{t('最近打开')}</span><i /><i /><i /></div>
            </div>
          </div>
        </div>
        <div className="site-preview-caption"><span>{t('从一个想法开始')}</span><i />{t('在同一工作区继续整理')}</div>
      </div>
    </section>

    <section className="site-tools-section site-container" id="tools">
      <div className="site-section-heading">
        <p className="site-eyebrow">{t('为不同的思考方式准备')}</p>
        <h2>{t('四种工具，一处工作区。')}</h2>
        <p>{t('从结构、关系、文字或数据入手，按适合自己的方式推进。')}</p>
      </div>
      <div className="site-tool-grid">
        {tools.map((tool) => <article className={`site-tool-card site-tool-card--${tool.id}`} key={tool.id}>
          <div className="site-tool-card-heading"><span><Icon name={tool.icon} size={18} /></span><h3>{t(tool.title)}</h3></div>
          <p>{t(tool.description)}</p>
          <div className={`site-tool-demo site-tool-demo--${tool.id}`} aria-hidden="true">
            {tool.id === 'mindmap' && <>
              <svg viewBox="0 0 360 106"><path d="M180 53 C145 53 133 23 91 23 M180 53 C145 53 133 82 91 82 M180 53 C219 53 228 23 270 23 M180 53 C219 53 228 82 270 82" /><circle cx="180" cy="53" r="4" /></svg>
              <span className="demo-node demo-node--center">{t('年度计划')}</span><span className="demo-node demo-node--left-top">{t('阅读')}</span><span className="demo-node demo-node--left-bottom">{t('写作')}</span><span className="demo-node demo-node--right-top">{t('产品')}</span><span className="demo-node demo-node--right-bottom">{t('复盘')}</span>
            </>}
            {tool.id === 'graph' && <>
              <svg viewBox="0 0 360 106"><path d="M180 52 L85 25 M180 52 L133 83 M180 52 L275 22 M180 52 L276 79 M180 52 L181 12" /><circle cx="180" cy="52" r="4" /></svg>
              <span className="demo-graph-node demo-graph-node--root">{t('注意力')}</span><span className="demo-graph-node demo-graph-node--a">{t('工作记忆')}</span><span className="demo-graph-node demo-graph-node--b">{t('学习')}</span><span className="demo-graph-node demo-graph-node--c">{t('认知')}</span><span className="demo-graph-node demo-graph-node--d">{t('文章')}</span><span className="demo-graph-node demo-graph-node--e">{t('信息')}</span>
            </>}
            {tool.id === 'document' && <div className="demo-document"><b>{t('AEBACK 产品手册')}</b><i /><i /><i /><strong /><i /><i /></div>}
            {tool.id === 'table' && <div className="demo-table"><div><b>{t('项目')}</b><b>{t('进度')}</b><b>{t('评分')}</b></div><div><span>{t('阅读计划')}</span><span className="demo-cell demo-cell--green">{t('进行中')}</span><span>4</span></div><div><span>{t('产品设计')}</span><span className="demo-cell demo-cell--orange">{t('待整理')}</span><span>5</span></div></div>}
          </div>
          <SiteLink className="site-tool-link" to={`/tools/${tool.slug}`} onNavigate={onNavigate}>{t('查看工具介绍')}</SiteLink>
        </article>)}
      </div>
    </section>

    <section className="site-knowledge-section site-container">
      <div className="site-knowledge-copy">
        <p className="site-eyebrow">{t('从原文走向关系')}</p>
        <h2>{t('文章不只被收藏，也能成为知识图谱。')}</h2>
        <p>{t('导入文章后，AEBACK 会识别标题与段落要点，生成可继续编辑的节点关系。')}</p>
        <SiteLink className="site-inline-link" to="/tools/knowledge-graph" onNavigate={onNavigate}>{t('查看知识图谱介绍')}</SiteLink>
      </div>
      <div className="site-knowledge-visual" aria-hidden="true">
        <div className="site-source-card"><span><Icon name="document" size={14} /></span><b>{t('一篇文章')}</b><i /><i /><i /></div>
        <svg viewBox="0 0 430 250"><path d="M117 118 C166 118 173 48 220 48 M117 132 C166 132 174 202 220 202 M271 48 C320 48 323 94 360 94 M271 202 C320 202 323 156 360 156 M246 70 C246 98 246 148 246 180 M270 123 L330 123" /></svg>
        <div className="site-knowledge-node site-knowledge-node--one">{t('核心主题')}</div><div className="site-knowledge-node site-knowledge-node--two">{t('概念')}</div><div className="site-knowledge-node site-knowledge-node--three">{t('人物')}</div><div className="site-knowledge-node site-knowledge-node--four">{t('相关观点')}</div><div className="site-knowledge-node site-knowledge-node--five">{t('来源')}</div>
      </div>
    </section>

    <section className="site-local-section site-container" id="local">
      <div className="site-local-mark"><BrandLogo compact /></div>
      <div>
        <p className="site-eyebrow">{t('你的资料，由你掌握')}</p>
        <h2>{t('本地保存，随时带走。')}</h2>
        <p>{t('工作区保存在当前浏览器。可导出 AEBACK JSON 备份，内容不会发送到外部服务。')}</p>
      </div>
      <SiteLink className="site-button site-button--primary" to="/free" onNavigate={onNavigate}>{t('了解免费方案')}</SiteLink>
    </section>
    </main>
  </WebsiteShell>
}

export default LandingPage
