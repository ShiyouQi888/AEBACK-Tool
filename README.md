<!-- Aeback project guide — product entry point and local development. -->
# AEBACK

Aeback 是个人工具工作台，提供思维导图、知识图谱、智能文档和智能表格。

## 启动

需要 Node.js 20.19+ 或 22.12+。

```bash
npm install
npm run dev
```

## 工具

- **思维导图：**新增、编辑、移动和删除节点，父级按层级大于子级，调整颜色、布局方向和连线；导出 PNG/JPG 图片、SVG 矢量图、可回导编辑的 `.aeback` 工程、Markdown 大纲。
- **知识图谱：**导入 Markdown、文本文件或粘贴文章；识别标题和段落要点，生成带原文来源的辐射节点；按中心关系层级区分节点尺寸。节点与关系可继续编辑；导出 PNG/JPG、SVG、可回导的 `.aeback` 工程和包含节点、关系、来源的 Markdown 报告。
- **智能文档：**Markdown/GFM 编辑与安全预览、标题大纲、编辑/分屏/阅读视图、查找替换、格式工具、撤销重做、`.md` / `.txt` 导入、Markdown/HTML 导出和打印。
- **智能表格：**分页网格、单元格与区域编辑、数值/文本/日期/复选框列、搜索筛选、排序、CSV/TSV 预览导入导出、区域复制粘贴、自动类型识别、合计和公式。

表格公式支持单元格与区域引用、`SUM`、`AVERAGE`、`MIN`、`MAX`、`COUNT`、`ROUND`、`ABS` 及 `+ - * / ^` 运算。排序只调整视图；行列插入和删除会维护公式引用，并显示循环、除零和无效引用错误。表格最多 2,000 行、52 列；CSV 导入最大 4 MB。

## 数据与架构

所有工具使用同一 `WorkspaceArtifact` 联合类型和本地工作区存储；每种工具各自负责编辑体验。数据保存在浏览器 `localStorage` 的 `aeback.workspace.v2`，可从侧栏导出 AEBACK JSON 备份。当前文章识别使用本地结构与段落提取，不会发送内容到外部服务，也不依赖生成式 AI。

新增文件应在文件头部注释或必要元数据中包含 Aeback 品牌。
