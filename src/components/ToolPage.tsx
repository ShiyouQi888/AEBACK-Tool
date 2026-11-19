// Aeback individual tool pages — one focused feature story per workspace tool.
import type { IconName } from './Icon'
import WebsiteShell, { SiteLink, type SiteNavigate } from './WebsiteShell'
import { useI18n } from '../lib/i18n'
import type { ToolType } from '../types'

type ToolPageSpec = {
  slug: string
  icon: IconName
  title: string
  lead: string
  intro: string
  capabilityTitle: string
  features: string[]
  workflowTitle: string
  workflowIntro: string
  steps: Array<{ title: string; body: string }>
  useCases: string[]
  sections: Array<{ title: string; body: string }>
}

export const toolPageSpecs: Record<ToolType, ToolPageSpec> = {
  mindmap: {
    slug: 'mind-map', icon: 'mindmap', title: '思维导图', lead: '让复杂想法，展开成清晰结构。',
    intro: '从一个中心主题开始。通过卡片四边扩展节点，调整方向、色彩和连线，让结构跟上思路变化。',
    capabilityTitle: '节点、层级与连线，都能直接在画布里调整。',
    features: ['四向连接点添加节点', '自由拖拽与一键整理', '分支方向、颜色透明度与线型', 'PNG、JPG、SVG 与 Aeback 工程导出'],
    workflowTitle: '从一个主题展开成可编辑结构',
    workflowIntro: '先记录想法，再按分支梳理层级；结构变化时，节点和布局可以随时调整。',
    steps: [
      { title: '建立中心主题', body: '输入一个问题、计划或目标，让主题成为整张导图的起点。' },
      { title: '从卡片四边扩展', body: '点击节点上、下、左、右的加号创建对应方向的子节点，也可拖到其他节点建立跨节点连接。' },
      { title: '整理并导出', body: '拖动节点调整结构，使用一键整理恢复清晰层级，再导出图片或可继续编辑的工程文件。' },
    ],
    useCases: ['项目拆解', '读书提纲', '目标规划'],
    sections: [
      { title: '从节点四边继续思考', body: '通过节点边缘的上、下、左、右连接点添加内容。子节点按层级继承颜色，并沿分支方向自动排布。' },
      { title: '让层级和关系都看得清', body: '父级节点保持更醒目的尺寸，子节点按分支颜色延续。切换布局方向和曲线、自动折线，让连线更贴合内容结构。' },
      { title: '把结构带到其他地方', body: '导出 PNG、JPG 或 SVG 用于展示，也可以保存 Aeback 工程，保留节点位置、层级、颜色和连线以便继续编辑。' },
    ],
  },
  graph: {
    slug: 'knowledge-graph', icon: 'network', title: '知识图谱', lead: '从文章出发，看见知识之间的关系。',
    intro: '把文章转成可检查的节点和关系。保留来源线索，再将概念、人物与观点整理成自己的知识网络。',
    capabilityTitle: '文章来源、知识节点和关系，放进同一张图里。',
    features: ['导入 Markdown、文本或粘贴文章', '按标题和段落要点识别节点', '圆形节点、关系标签与跨节点连接', 'PNG、JPG、SVG 与 Aeback 工程导出'],
    workflowTitle: '从一篇文章整理出关系网络',
    workflowIntro: '先让文章形成初始结构，再检查识别结果和关系，最后按你的理解继续补充。',
    steps: [
      { title: '导入文章', body: '选择 Markdown 或文本文件，也可以直接粘贴文章内容，在当前浏览器中生成初始图谱。' },
      { title: '检查识别结果', body: '根据文章标题和段落要点创建节点；查看节点来源，重命名、移动或删除不需要的内容。' },
      { title: '补充知识关系', body: '创建跨节点连接，填写关系标签和方向；整理图谱后导出图片、报告或可继续编辑的工程文件。' },
    ],
    useCases: ['读书笔记', '研究资料', '主题知识库'],
    sections: [
      { title: '文章成为可追溯的图谱', body: '节点保留标题或段落来源，便于回到文章核对。识别只是整理起点，节点内容和关系都可以手动修订。' },
      { title: '让关系表达具体含义', body: '为连接添加关系名称和方向；节点保持圆形。自动整理围绕图谱中心展开，方便继续拖动和校正。' },
      { title: '保存结构，持续扩展', body: '将节点、关系和来源导出为 Aeback 工程或 Markdown 报告；需要分享时，可导出 PNG、JPG 或 SVG。' },
    ],
  },
  document: {
    slug: 'smart-documents', icon: 'document', title: '智能文档', lead: '写作与结构整理，在同一篇文档里完成。',
    intro: '用 Markdown 写作，在大纲、提示块、代码块和阅读预览之间切换，让长文易于编写、浏览和带走。',
    capabilityTitle: '写作、结构整理和阅读检查，在同一篇文档里完成。',
    features: ['编辑、分屏与阅读视图', '标题大纲与查找替换', '高亮、提示块、代码块与表格', 'Markdown、HTML 导出与打印'],
    workflowTitle: '从草稿整理成可交付文档',
    workflowIntro: '专注内容本身，用结构化标题和内容块保持文档清晰，再选择适合的方式检查与导出。',
    steps: [
      { title: '写下内容或导入草稿', body: '直接编辑 Markdown，也可导入 Markdown 或纯文本文件；文档会自动保存在浏览器工作区。' },
      { title: '搭建文档结构', body: '使用标题生成侧边大纲，再插入高亮、提示块、代码块、任务列表和表格表达不同内容。' },
      { title: '检查并交付', body: '通过编辑、分屏或阅读视图检查全文，使用查找替换修订，最后导出 Markdown、HTML 或打印为 PDF。' },
    ],
    useCases: ['项目方案', '会议记录', '技术说明'],
    sections: [
      { title: '长文始终可以快速定位', body: '标题自动形成侧边目录，选择章节即可定位。分屏时同时查看原文和排版结果，阅读视图隐藏编辑控件。' },
      { title: '让不同内容有合适的表达', body: '支持 Markdown/GFM、文字高亮、提示块、代码块、任务列表、链接和表格；代码块保留格式并支持复制。' },
      { title: '兼容常见文档交付方式', body: '导入 Markdown 或纯文本，导出 Markdown 与 HTML；也可使用浏览器打印功能生成 PDF。' },
    ],
  },
  table: {
    slug: 'smart-tables', icon: 'table', title: '智能表格', lead: '把计划、清单与数据整理得井井有条。',
    intro: '从字段类型和行列编辑开始，用公式汇总、筛选排序和单元格格式，把表格用于计划与日常管理。',
    capabilityTitle: '录入、计算、筛选和格式整理，都在表格里完成。',
    features: ['文本、数字、日期、选项、复选框与图片列', '公式、列汇总与区域选择', '筛选、排序、分组和 CSV 导入导出', '对齐、换行、字号、颜色、边框与图片导出'],
    workflowTitle: '从记录数据到整理出可用视图',
    workflowIntro: '按数据类型设置列，录入或导入内容，再使用公式和视图工具快速整理结果。',
    steps: [
      { title: '建立字段与数据行', body: '添加行列，为文本、数值、日期、单选、复选框或图片选择适合的列类型。' },
      { title: '计算并检查结果', body: '在单元格中输入公式，或在固定汇总行选择计数、求和、平均值、最小值和最大值。' },
      { title: '筛选、格式化与导出', body: '按条件筛选、排序或分组，框选区域设置对齐、换行、字体和边框，再导出 CSV 或表格图片。' },
    ],
    useCases: ['阅读计划', '项目跟进', '个人清单'],
    sections: [
      { title: '列类型和网格编辑', body: '使用文本、数值、日期、单选、复选框和图片列。支持插入、删除、拖动调整列宽，并可复制粘贴单元格区域。' },
      { title: '公式与汇总行', body: '支持单元格引用和常见聚合公式。每列汇总行可以选择计数、计数值、求和、平均值、最小值和最大值。' },
      { title: '视图与格式控制', body: '筛选、排序和分组帮助聚焦数据；选区格式支持对齐、自动换行、字体大小、文字颜色、填色和可调粗细边框。' },
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
        <div className="site-section-heading"><p className="site-eyebrow">{t('核心能力')}</p><h2>{t(spec.capabilityTitle)}</h2></div>
        <div className="site-feature-grid">{spec.features.map((feature, index) => <div className="site-feature-item" key={feature}><small>{String(index + 1).padStart(2, '0')}</small><span>{t(feature)}</span></div>)}</div>
      </section>
      <section className="site-container site-tool-detail-grid">
        {spec.sections.map((section, index) => <article key={section.title}><small>{String(index + 1).padStart(2, '0')}</small><h3>{t(section.title)}</h3><p>{t(section.body)}</p></article>)}
      </section>
      <section className="site-container site-workflow-section">
        <div className="site-section-heading"><p className="site-eyebrow">{t('使用流程')}</p><h2>{t(spec.workflowTitle)}</h2><p>{t(spec.workflowIntro)}</p></div>
        <ol className="site-workflow-steps">{spec.steps.map((step, index) => <li key={step.title}><span className="site-workflow-number">0{index + 1}</span><div><h3>{t(step.title)}</h3><p>{t(step.body)}</p></div></li>)}</ol>
      </section>
      <section className="site-container site-use-cases">
        <h2>{t('适合用来')}</h2>
        <ul>{spec.useCases.map((useCase) => <li key={useCase}>{t(useCase)}</li>)}</ul>
      </section>
      <section className="site-container site-tool-free-cta"><div><small>{t('AEBACK · 免费个人工具')}</small><h2>{t('现在就用自己的方式开始整理。')}</h2><p>{t('四种工具免费使用，工作区保存在当前浏览器。')}</p></div><SiteLink className="site-button site-button--primary" to={workspacePath} onNavigate={onNavigate}>{t('免费开始使用')}</SiteLink></section>
    </main>
  </WebsiteShell>
}

export default ToolPage
