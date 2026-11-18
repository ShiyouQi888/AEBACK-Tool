// Aeback smart table — editable cells, rows, columns, and automatic numeric totals.
import type { TableArtifact } from '../types'
import Icon from './Icon'

type TableEditorProps = {
  artifact: TableArtifact
  onChange: (artifact: TableArtifact) => void
}

function TableEditor({ artifact, onChange }: TableEditorProps) {
  const setColumn = (columnIndex: number, value: string) => onChange({ ...artifact, columns: artifact.columns.map((column, index) => index === columnIndex ? value : column) })
  const setCell = (rowIndex: number, columnIndex: number, value: string) => onChange({ ...artifact, rows: artifact.rows.map((row, index) => index === rowIndex ? row.map((cell, cellIndex) => cellIndex === columnIndex ? value : cell) : row) })
  const addRow = () => onChange({ ...artifact, rows: [...artifact.rows, artifact.columns.map(() => '')] })
  const addColumn = () => onChange({ ...artifact, columns: [...artifact.columns, `列 ${artifact.columns.length + 1}`], rows: artifact.rows.map((row) => [...row, '']) })
  const deleteRow = (rowIndex: number) => onChange({ ...artifact, rows: artifact.rows.filter((_, index) => index !== rowIndex) })
  const numericTotals = artifact.columns.map((_, columnIndex) => {
    const values = artifact.rows.map((row) => row[columnIndex]?.trim() ?? '').filter(Boolean)
    return values.length && values.every((value) => Number.isFinite(Number(value)))
      ? values.reduce((total, value) => total + Number(value), 0)
      : null
  })
  const hasTotals = numericTotals.some((value) => value !== null)

  return (
    <section className="table-editor-shell">
      <div className="table-toolbar"><span>{artifact.rows.length} 行 · {artifact.columns.length} 列</span><div><button className="tool-button" type="button" onClick={addColumn}><Icon name="column" size={16} />列</button><button className="tool-button tool-button--accent" type="button" onClick={addRow}><Icon name="plus" size={15} />行</button></div></div>
      <div className="table-scroll"><table className="smart-table"><thead><tr>{artifact.columns.map((column, columnIndex) => <th key={`column-${columnIndex}`}><input aria-label={`第 ${columnIndex + 1} 列标题`} value={column} onChange={(event) => setColumn(columnIndex, event.target.value)} /><button className="column-delete" type="button" aria-label={`删除第 ${columnIndex + 1} 列`} onClick={() => onChange({ ...artifact, columns: artifact.columns.filter((_, index) => index !== columnIndex), rows: artifact.rows.map((row) => row.filter((_, index) => index !== columnIndex)) })}><Icon name="close" size={13} /></button></th>)}<th className="table-actions-head" /></tr></thead>
        <tbody>{artifact.rows.map((row, rowIndex) => <tr key={`row-${rowIndex}`}>{artifact.columns.map((_, columnIndex) => <td key={`cell-${rowIndex}-${columnIndex}`}><input aria-label={`${rowIndex + 1} 行 ${columnIndex + 1} 列`} value={row[columnIndex] ?? ''} onChange={(event) => setCell(rowIndex, columnIndex, event.target.value)} /></td>)}<td className="table-row-action"><button type="button" aria-label={`删除第 ${rowIndex + 1} 行`} onClick={() => deleteRow(rowIndex)}><Icon name="trash" size={14} /></button></td></tr>)}</tbody>
        {hasTotals && <tfoot><tr>{numericTotals.map((value, index) => <td key={`total-${index}`}>{index === 0 && value === null ? '合计' : value === null ? '' : index === 0 ? `合计 ${value}` : value}</td>)}<td /></tr></tfoot>}
      </table></div>
      <button className="add-row-inline" type="button" onClick={addRow}><Icon name="plus" size={15} />添加行</button>
    </section>
  )
}

export default TableEditor
