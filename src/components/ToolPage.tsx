// Aeback individual tool pages — one focused feature story per workspace tool.
import Icon, { type IconName } from './Icon'
import WebsiteShell, { SiteLink, type SiteNavigate } from './WebsiteShell'
import { useI18n } from '../lib/i18n'
import type { ToolType } from '../types'

type ToolPageSpec = {
  slug: string
  icon: IconName
  title: string
  lead: string
  intro: string
  features: string[]
  sections: Array<{ title: string; body: string }>
}

export const toolPageSpecs: Record<ToolType, ToolPageSpec> = {
  mindmap: {
    slug: 'mind-map', icon: 'mindmap', title: '思维导图', lead: '让复杂想法，展开成清晰结构。',
    intro: '从一个中心主题开始。添加分支、拖动节点、调整方向与颜色，让结构跟上思路变化。',
    features: ['四向连接点添加节点', '自由拖拽与一键整理', '分支方向、颜色透明度与线型', 'PNG、JPG、SVG 与 Aeback 工程导出'],
    sections: [
      { title: '从节点四边继续思考', body: '通过节点边缘的上、下、左、右连接点添加内容。子节点按层级继承颜色，并沿分支方向自动排布。' },
      { title: '整理时保持层级清楚', body: '一键整理会按层级重新布局；点击节点即可缩放到合适比例并居中，继续编辑不必寻找画布位置。' },
      { title: '把结构带到其他地方', body: '可导出图片、SVG 和可再次导入的 Aeback 工程文件，保留节点与连线结构。' },
    ],
  },
  graph: {
    slug: 'knowledge-graph', icon: 'network', title: '知识图谱', lead: '从文章出发，看见知识之间的关系。',
    intro: '导入文章后识别标题与段落要点，生成可自由移动、编辑和连接的节点，逐步整理成自己的知识网络。',
    features: ['导入 Markdown、文本或粘贴文章', '按标题和段落要点识别节点', '圆形节点、关系标签与跨节点连接', 'PNG、JPG、SVG 与 Aeback 工程导出'],
    sections: [
      { title: '文章成为可编辑的图谱', body: '导入后保留来源信息。生成的节点和关系可以继续重命名、移动、补充说明或删除。' },
      { title: '让关系清楚可读', body: '节点保持圆形，支持关系标签、方向设置与跨节点连接；自动整理让图谱围绕主题有序展开。' },
      { title: '保存结构，持续扩展', body: '导出 Aeback 工程以便之后继续编辑，也可导出 PNG、JPG、SVG 或 Markdown 报告。' },
    ],
  },
  document: {
    slug: 'smart-documents', icon: 'document', title: '智能文档', lead: '写作与结构整理，在同一篇文档里完成。',
    intro: '用熟悉的 Markdown 记录内容，在标题大纲、代码块、提示块和阅读预览之间自然切换。',
    features: ['编辑、分屏与阅读视图', '标题大纲与查找替换', '高亮、提示块、代码块与表格', 'Markdown、HTML 导出与打印'],
    sections: [
      { title: '让长文保持可导航', body: '标题自动生成侧边目录；点击目录定位章节，在编辑、分屏和阅读视图之间切换。' },
      { title: '表达内容所需的块', body: '支持 Markdown/GFM、文字高亮、提示块、代码块、任务列表、链接与表格。' },
      { title: '离开工作台也能使用', body: '导入 Markdown 或纯文本，导出 Markdown 与 HTML，也可直接打印或存成 PDF。' },
    ],
  },
  table: {
    slug: 'smart-tables', icon: 'table', title: '智能表格', lead: '把计划、清单与数据整理得井井有条。',
    intro: '通过列类型、公式、筛选、排序、分组和单元格格式，把轻量表格变成日常管理工具。',
    features: ['文本、数字、日期、选项、复选框与图片列', '公式、列汇总与区域选择', '筛选、排序、分组和 CSV 导入导出', '对齐、换行、字号、颜色、边框与图片导出'],
    sections: [
      { title: '按数据类型组织列', body: '列可设为文本、数值、日期、复选框、选项或图片。拖动列宽，添加、插入和删除行列。' },
      { title: '用公式整理数据', body: '支持常用聚合公式和列汇总。筛选、排序与分组能帮助快速找到当前视图中的内容。' },
      { title: '格式清楚，方便分享', body: '支持框选单元格、调整文本格式与边框，还可导入 CSV、导出 CSV 或表格图片。' },
    ],
  },
}

