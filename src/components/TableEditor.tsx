// Aeback smart table — typed grid, stable formula coordinates, view sorting, range clipboard, and atomic history.
import { useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import type { TableArtifact, TableColumnType } from '../types'
import { useArtifactHistory } from '../lib/useArtifactHistory'
import { downloadText, readTextFile } from '../lib/files'
import { adjustFormulaReferences, columnName, columnTypes, displayCell, evaluateTable, inferColumnType, MAX_COLUMNS, MAX_ROWS, parseDelimited, serializeDelimited, translateFormulaReferences, validateCell } from '../lib/table'
import Icon from './Icon'
import TableImportDialog from './TableImportDialog'

type TableEditorProps = { artifact: TableArtifact; onChange: (artifact: TableArtifact) => void }
type Address = { row: number; column: number }
type EditingCell = Address & { draft: string; source?: 'bar' }
const PAGE_SIZE = 100

function TableEditor({ artifact, onChange }: TableEditorProps) {
  const history = useArtifactHistory(artifact, onChange)
  const gridRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<Address>({ row: 0, column: 0 })
  const [anchor, setAnchor] = useState<Address | null>(null)
  const [editing, setEditing] = useState<EditingCell | null>(null)
  const editingRef = useRef(editing)
  editingRef.current = editing
  const [query, setQuery] = useState('')
  const [filterColumn, setFilterColumn] = useState(-1)
  const [filterValue, setFilterValue] = useState('')
  const [sort, setSort] = useState<{ column: number; direction: 1 | -1 } | null>(null)
  const [page, setPage] = useState(0)
  const [message, setMessage] = useState('')
  const [importData, setImportData] = useState<string[][] | null>(null)
  const [firstHeader, setFirstHeader] = useState(true)
  const [importMode, setImportMode] = useState('replace')
  const results = useMemo(() => evaluateTable(artifact), [artifact.rows, artifact.columns])
  const viewRows = useMemo(() => {
    const rows = artifact.rows.map((_, index) => index).filter((row) => {
      const cells = results[row].map(displayCell)
      return (!query || cells.some((cell) => cell.toLocaleLowerCase().includes(query.toLocaleLowerCase()))) && (filterColumn < 0 || !filterValue || cells[filterColumn]?.toLocaleLowerCase().includes(filterValue.toLocaleLowerCase()))
    })
    if (sort) rows.sort((a, b) => {
      const left = results[a][sort.column]?.value ?? ''
      const right = results[b][sort.column]?.value ?? ''
      if (left === '' || right === '') return left === right ? a - b : left === '' ? 1 : -1
      const difference = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), 'zh-CN', { numeric: true })
      return difference * sort.direction || a - b
    })
    return rows
  }, [artifact.rows, filterColumn, filterValue, query, results, sort])
  const currentPage = Math.min(page, Math.max(0, Math.ceil(viewRows.length / PAGE_SIZE) - 1))
  const pagedRows = viewRows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
  const columnType = (index: number) => artifact.columnTypes?.[index] ?? 'text'
  const active = { row: Math.min(selected.row, Math.max(0, artifact.rows.length - 1)), column: Math.min(selected.column, Math.max(0, artifact.columns.length - 1)) }
  const selectedViewIndex = viewRows.indexOf(active.row)
  const anchorIndex = anchor ? viewRows.indexOf(anchor.row) : selectedViewIndex
  const startIndex = Math.max(0, Math.min(selectedViewIndex, anchorIndex))
  const endIndex = Math.max(selectedViewIndex, anchorIndex)
  const startColumn = Math.min(active.column, anchor?.column ?? active.column)
  const endColumn = Math.max(active.column, anchor?.column ?? active.column)
  const selectedRows = selectedViewIndex < 0 ? [] : viewRows.slice(startIndex, endIndex + 1)
  const selectedNumbers = selectedRows.flatMap((row) => results[row].slice(startColumn, endColumn + 1)).filter((cell) => !cell.error && typeof cell.value === 'number').map((cell) => Number(cell.value))
  const commit = (next: TableArtifact, group = '') => { history.commit(next, group); setMessage('') }
  const focus = (address: Address, extend = false, immediate = false) => {
    editingRef.current = null
    setEditing(null)
    setAnchor(extend ? anchor ?? active : null)
    setSelected(address)
    const index = viewRows.indexOf(address.row)
    if (index >= 0) setPage(Math.floor(index / PAGE_SIZE))
    const focusCell = () => gridRef.current?.querySelector<HTMLElement>(`[data-cell="${address.row}:${address.column}"]`)?.focus()
    if (immediate) focusCell()
    else requestAnimationFrame(focusCell)
  }
  const setCell = (address: Address, value: string) => {
    const rows = artifact.rows.map((row, index) => index === address.row ? artifact.columns.map((_, column) => column === address.column ? value : row[column] ?? '') : row)
    commit({ ...artifact, rows })
    const error = validateCell(value, columnType(address.column))
    if (error) setMessage(error)
  }
  const finishEdit = () => {
    const current = editingRef.current
    if (!current) return
    editingRef.current = null
    if (current.draft !== (artifact.rows[current.row]?.[current.column] ?? '')) setCell(current, current.draft)
    setEditing(null)
  }
  const edit = (address = active, draft?: string) => {
    if (!artifact.rows[address.row]) return
    setEditing({ ...address, draft: draft ?? artifact.rows[address.row][address.column] ?? '' })
    requestAnimationFrame(() => gridRef.current?.querySelector<HTMLInputElement>('.table-cell-editor')?.focus())
  }
  const clearRange = () => {
    const rowSet = new Set(selectedRows)
    commit({ ...artifact, rows: artifact.rows.map((row, index) => rowSet.has(index) ? artifact.columns.map((_, column) => column >= startColumn && column <= endColumn ? '' : row[column] ?? '') : row) })
  }
  const changeStructure = (axis: 'row' | 'column', action: 'insert' | 'delete', index: number) => {
    const count = axis === 'row' ? artifact.rows.length : artifact.columns.length
    if (action === 'insert' && count >= (axis === 'row' ? MAX_ROWS : MAX_COLUMNS)) { setMessage('已达到表格行列上限'); return }
    if (axis === 'column' && action === 'delete' && count <= 1) { setMessage('至少保留一列'); return }
    let rows = artifact.rows.map((row) => artifact.columns.map((_, column) => row[column] ?? ''))
    const columns = [...artifact.columns]
    const types = artifact.columns.map((_, column) => columnType(column))
    if (axis === 'row') {
      if (action === 'insert') rows.splice(index, 0, columns.map(() => ''))
      else rows.splice(index, 1)
    } else {
      if (action === 'insert') { columns.splice(index, 0, `列 ${columns.length + 1}`); types.splice(index, 0, 'text'); rows.forEach((row) => row.splice(index, 0, '')) }
      else { columns.splice(index, 1); types.splice(index, 1); rows.forEach((row) => row.splice(index, 1)) }
    }
    rows = rows.map((row) => row.map((value) => adjustFormulaReferences(value, axis, index, action)))
    commit({ ...artifact, columns, columnTypes: types, rows })
    setEditing(null); setAnchor(null)
    setSelected({ row: Math.min(active.row, Math.max(0, rows.length - 1)), column: Math.min(active.column, columns.length - 1) })
    if (axis === 'column') { setSort(null); setFilterColumn(-1); setFilterValue('') }
  }
  const onCopy = (event: ClipboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLInputElement || !selectedRows.length) return
    event.preventDefault()
    const matrix = selectedRows.map((row) => artifact.columns.slice(startColumn, endColumn + 1).map((_, offset) => artifact.rows[row][startColumn + offset] ?? ''))
    const copiedRange = { sourceRows: selectedRows, sourceColumn: startColumn }
    event.clipboardData.setData('text/plain', serializeDelimited(matrix, '\t'))
    event.clipboardData.setData('application/x-aeback-table', JSON.stringify(copiedRange))
  }
  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLInputElement) return
    event.preventDefault()
    try {
      const metadata = event.clipboardData.getData('application/x-aeback-table')
      const source = metadata ? JSON.parse(metadata) as { sourceRows: number[]; sourceColumn: number } : null
      const matrix = parseDelimited(event.clipboardData.getData('text/plain'), '\t')
      if (!matrix.length) return
      const start = Math.max(0, selectedViewIndex)
      const extraRows = Math.max(0, matrix.length - (viewRows.length - start))
      if (artifact.rows.length + extraRows > MAX_ROWS || active.column + Math.max(...matrix.map((row) => row.length)) > MAX_COLUMNS) throw new Error('粘贴内容超出表格上限')
      const width = Math.max(artifact.columns.length, active.column + Math.max(...matrix.map((row) => row.length)))
      const columns = Array.from({ length: width }, (_, index) => artifact.columns[index] ?? `列 ${index + 1}`)
      const rows = Array.from({ length: artifact.rows.length + extraRows }, (_, row) => columns.map((_, column) => artifact.rows[row]?.[column] ?? ''))
      matrix.forEach((values, offset) => {
        const target = viewRows[start + offset] ?? artifact.rows.length + offset - (viewRows.length - start)
        values.forEach((value, column) => {
          const sourceRow = source?.sourceRows[offset]
          const sourceColumn = source?.sourceColumn
          rows[target][active.column + column] = sourceRow === undefined || sourceColumn === undefined
            ? value
            : translateFormulaReferences(value, target - sourceRow, active.column + column - sourceColumn)
        })
      })
      commit({ ...artifact, columns, rows, columnTypes: columns.map((_, index) => columnType(index)) })
      setMessage(`已粘贴 ${matrix.length} 行`)
    } catch (error) { setMessage(error instanceof Error ? error.message : '粘贴失败') }
  }
  const move = (deltaRow: number, deltaColumn: number, extend = false) => {
    const index = Math.max(0, Math.min(viewRows.length - 1, selectedViewIndex + deltaRow))
    const column = Math.max(0, Math.min(artifact.columns.length - 1, active.column + deltaColumn))
    focus({ row: viewRows[index] ?? active.row, column }, extend)
  }
  const onGridKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing || event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return
    if (event.ctrlKey || event.metaKey) {
      if (event.key.toLowerCase() === 'a') { event.preventDefault(); setAnchor({ row: viewRows[0] ?? 0, column: 0 }); setSelected({ row: viewRows.at(-1) ?? 0, column: artifact.columns.length - 1 }) }
      return
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'F2', 'Delete', 'Backspace', 'Escape'].includes(event.key)) {
      event.preventDefault()
      if (event.key === 'ArrowUp') move(-1, 0, event.shiftKey)
      if (event.key === 'ArrowDown') move(1, 0, event.shiftKey)
      if (event.key === 'ArrowLeft') move(0, -1, event.shiftKey)
      if (event.key === 'ArrowRight') move(0, 1, event.shiftKey)
      if (event.key === 'Tab') {
        if (!event.shiftKey && active.column === artifact.columns.length - 1) focus({ row: viewRows[Math.min(viewRows.length - 1, selectedViewIndex + 1)] ?? active.row, column: 0 })
        else if (event.shiftKey && active.column === 0) focus({ row: viewRows[Math.max(0, selectedViewIndex - 1)] ?? active.row, column: artifact.columns.length - 1 })
        else move(0, event.shiftKey ? -1 : 1)
      }
      if (event.key === 'Enter' || event.key === 'F2') edit()
      if (event.key === 'Delete' || event.key === 'Backspace') clearRange()
      if (event.key === 'Escape') setAnchor(null)
    } else if (event.key.length === 1 && !event.altKey) { event.preventDefault(); edit(active, event.key) }
  }
  const importTable = () => {
    if (!importData?.length) return
    const width = Math.max(...importData.map((row) => row.length))
    const values = firstHeader ? importData.slice(1) : importData
    if (values.length > MAX_ROWS || (importMode === 'append' && artifact.rows.length + values.length > MAX_ROWS)) { setMessage(`最多支持 ${MAX_ROWS} 行`); return }
    if (importMode === 'append' && width > artifact.columns.length) { setMessage('导入列数超过现有列数，请增加列或选择替换'); return }
    const columns = importMode === 'append' ? artifact.columns : Array.from({ length: width }, (_, column) => firstHeader ? importData[0][column]?.trim() || `列 ${column + 1}` : `列 ${column + 1}`)
    const appendedRows = importMode === 'append' ? artifact.rows.length : 0
    const rows = values.map((row) => columns.map((_, column) => translateFormulaReferences(row[column] ?? '', appendedRows, 0)))
    commit({ ...artifact, columns, rows: importMode === 'append' ? [...artifact.rows, ...rows] : rows, columnTypes: importMode === 'append' ? artifact.columnTypes : columns.map((_, column) => inferColumnType(rows.map((row) => row[column] ?? ''))) })
    setSort(null); setQuery(''); setFilterColumn(-1); setFilterValue(''); setPage(0); setAnchor(null); setSelected({ row: 0, column: 0 }); setImportData(null)
    setMessage(`已导入 ${values.length} 行`)
  }
  const exportCsv = (formulas: boolean) => {
    const rows = viewRows.map((row) => artifact.columns.map((_, column) => formulas ? artifact.rows[row][column] ?? '' : displayCell(results[row][column])))
    if (formulas) {
      // Formula coordinates belong to the stored order; export every row in that same order.
      downloadText(artifact.title, 'csv', '\uFEFF' + serializeDelimited([artifact.columns, ...artifact.rows]), 'text/csv;charset=utf-8')
    } else downloadText(artifact.title, 'csv', '\uFEFF' + serializeDelimited([artifact.columns, ...rows]), 'text/csv;charset=utf-8')
  }

  return <section className="table-editor-shell aeback-table" onKeyDown={(event) => {
    if ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase())) {
      if (event.target instanceof HTMLInputElement || importData) return
      event.preventDefault(); editingRef.current = null; setEditing(null)
      if (event.key.toLowerCase() === 'y' || event.shiftKey) history.redo(); else history.undo()
    }
  }}>
    <div className="editor-commandbar">
      <div className="editor-command-group"><button className="tool-button" type="button" aria-label="撤销" disabled={!history.canUndo} onClick={() => { setEditing(null); history.undo() }}><Icon name="undo" size={16} /></button><button className="tool-button" type="button" aria-label="重做" disabled={!history.canRedo} onClick={() => { setEditing(null); history.redo() }}><Icon name="redo" size={16} /></button><label className="table-search"><Icon name="search" size={15} /><input aria-label="搜索表格" placeholder="搜索" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); setAnchor(null) }} /></label></div>
      <div className="editor-command-group"><button className="tool-button" type="button" onClick={() => fileRef.current?.click()}>导入 CSV</button><details className="editor-menu"><summary>导出</summary><div><button type="button" onClick={() => exportCsv(false)}>CSV · 当前视图值</button><button type="button" onClick={() => exportCsv(true)}>CSV · 全表原始值与公式</button></div></details><button className="tool-button" type="button" disabled={artifact.columns.length >= MAX_COLUMNS} onClick={() => changeStructure('column', 'insert', artifact.columns.length)}><Icon name="column" size={15} />列</button><button className="tool-button tool-button--accent" type="button" disabled={artifact.rows.length >= MAX_ROWS} onClick={() => changeStructure('row', 'insert', artifact.rows.length)}><Icon name="plus" size={15} />行</button></div>
    </div>
    <div className="table-viewbar"><select aria-label="筛选列" value={filterColumn} onChange={(event) => { setFilterColumn(Number(event.target.value)); setPage(0); setAnchor(null) }}><option value={-1}>筛选列</option>{artifact.columns.map((column, index) => <option value={index} key={index}>{columnName(index)} · {column}</option>)}</select>{filterColumn >= 0 && <input aria-label="筛选内容" placeholder="包含内容" value={filterValue} onChange={(event) => { setFilterValue(event.target.value); setPage(0); setAnchor(null) }} />}{(query || filterColumn >= 0 || sort) && <button className="tool-button" type="button" onClick={() => { setQuery(''); setFilterColumn(-1); setFilterValue(''); setSort(null); setAnchor(null) }}>重置视图</button>}<span>{viewRows.length} / {artifact.rows.length} 行 · {artifact.columns.length} 列</span></div>
    <div className="table-formulabar"><span>{columnName(active.column)}{active.row + 1}</span><span>ƒx</span><input aria-label="单元格值或公式" placeholder="输入值或 =SUM(B1:B3)" value={editing?.draft ?? artifact.rows[active.row]?.[active.column] ?? ''} disabled={!artifact.rows.length} onChange={(event) => setEditing({ ...active, draft: event.target.value, source: 'bar' })} onBlur={finishEdit} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); finishEdit(); focus(active) } if (event.key === 'Escape') { setEditing(null); focus(active) } }} /><details className="editor-menu formula-help"><summary aria-label="公式帮助">?</summary><div><p>支持 A1、$A$1 和 A1:B5 引用</p><p>+ − * / ^ 与括号</p><p>SUM · AVERAGE · MIN · MAX · COUNT · ROUND · ABS</p><p>排序仅改变视图；公式坐标使用左侧原始行号。</p><p>Shift + 方向键选区；复制 / 粘贴可与 Excel 互通。</p></div></details></div>
    <div ref={gridRef} className="table-scroll" onKeyDown={onGridKey} onCopy={onCopy} onPaste={onPaste}>
      <table className="smart-table" role="grid" aria-label="Aeback 智能表格" aria-rowcount={viewRows.length + 1} aria-colcount={artifact.columns.length + 1} style={{ minWidth: 48 + artifact.columns.length * 180 }}>
        <thead><tr><th className="table-row-number" aria-label="原始行号">#</th>{artifact.columns.map((column, columnIndex) => <th key={columnIndex} aria-sort={sort?.column === columnIndex ? sort.direction === 1 ? 'ascending' : 'descending' : 'none'}><div className="table-column-heading"><span>{columnName(columnIndex)}</span><input aria-label={`第 ${columnIndex + 1} 列标题`} value={column} onChange={(event) => commit({ ...artifact, columns: artifact.columns.map((item, index) => index === columnIndex ? event.target.value : item) }, `heading-${columnIndex}`)} /><button type="button" aria-label={`排序第 ${columnIndex + 1} 列`} title="升序 / 降序 / 原始顺序" onClick={() => { setSort(sort?.column === columnIndex ? sort.direction === 1 ? { column: columnIndex, direction: -1 } : null : { column: columnIndex, direction: 1 }); setAnchor(null); setPage(0) }}>{sort?.column === columnIndex ? sort.direction === 1 ? '↑' : '↓' : '↕'}</button></div><div className="table-column-settings"><select aria-label={`第 ${columnIndex + 1} 列类型`} value={columnType(columnIndex)} onChange={(event) => commit({ ...artifact, columnTypes: artifact.columns.map((_, index) => index === columnIndex ? event.target.value as TableColumnType : columnType(index)) })}>{columnTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select><details className="editor-menu"><summary aria-label={`第 ${columnIndex + 1} 列操作`}>···</summary><div><button type="button" onClick={() => changeStructure('column', 'insert', columnIndex)}>左侧插入列</button><button type="button" onClick={() => changeStructure('column', 'insert', columnIndex + 1)}>右侧插入列</button><button type="button" disabled={artifact.columns.length <= 1} onClick={() => changeStructure('column', 'delete', columnIndex)}>删除列</button></div></details></div></th>)}<th className="table-actions-head" /></tr></thead>
        <tbody>{pagedRows.map((rowIndex) => <tr key={rowIndex} aria-rowindex={viewRows.indexOf(rowIndex) + 2}><th className="table-row-number" scope="row"><button type="button" aria-label={`选择第 ${rowIndex + 1} 行`} onClick={() => { setAnchor({ row: rowIndex, column: 0 }); setSelected({ row: rowIndex, column: artifact.columns.length - 1 }) }}>{rowIndex + 1}</button></th>{artifact.columns.map((_, columnIndex) => {
          const address = { row: rowIndex, column: columnIndex }
          const isActive = active.row === rowIndex && active.column === columnIndex
          const inRange = selectedRows.includes(rowIndex) && columnIndex >= startColumn && columnIndex <= endColumn
          const isEditing = editing?.row === rowIndex && editing.column === columnIndex && editing.source !== 'bar'
          const raw = artifact.rows[rowIndex][columnIndex] ?? ''
          const result = results[rowIndex][columnIndex]
          const error = result.error ?? validateCell(raw, columnType(columnIndex))
          return <td key={columnIndex} role="gridcell" data-cell={`${rowIndex}:${columnIndex}`} aria-selected={inRange} aria-invalid={Boolean(error)} tabIndex={isActive ? 0 : -1} className={`${inRange ? 'table-cell--selected ' : ''}${isActive ? 'table-cell--active ' : ''}${error ? 'table-cell--error ' : ''}${typeof result.value === 'number' ? 'table-cell--numeric' : ''}`} title={error || (raw.startsWith('=') ? raw : undefined)} onClick={(event) => { if (!isEditing) focus(address, event.shiftKey, true) }} onDoubleClick={() => edit(address)}>
            {isEditing ? <input className="table-cell-editor" type={columnType(columnIndex) === 'date' && !raw.startsWith('=') ? 'date' : 'text'} aria-label={`编辑 ${columnName(columnIndex)}${rowIndex + 1}`} value={editing.draft} autoFocus onChange={(event) => setEditing({ ...editing, draft: event.target.value })} onClick={(event) => event.stopPropagation()} onBlur={finishEdit} onKeyDown={(event) => { if (event.nativeEvent.isComposing) return; if (event.key === 'Enter' || event.key === 'Tab') { event.preventDefault(); finishEdit(); if (event.key === 'Enter') move(event.shiftKey ? -1 : 1, 0); else move(0, event.shiftKey ? -1 : 1) } if (event.key === 'Escape') { event.preventDefault(); editingRef.current = null; setEditing(null); focus(address) } }} /> : columnType(columnIndex) === 'checkbox' && !raw.startsWith('=') && !error ? <input type="checkbox" aria-label={`切换 ${columnName(columnIndex)}${rowIndex + 1}`} checked={raw.toUpperCase() === 'TRUE'} onClick={(event) => event.stopPropagation()} onChange={(event) => { setSelected(address); setCell(address, event.target.checked ? 'TRUE' : 'FALSE') }} /> : <span>{displayCell(result)}</span>}
          </td>
        })}<td className="table-row-action"><details className="editor-menu"><summary aria-label={`第 ${rowIndex + 1} 行操作`}>···</summary><div><button type="button" onClick={() => changeStructure('row', 'insert', rowIndex)}>上方插入行</button><button type="button" onClick={() => changeStructure('row', 'insert', rowIndex + 1)}>下方插入行</button><button type="button" onClick={() => changeStructure('row', 'delete', rowIndex)}>删除行</button></div></details></td></tr>)}</tbody>
        <tfoot><tr><th className="table-row-number">Σ</th>{artifact.columns.map((_, column) => {
          const numbers = viewRows.map((row) => results[row][column]).filter((cell) => !cell.error && typeof cell.value === 'number').map((cell) => Number(cell.value))
          return <td key={column} title="当前视图数值合计">{numbers.length ? displayCell({ value: numbers.reduce((sum, value) => sum + value, 0) }) : ''}</td>
        })}<td /></tr></tfoot>
      </table>
      {!viewRows.length && <div className="table-empty">{artifact.rows.length ? '没有匹配的行' : <button className="tool-button" type="button" onClick={() => changeStructure('row', 'insert', 0)}>添加第一行</button>}</div>}
    </div>
    <footer className="editor-statusbar"><span role="status">{message || (selectedNumbers.length ? `计数 ${selectedRows.length * (endColumn - startColumn + 1)} · 合计 ${displayCell({ value: selectedNumbers.reduce((sum, value) => sum + value, 0) })} · 平均 ${displayCell({ value: selectedNumbers.reduce((sum, value) => sum + value, 0) / selectedNumbers.length })}` : '双击编辑 · Enter 确认 · Shift + 方向键选区')}</span><div><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>上一页</button><span>{currentPage + 1} / {Math.max(1, Math.ceil(viewRows.length / PAGE_SIZE))}</span><button type="button" disabled={(currentPage + 1) * PAGE_SIZE >= viewRows.length} onClick={() => setPage(currentPage + 1)}>下一页</button></div></footer>
    <input ref={fileRef} type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" hidden onChange={async (event) => {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
      try { const parsed = parseDelimited(await readTextFile(file), file.name.toLowerCase().endsWith('.tsv') ? '\t' : ','); if (!parsed.length) throw new Error('文件没有数据'); setImportData(parsed); setFirstHeader(true); setImportMode('replace') }
      catch (error) { setMessage(error instanceof Error ? error.message : '导入失败') }
    }} />
    {importData && <TableImportDialog rows={importData} firstHeader={firstHeader} mode={importMode} message={message} onHeaderChange={setFirstHeader} onModeChange={setImportMode} onConfirm={importTable} onClose={() => setImportData(null)} />}
  </section>
}

export default TableEditor
