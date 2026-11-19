// Aeback table import preview — native modal focus management and explicit replacement or append.
import { useEffect, useRef } from 'react'
import Icon from './Icon'
import { useI18n } from '../lib/i18n'

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
  const { t } = useI18n()
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return <dialog ref={dialogRef} className="dialog-card table-import-dialog" aria-labelledby="aeback-table-import-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <div className="dialog-header"><h2 id="aeback-table-import-title">{t('导入表格')}</h2><button className="icon-button" type="button" aria-label={t('取消导入')} onClick={onClose}><Icon name="close" size={16} /></button></div>
    <div className="table-import-options"><label><input type="checkbox" checked={firstHeader} onChange={(event) => onHeaderChange(event.target.checked)} />{t('首行为列名')}</label><select aria-label={t('导入方式')} value={mode} onChange={(event) => onModeChange(event.target.value)}><option value="replace">{t('替换表格')}</option><option value="append">{t('按列顺序追加')}</option></select><span>{t('{count} 行', { count: Math.max(0, rows.length - (firstHeader ? 1 : 0)) })} · {t('{count} 列', { count: Math.max(...rows.map((row) => row.length)) })}</span></div>
    <div className="table-import-preview"><table><tbody>{rows.slice(0, 6).map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody></table></div>
    <p role="status">{message}</p><button className="primary-button" type="button" onClick={onConfirm}>{t('确认导入')}</button>
  </dialog>
}
