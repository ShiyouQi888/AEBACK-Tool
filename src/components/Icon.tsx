// Aeback icon set for a compact, consistent personal tools workspace.
import type { ReactNode } from 'react'

export type IconName = 'grid' | 'mindmap' | 'network' | 'document' | 'table' | 'plus' | 'search' | 'download' | 'back' | 'close' | 'row' | 'column' | 'trash' | 'spark' | 'arrow' | 'list' | 'menu' | 'alignLeft' | 'alignCenter' | 'alignRight' | 'wrap' | 'branch' | 'curve' | 'elbow' | 'arrange' | 'duplicate' | 'undo' | 'redo' | 'sun' | 'moon'

const icons: Record<IconName, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.4" /><rect x="14" y="3" width="7" height="7" rx="1.4" /><rect x="3" y="14" width="7" height="7" rx="1.4" /><rect x="14" y="14" width="7" height="7" rx="1.4" /></>,
  mindmap: <><circle cx="12" cy="12" r="3" /><path d="M9 10 5 6m10 4 4-4M9 14l-4 4m10-4 4 4" /><circle cx="4" cy="5" r="1.5" /><circle cx="20" cy="5" r="1.5" /><circle cx="4" cy="19" r="1.5" /><circle cx="20" cy="19" r="1.5" /></>,
  network: <><circle cx="12" cy="5" r="2.5" /><circle cx="5" cy="18" r="2.5" /><circle cx="19" cy="18" r="2.5" /><path d="m10.8 7.2-4.6 8.6m7 0 1.9-3.6M7.5 18h9" /></>,
  document: <><path d="M6 3h8l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M8 12h8m-8 4h8" /></>,
  table: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 10v10m6-10v10" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
  download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M4 17v4h16v-4" /></>,
  back: <><path d="M19 12H5m7 7-7-7 7-7" /></>,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  row: <><path d="M4 7h16M4 12h16M4 17h16" /><path d="M12 3v18" /></>,
  column: <><path d="M7 4v16m5-16v16m5-16v16" /><path d="M3 12h18" /></>,
  trash: <><path d="M4 7h16m-10 4v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" /></>,
  spark: <><path d="m12 3 1.6 6.4L20 11l-6.4 1.6L12 19l-1.6-6.4L4 11l6.4-1.6L12 3Z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></>,
  arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
  list: <><path d="M9 6h12M9 12h12M9 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  alignLeft: <path d="M4 6h16M4 11h10M4 16h16M4 21h10" />,
  alignCenter: <path d="M4 6h16M7 11h10M4 16h16M7 21h10" />,
  alignRight: <path d="M4 6h16M10 11h10M4 16h16M10 21h10" />,
  wrap: <><path d="M4 5h16M4 10h11a3 3 0 0 1 0 6h-2m0 0 2-2m-2 2 2 2M4 21h16" /></>,
  branch: <><circle cx="6" cy="5" r="2" /><circle cx="18" cy="19" r="2" /><path d="M6 7v5a7 7 0 0 0 7 7h3m0 0-3-3m3 3-3 3" /></>,
  curve: <path d="M4 18h4a5 5 0 0 0 5-5V9a4 4 0 0 1 4-4h3" />,
  elbow: <path d="M4 18h8V6h8" />,
  arrange: <><rect x="3.5" y="3.5" width="7" height="6" rx="1.2" /><rect x="13.5" y="14.5" width="7" height="6" rx="1.2" /><path d="M7 10v4a3.5 3.5 0 0 0 3.5 3.5h3" /></>,
  duplicate: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
  undo: <><path d="M9 14 4 9l5-5" /><path d="M4 9h9a6 6 0 0 1 0 12h-2" /></>,
  redo: <><path d="m15 14 5-5-5-5" /><path d="M20 9h-9a6 6 0 0 0 0 12h2" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
  moon: <path d="M20.9 13.1A8.5 8.5 0 0 1 10.9 3.1 8.6 8.6 0 1 0 20.9 13.1Z" />,
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>
}

export default Icon
