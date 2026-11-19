// AEBACK's custom SVG icon family: shared geometry with distinct tool symbols.
import type { ReactNode } from 'react'

export type IconName =
  | 'grid' | 'mindmap' | 'network' | 'document' | 'table'
  | 'plus' | 'search' | 'download' | 'back' | 'close' | 'row' | 'column'
  | 'trash' | 'spark' | 'arrow' | 'list' | 'menu' | 'alignLeft' | 'alignCenter'
  | 'alignRight' | 'wrap' | 'border' | 'branch' | 'link' | 'curve' | 'elbow'
  | 'arrange' | 'duplicate' | 'undo' | 'redo' | 'sun' | 'moon'

const icons: Record<IconName, ReactNode> = {
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.7" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.7" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.7" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.7" /></>,
  mindmap: <><path d="m9.5 9.5-3-3m8 3 3-3m-8 8-3 3m8-3 3 3" /><rect x="9.3" y="9.3" width="5.4" height="5.4" rx="1.8" /><circle cx="5" cy="5" r="1.65" /><circle cx="19" cy="5" r="1.65" /><circle cx="5" cy="19" r="1.65" /><circle cx="19" cy="19" r="1.65" /></>,
  network: <><path d="m6.8 6.8 4 4m2.4 0 4-4m-7.2 7.2-4 4m8-4 4 4m-6-5.2 6-6m-5 7 5.2 3" /><circle cx="5.5" cy="5.5" r="1.8" /><circle cx="18.5" cy="5.5" r="1.8" /><circle cx="5.5" cy="18.5" r="1.8" /><circle cx="18.5" cy="18.5" r="1.8" /><circle cx="12" cy="12" r="2.2" fill="currentColor" /></>,
  document: <><path d="M6.5 3.5h7l4.5 4.6v12.4H6.5a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" /><path d="M13.5 3.8v5h4.2M8 12h8m-8 3.5h8m-8 3.5h4" /></>,
  table: <><rect x="3.5" y="4" width="17" height="16" rx="2" /><path d="M3.8 9.2h16.4M9 9.5v10m5.5-10v10" /><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3H4Z" fill="currentColor" stroke="none" /></>,
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  search: <><circle cx="10.5" cy="10.5" r="6.25" /><path d="m15.2 15.2 4.6 4.6" /></>,
  download: <><path d="M12 3.5v11m0 0 4-4m-4 4-4-4" /><path d="M4.5 16.5v4h15v-4" /></>,
  back: <><path d="M19.5 12H5m7 7-7-7 7-7" /></>,
  close: <path d="m18 6-12 12M6 6l12 12" />,
  row: <><path d="M4 6h16M4 12h16M4 18h16" /><path d="M12 3.5v17" /></>,
  column: <><path d="M6 4v16m6-16v16m6-16v16" /><path d="M3.5 12h17" /></>,
  trash: <><path d="M4.5 7h15m-9.5 4v6m4-6v6M6.5 7l1 13.5h9L17.5 7M9 7V4h6v3" /></>,
  spark: <><path d="m12 3.5 1.7 6.8 6.8 1.7-6.8 1.7-1.7 6.8-1.7-6.8-6.8-1.7 6.8-1.7L12 3.5Z" /><path d="m19 3 .7 2.3L22 6l-2.3.7L19 9l-.7-2.3L16 6l2.3-.7L19 3Z" /></>,
  arrow: <><path d="M4.5 12h14" /><path d="m12.5 5.5 6.5 6.5-6.5 6.5" /></>,
  list: <><path d="M9 6h11m-11 6h11m-11 6h11" /><circle cx="4.5" cy="6" r=".8" fill="currentColor" stroke="none" /><circle cx="4.5" cy="12" r=".8" fill="currentColor" stroke="none" /><circle cx="4.5" cy="18" r=".8" fill="currentColor" stroke="none" /></>,
  menu: <path d="M4 6.5h16M4 12h16M4 17.5h16" />,
  alignLeft: <path d="M4.5 5.5h15m-15 4.5h10m-10 4.5h15m-15 4.5h10" />,
  alignCenter: <path d="M4.5 5.5h15m-12.5 4.5h10m-12.5 4.5h15m-12.5 4.5h10" />,
  alignRight: <path d="M4.5 5.5h15m-10 4.5h10m-15 4.5h15m-10 4.5h10" />,
  wrap: <><path d="M4 5.5h16M4 10.5h11.5a3.5 3.5 0 0 1 0 7H13" /><path d="m15.5 14.5-2.5 3 2.5 2.5M4 20.5h16" /></>,
  border: <><rect x="4" y="4" width="16" height="16" rx="1.7" /><path d="M12 4v16M4 12h16" /></>,
  branch: <><circle cx="6" cy="5" r="2" /><circle cx="18" cy="19" r="2" /><path d="M6 7v4.5a7.5 7.5 0 0 0 7.5 7.5H16m0 0-3-3m3 3-3 3" /></>,
  link: <><path d="m9.7 14.3 4.6-4.6" /><path d="M8.2 16.2H7a4.5 4.5 0 0 1 0-9h4m5 0h1a4.5 4.5 0 0 1 0 9h-4" /></>,
  curve: <path d="M4 18h4a5 5 0 0 0 5-5V9a4 4 0 0 1 4-4h3" />,
  elbow: <path d="M4 18h8V6h8" />,
  arrange: <><rect x="3.5" y="3.5" width="7" height="6" rx="1.5" /><rect x="13.5" y="14.5" width="7" height="6" rx="1.5" /><path d="M7 10v3.5a4 4 0 0 0 4 4h2.5" /><path d="m11.5 15.5 2 2-2 2" /></>,
  duplicate: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2H8" /></>,
  undo: <><path d="m9 14-5-5 5-5" /><path d="M4 9h9a6.5 6.5 0 0 1 0 13h-2" /></>,
  redo: <><path d="m15 14 5-5-5-5" /><path d="M20 9h-9a6.5 6.5 0 0 0 0 13h2" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2m0 15v2M5.3 5.3l1.4 1.4m10.6 10.6 1.4 1.4M2.5 12h2m15 0h2M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  moon: <path d="M20.2 13.2A8.6 8.6 0 0 1 10.8 3a8.8 8.8 0 1 0 9.4 10.2Z" />,
}

function Icon({ name, size = 18, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <svg className={`aeback-icon aeback-icon--${name}${className ? ` ${className}` : ''}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>
}

export default Icon
