// Aeback table import preview — native modal focus management and explicit replacement or append.
import { useEffect, useRef } from 'react'
import Icon from './Icon'

type Props = {
  rows: string[][]
  firstHeader: boolean
  mode: string
  message: string
  onHeaderChange: (value: boolean) => void
  onModeChange: (value: string) => void
  onConfirm: () => void
  onClose: () => void
}

export default function TableImportDialog({ rows, firstHeader, mode, message, onHeaderChange, onModeChange, onConfirm, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return <dialog ref={dialogRef} className="dialog-card table-import-dialog" aria-labelledby="aeback-table-import-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <div className="dialog-header"><h2 id="aeback-table-import-title">导入表格</h2><button className="icon-button" type="button" aria-label="取消导入" onClick={onClose}><Icon name="close" size={16} /></button></div>
    <div className="table-import-options"><label><input type="checkbox" checked={firstHeader} onChange={(event) => onHeaderChange(event.target.checked)} />首行为列名</label><select aria-label="导入方式" value={mode} onChange={(event) => onModeChange(event.target.value)}><option value="replace">替换表格</option><option value="append">按列顺序追加</option></select><span>{Math.max(0, rows.length - (firstHeader ? 1 : 0))} 行 · {Math.max(...rows.map((row) => row.length))} 列</span></div>
    <div className="table-import-preview"><table><tbody>{rows.slice(0, 6).map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody></table></div>
    <p role="status">{message}</p><button className="primary-button" type="button" onClick={onConfirm}>确认导入</button>
  </dialog>
}