function ToolPreview({ type }: { type: ToolType }) {
  const { t } = useI18n()
  if (type === 'mindmap') return <div className="site-product-preview site-product-preview--mindmap" aria-hidden="true">
    <svg viewBox="0 0 520 270"><path d="M260 135 C190 135 171 64 91 64 M260 135 C190 135 171 206 91 206 M260 135 C330 135 349 64 429 64 M260 135 C330 135 349 206 429 206" /></svg>
    <span className="site-map-node site-map-node--root">{t('中心主题')}</span><span className="site-map-node site-map-node--one">{t('方向与布局')}</span><span className="site-map-node site-map-node--two">{t('节点颜色')}</span><span className="site-map-node site-map-node--three">{t('分支内容')}</span><span className="site-map-node site-map-node--four">{t('导出工程')}</span>
  </div>
  if (type === 'graph') return <div className="site-product-preview site-product-preview--graph" aria-hidden="true">
    <svg viewBox="0 0 520 270"><path d="M260 134 L113 63 M260 134 L156 217 M260 134 L401 58 M260 134 L414 204 M260 134 L259 35 M260 134 L389 132" /></svg>
    <span className="site-graph-node site-graph-node--root">{t('文章主题')}</span><span className="site-graph-node site-graph-node--one">{t('核心概念')}</span><span className="site-graph-node site-graph-node--two">{t('来源')}</span><span className="site-graph-node site-graph-node--three">{t('相关人物')}</span><span className="site-graph-node site-graph-node--four">{t('关联观点')}</span><span className="site-graph-node site-graph-node--five">{t('段落要点')}</span>
  </div>
  if (type === 'document') return <div className="site-product-preview site-product-preview--document" aria-hidden="true">
    <div className="site-document-sheet"><small>AEBACK · DOCUMENT</small><h3>{t('项目笔记')}</h3><i /><i /><i /><h4>{t('核心观点')}</h4><div className="site-document-callout">{t('把重要内容整理成清晰的段落。')}</div><i /><i /><pre><b>const idea =</b> <em>"connected"</em></pre></div>
  </div>
  return <div className="site-product-preview site-product-preview--table" aria-hidden="true">
    <table><thead><tr><th>{t('项目')}</th><th>{t('进度')}</th><th>{t('评分')}</th></tr></thead><tbody><tr><td>{t('阅读计划')}</td><td><span>{t('进行中')}</span></td><td>4</td></tr><tr><td>{t('知识整理')}</td><td><span>{t('待整理')}</span></td><td>5</td></tr><tr><td>{t('每周复盘')}</td><td><span>{t('已完成')}</span></td><td>5</td></tr></tbody><tfoot><tr><td>Σ</td><td>{t('计数')} 3</td><td>{t('平均值')} 4.7</td></tr></tfoot></table>
  </div>
}

function ToolPage({ type, currentPath, onNavigate }: { type: ToolType; currentPath: string; onNavigate: SiteNavigate }) {
  const { t } = useI18n()
  const spec = toolPageSpecs[type]
  const workspacePath = `/workspace?tool=${type}`
  return <WebsiteShell currentPath={currentPath} onNavigate={onNavigate}>
    <main className={`site-tool-page site-tool-page--${type}`}>
      <section className="site-tool-hero site-container">
        <div className="site-tool-hero-copy">
          <p className="site-eyebrow"><span />AEBACK · {t(spec.title)} <b className="site-free-pill">{t('免费使用')}</b></p>
          <h1>{t(spec.lead)}</h1>
          <p>{t(spec.intro)}</p>
          <div className="site-tool-page-actions">
            <SiteLink className="site-button site-button--primary" to={workspacePath} onNavigate={onNavigate}>{t('免费开始使用')}</SiteLink>
            <SiteLink className="site-button site-button--quiet" to="/tools" onNavigate={onNavigate}>{t('浏览所有工具')}</SiteLink>
          </div>
          <small>{t('无需注册 · 浏览器本地保存')}</small>
        </div>
        <div className="site-tool-hero-visual"><ToolPreview type={type} /></div>
      </section>
      <section className="site-container site-feature-section">
        <div className="site-section-heading"><p className="site-eyebrow">{t('为日常整理而设计')}</p><h2>{t('把核心操作放在手边。')}</h2></div>
        <div className="site-feature-grid">{spec.features.map((feature) => <div className="site-feature-item" key={feature}><Icon name="spark" size={17} /><span>{t(feature)}</span></div>)}</div>
      </section>
      <section className="site-container site-tool-detail-grid">
        {spec.sections.map((section) => <article key={section.title}><h3>{t(section.title)}</h3><p>{t(section.body)}</p></article>)}
      </section>
      <section className="site-container site-tool-free-cta"><div><small>{t('AEBACK · 免费个人工具')}</small><h2>{t('现在就用自己的方式开始整理。')}</h2><p>{t('四种工具免费使用，工作区保存在当前浏览器。')}</p></div><SiteLink className="site-button site-button--primary" to={workspacePath} onNavigate={onNavigate}>{t('免费开始使用')}</SiteLink></section>
    </main>
  </WebsiteShell>
}

export default ToolPage
