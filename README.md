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

- **思维导图：**新增、编辑、移动和删除节点，按中心主题呈现分支。
- **知识图谱：**导入 Markdown、文本文件或粘贴文章；识别标题和段落要点，生成带原文来源的辐射节点。节点与关系可继续编辑。
- **智能文档：**Markdown 文档编辑、实时目录提取和跳转。
- **智能表格：**编辑单元格、增删行列，自动计算数值列合计。

## 数据与架构

所有工具使用同一 `WorkspaceArtifact` 联合类型和本地工作区存储；每种工具各自负责编辑体验。数据保存在浏览器 `localStorage` 的 `aeback.workspace.v2`，可从侧栏导出 AEBACK JSON 备份。当前文章识别使用本地结构与段落提取，不会发送内容到外部服务，也不依赖生成式 AI。

新增文件应在文件头部注释或必要元数据中包含 Aeback 品牌。
