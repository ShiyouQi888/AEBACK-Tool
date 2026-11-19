// Aeback tools overview — four distinct entry points into the same workspace.
import Icon, { type IconName } from './Icon'
import WebsiteShell, { SiteLink, type SiteNavigate } from './WebsiteShell'
import { useI18n } from '../lib/i18n'
import type { ToolType } from '../types'

const tools: Array<{ id: ToolType; slug: string; icon: IconName; title: string; summary: string; points: string[] }> = [
  { id: 'mindmap', slug: 'mind-map', icon: 'mindmap', title: '思维导图', summary: '把主题拆成层次清晰、可以自由调整的节点结构。', points: ['四向添加节点', '节点自由拖动', '布局、颜色与连线设置'] },
  { id: 'graph', slug: 'knowledge-graph', icon: 'network', title: '知识图谱', summary: '从文章开始抽取节点与关系，再继续手动整理。', points: ['导入文章识别内容', '节点与关系自由编辑', '辐射布局与工程导出'] },
  { id: 'document', slug: 'smart-documents', icon: 'document', title: '智能文档', summary: '用 Markdown、结构化大纲和内容块记录长文。', points: ['编辑、分屏与阅读视图', '提示块与代码块', 'Markdown、HTML 与打印'] },
  { id: 'table', slug: 'smart-tables', icon: 'table', title: '智能表格', summary: '用结构化数据、公式与格式管理计划和资料。', points: ['筛选、排序与分组', '公式与列汇总', '区域格式与图片导出'] },
]

function ToolsPage({ onNavigate }: { onNavigate: SiteNavigate }) {
  const { t } = useI18n()
  return <WebsiteShell currentPath="/tools" onNavigate={onNavigate}>
    <main className="site-subpage">
      <section className="site-subpage-hero site-container">
        <p className="site-eyebrow">AEBACK · {t('产品工具')}</p>
        <h1>{t('为每一种整理方式，准备一个专注工具。')}</h1>
        <p>{t('四个工具各自独立，也共享同一个本地工作区。全部免费使用。')}</p>
        <SiteLink className="site-button site-button--primary" to="/workspace" onNavigate={onNavigate}>{t('进入工作台')}</SiteLink>
      </section>
      <section className="site-container site-tools-index" aria-label={t('产品工具')}>
        {tools.map((tool) => <article className={`site-index-card site-index-card--${tool.id}`} key={tool.id}>
          <div className="site-index-card-top"><span><Icon name={tool.icon} size={20} /></span><small>{t('免费使用')}</small></div>
          <h2>{t(tool.title)}</h2>
          <p>{t(tool.summary)}</p>
          <ul>{tool.points.map((point) => <li key={point}>{t(point)}</li>)}</ul>
          <div className="site-index-card-actions">
            <SiteLink className="site-inline-link" to={`/tools/${tool.slug}`} onNavigate={onNavigate}>{t('查看独立介绍')}</SiteLink>
            <SiteLink className="site-button site-button--quiet" to={`/workspace?tool=${tool.id}`} onNavigate={onNavigate}>{t('打开工具')}</SiteLink>
          </div>
        </article>)}
      </section>
    </main>
  </WebsiteShell>
}

export default ToolsPage
