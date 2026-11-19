// Aeback smart table — typed grid, stable formula coordinates, view sorting, range clipboard, and atomic history.
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { toBlob } from 'html-to-image'
import type { TableArtifact, TableCellAlignment, TableCellColor, TableCellFormatting, TableColumnType, TableRowHeight, TableSummaryType } from '../types'
import { useArtifactHistory } from '../lib/useArtifactHistory'
import { downloadBlob, downloadText, readTextFile } from '../lib/files'
import { adjustCellColors, adjustCellMap, adjustFormulaReferences, columnName, columnTypes, displayCell, evaluateTable, inferColumnType, MAX_COLUMNS, MAX_ROWS, parseDelimited, serializeDelimited, translateFormulaReferences, validateCell } from '../lib/table'
import Icon, { type IconName } from './Icon'
import TableImportDialog from './TableImportDialog'

type TableEditorProps = { artifact: TableArtifact; onChange: (artifact: TableArtifact) => void }
type Address = { row: number; column: number }
type EditingCell = Address & { draft: string; source?: 'bar' }
type TableClipboardRange = {
  sourceRows: number[]
  sourceColumn: number
  cellFormatting?: Array<Array<TableCellFormatting | null>>
  cellColors?: Array<Array<TableCellColor | null>>
}
const PAGE_SIZE = 100
const DEFAULT_COLUMN_WIDTH = 180
const MIN_COLUMN_WIDTH = 120
const MAX_COLUMN_WIDTH = 720
const cellColors: Array<{ value: TableCellColor; label: string }> = [
  { value: 'purple', label: '紫色' }, { value: 'blue', label: '蓝色' }, { value: 'green', label: '绿色' },
  { value: 'yellow', label: '黄色' }, { value: 'orange', label: '橙色' }, { value: 'red', label: '红色' },
]
const textColors = [
  { value: '#ff6b61', label: '红色' }, { value: '#ff9c4a', label: '橙色' }, { value: '#d9b84c', label: '黄色' },
  { value: '#44bd95', label: '绿色' }, { value: '#5798f5', label: '蓝色' }, { value: '#a375ef', label: '紫色' },
]
const fontSizes = [10, 11, 12, 13, 14, 16, 18, 20, 24]
const alignments: Array<{ value: TableCellAlignment; label: string; icon: IconName }> = [
  { value: 'left', label: '左对齐', icon: 'alignLeft' },
  { value: 'center', label: '居中', icon: 'alignCenter' },
  { value: 'right', label: '右对齐', icon: 'alignRight' },
]
const rowHeights: Array<{ value: TableRowHeight; label: string }> = [
  { value: 'compact', label: '紧凑' }, { value: 'normal', label: '标准' }, { value: 'comfortable', label: '舒适' },
]
const summaryOptions: Array<{ value: TableSummaryType; label: string }> = [
  { value: 'none', label: '不显示' }, { value: 'count', label: '计数' }, { value: 'nonEmptyCount', label: '非空计数' },
  { value: 'sum', label: '求和' }, { value: 'average', label: '平均值' }, { value: 'min', label: '最小值' }, { value: 'max', label: '最大值' },
]
const imagePlaceholder = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="#252630"/><path d="M34 52l15-16 11 11 9-9 17 18H34z" fill="none" stroke="#737581" stroke-width="3"/><circle cx="45" cy="29" r="5" fill="#737581"/></svg>')}`

function TableImageCell({ source }: { source: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [source])
  if (!source) return null
  return failed ? <span className="table-image-fallback" title={source}>图片不可用</span> : <img className="table-image-preview" src={source} alt="表格图片" title={source} loading="lazy" onError={() => setFailed(true)} />
}

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
  const [imageExporting, setImageExporting] = useState(false)
  const [importData, setImportData] = useState<string[][] | null>(null)
  const [firstHeader, setFirstHeader] = useState(true)
  const [importMode, setImportMode] = useState('replace')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set())
  const [resizingColumnWidths, setResizingColumnWidths] = useState<number[] | null>(null)
  const resizeRef = useRef<{ column: number; startX: number; startWidth: number; pointerId: number } | null>(null)
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
  const visibleTableRows = useMemo(() => {
    const groupColumn = artifact.groupBy
    if (groupColumn === undefined || groupColumn < 0 || groupColumn >= artifact.columns.length) return pagedRows.map((row) => ({ kind: 'data' as const, row }))
    const groups = new Map<string, { label: string; rows: number[] }>()
    for (const row of pagedRows) {
      const label = displayCell(results[row][groupColumn]) || '空白'
      const key = `${groupColumn}:${JSON.stringify(label)}`
      const group = groups.get(key) ?? { label, rows: [] }
      group.rows.push(row)
      groups.set(key, group)
    }
    const output: Array<{ kind: 'group'; key: string; label: string; count: number } | { kind: 'data'; row: number }> = []
    for (const [key, group] of groups) {
      output.push({ kind: 'group', key, label: group.label, count: group.rows.length })
      if (!collapsedGroups.has(key)) output.push(...group.rows.map((row) => ({ kind: 'data' as const, row })))
    }
    return output
  }, [artifact.columns.length, artifact.groupBy, collapsedGroups, pagedRows, results])
  const columnType = (index: number) => artifact.columnTypes?.[index] ?? 'text'
  const selectOptionsByColumn = useMemo(() => artifact.columns.map((_, index) => columnType(index) === 'select' ? Array.from(new Set(artifact.rows.map((row) => row[index] ?? '').filter((value) => value && !value.startsWith('=')))) : []), [artifact.columns, artifact.columnTypes, artifact.rows])
  const selectOptions = (index: number) => selectOptionsByColumn[index] ?? []
  const summaryType = (column: number): TableSummaryType => artifact.columnSummaries?.[column] ?? (viewRows.some((row) => !results[row][column].error && typeof results[row][column].value === 'number') ? 'sum' : 'none')
  const cellFormatting = (address: Address): TableCellFormatting => artifact.cellFormatting?.[`${address.row}:${address.column}`] ?? {}
  const summaryValue = (column: number, type: TableSummaryType) => {
    const cells = viewRows.map((row) => results[row][column])
    if (type === 'none') return ''
    if (type === 'count') return String(cells.filter((cell) => !cell.error && typeof cell.value === 'number').length)
    if (type === 'nonEmptyCount') return String(cells.filter((cell) => displayCell(cell) !== '').length)
    const numbers = cells.filter((cell) => !cell.error && typeof cell.value === 'number').map((cell) => Number(cell.value))
    if (!numbers.length) return ''
    if (type === 'sum') return displayCell({ value: numbers.reduce((sum, value) => sum + value, 0) })
    if (type === 'average') return displayCell({ value: numbers.reduce((sum, value) => sum + value, 0) / numbers.length })
    if (type === 'min') return displayCell({ value: numbers.reduce((minimum, value) => Math.min(minimum, value), numbers[0]) })
    if (type === 'max') return displayCell({ value: numbers.reduce((maximum, value) => Math.max(maximum, value), numbers[0]) })
    return ''
  }
  const setColumnSummary = (column: number, type: TableSummaryType) => {
    const summaries = artifact.columns.map((_, index) => artifact.columnSummaries?.[index] ?? (viewRows.some((row) => !results[row][index].error && typeof results[row][index].value === 'number') ? 'sum' : 'none'))
    summaries[column] = type
    commit({ ...artifact, columnSummaries: summaries })
  }
  const active = { row: Math.min(selected.row, Math.max(0, artifact.rows.length - 1)), column: Math.min(selected.column, Math.max(0, artifact.columns.length - 1)) }
  const selectedViewIndex = viewRows.indexOf(active.row)
  const anchorIndex = anchor ? viewRows.indexOf(anchor.row) : selectedViewIndex
  const startIndex = Math.max(0, Math.min(selectedViewIndex, anchorIndex))
  const endIndex = Math.max(selectedViewIndex, anchorIndex)
  const startColumn = Math.min(active.column, anchor?.column ?? active.column)
  const endColumn = Math.max(active.column, anchor?.column ?? active.column)
  const selectedRows = selectedViewIndex < 0 ? [] : viewRows.slice(startIndex, endIndex + 1)
  const selectedNumbers = selectedRows.flatMap((row) => results[row].slice(startColumn, endColumn + 1)).filter((cell) => !cell.error && typeof cell.value === 'number').map((cell) => Number(cell.value))
  const activeFormatting = cellFormatting(active)
  const activeResult = results[active.row]?.[active.column]
  const activeAlignment = activeFormatting.alignment ?? (typeof activeResult?.value === 'number' ? 'right' : 'left')
  const formattingDisabled = !selectedRows.length || editing !== null
  const commit = (next: TableArtifact, group = '') => { history.commit(next, group); setMessage('') }
  const applyCellFormatting = (patch: Partial<TableCellFormatting>) => {
    const formatting = { ...artifact.cellFormatting }
    for (const row of selectedRows) for (let column = startColumn; column <= endColumn; column += 1) {
      const key = `${row}:${column}`
      const next = { ...(formatting[key] ?? {}) }
      for (const property of Object.keys(patch) as Array<keyof TableCellFormatting>) {
        const value = patch[property]
        if (value === undefined) delete next[property]
        else Object.assign(next, { [property]: value })
      }
      if (Object.keys(next).length) formatting[key] = next
      else delete formatting[key]
    }
    commit({ ...artifact, cellFormatting: Object.keys(formatting).length ? formatting : undefined })
  }
  const clearSelectedCellFormatting = () => {
    const formatting = { ...artifact.cellFormatting }
    const colors = { ...artifact.cellColors }
    for (const row of selectedRows) for (let column = startColumn; column <= endColumn; column += 1) {
      const key = `${row}:${column}`
      delete formatting[key]
      delete colors[key]
    }
    commit({ ...artifact, cellFormatting: Object.keys(formatting).length ? formatting : undefined, cellColors: Object.keys(colors).length ? colors : undefined })
  }
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
  const applyCellColor = (color?: TableCellColor) => {
    const colors = { ...artifact.cellColors }
    for (const row of selectedRows) for (let column = startColumn; column <= endColumn; column += 1) {
      const key = `${row}:${column}`
      if (color) colors[key] = color
      else delete colors[key]
    }
    commit({ ...artifact, cellColors: Object.keys(colors).length ? colors : undefined })
  }
  const setGroupBy = (column: number) => {
    commit({ ...artifact, groupBy: column < 0 ? undefined : column })
    setCollapsedGroups(new Set())
    setPage(0)
    setAnchor(null)
  }
  const setRowHeight = (rowHeight: TableRowHeight) => commit({ ...artifact, rowHeight })
  const columnWidth = (index: number) => {
    const width = resizingColumnWidths?.[index] ?? artifact.columnWidths?.[index] ?? DEFAULT_COLUMN_WIDTH
    return Number.isFinite(width) ? Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, width)) : DEFAULT_COLUMN_WIDTH
  }
  const beginColumnResize = (event: PointerEvent<HTMLButtonElement>, column: number) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const startWidth = columnWidth(column)
    resizeRef.current = { column, startX: event.clientX, startWidth, pointerId: event.pointerId }
    setResizingColumnWidths(Array.from({ length: artifact.columns.length }, (_, index) => columnWidth(index)))
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const updateColumnResize = (event: PointerEvent<HTMLButtonElement>) => {
    const resize = resizeRef.current
    if (!resize || resize.pointerId !== event.pointerId) return
    const width = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, resize.startWidth + event.clientX - resize.startX))
    setResizingColumnWidths((current) => { const next = [...(current ?? artifact.columns.map((_, index) => columnWidth(index)))]; next[resize.column] = width; return next })
  }
  const finishColumnResize = (event: PointerEvent<HTMLButtonElement>) => {
    const resize = resizeRef.current
    if (!resize || resize.pointerId !== event.pointerId) return
    const width = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, resize.startWidth + event.clientX - resize.startX))
    const widths = Array.from({ length: artifact.columns.length }, (_, index) => columnWidth(index))
    widths[resize.column] = width
    resizeRef.current = null
    setResizingColumnWidths(null)
    commit({ ...artifact, columnWidths: widths })
  }
  const changeStructure = (axis: 'row' | 'column', action: 'insert' | 'delete', index: number) => {
    const count = axis === 'row' ? artifact.rows.length : artifact.columns.length
    if (action === 'insert' && count >= (axis === 'row' ? MAX_ROWS : MAX_COLUMNS)) { setMessage('已达到表格行列上限'); return }
    if (axis === 'column' && action === 'delete' && count <= 1) { setMessage('至少保留一列'); return }
    let rows = artifact.rows.map((row) => artifact.columns.map((_, column) => row[column] ?? ''))
    const columns = [...artifact.columns]
    const types = artifact.columns.map((_, column) => columnType(column))
    const widths = axis === 'column' ? Array.from({ length: artifact.columns.length }, (_, column) => columnWidth(column)) : artifact.columnWidths
    const summaries = artifact.columnSummaries ? artifact.columns.map((_, column) => artifact.columnSummaries?.[column] ?? 'none') : undefined
    if (axis === 'row') {
      if (action === 'insert') rows.splice(index, 0, columns.map(() => ''))
      else rows.splice(index, 1)
    } else {
      if (action === 'insert') { columns.splice(index, 0, `列 ${columns.length + 1}`); types.splice(index, 0, 'text'); widths?.splice(index, 0, DEFAULT_COLUMN_WIDTH); summaries?.splice(index, 0, 'none'); rows.forEach((row) => row.splice(index, 0, '')) }
      else { columns.splice(index, 1); types.splice(index, 1); widths?.splice(index, 1); summaries?.splice(index, 1); rows.forEach((row) => row.splice(index, 1)) }
    }
    rows = rows.map((row) => row.map((value) => adjustFormulaReferences(value, axis, index, action)))
    const groupBy = axis !== 'column' || artifact.groupBy === undefined ? artifact.groupBy : action === 'delete' ? artifact.groupBy === index ? undefined : artifact.groupBy > index ? artifact.groupBy - 1 : artifact.groupBy : artifact.groupBy >= index ? artifact.groupBy + 1 : artifact.groupBy
    commit({ ...artifact, columns, columnTypes: types, columnWidths: widths, columnSummaries: summaries, rows, groupBy, cellColors: adjustCellColors(artifact.cellColors, axis, index, action), cellFormatting: adjustCellMap(artifact.cellFormatting, axis, index, action) })
    setEditing(null); setAnchor(null)
    setSelected({ row: Math.min(active.row, Math.max(0, rows.length - 1)), column: Math.min(active.column, columns.length - 1) })
    if (axis === 'column') { setSort(null); setFilterColumn(-1); setFilterValue('') }
  }
  const onCopy = (event: ClipboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLInputElement || !selectedRows.length) return
    event.preventDefault()
    const matrix = selectedRows.map((row) => artifact.columns.slice(startColumn, endColumn + 1).map((_, offset) => artifact.rows[row][startColumn + offset] ?? ''))
    const copiedRange: TableClipboardRange = {
      sourceRows: selectedRows,
      sourceColumn: startColumn,
      cellFormatting: selectedRows.map((row) => Array.from({ length: endColumn - startColumn + 1 }, (_, offset) => artifact.cellFormatting?.[`${row}:${startColumn + offset}`] ?? null)),
      cellColors: selectedRows.map((row) => Array.from({ length: endColumn - startColumn + 1 }, (_, offset) => artifact.cellColors?.[`${row}:${startColumn + offset}`] ?? null)),
    }
    event.clipboardData.setData('text/plain', serializeDelimited(matrix, '\t'))
    event.clipboardData.setData('application/x-aeback-table', JSON.stringify(copiedRange))
  }
  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLInputElement) return
    event.preventDefault()
    try {
      const metadata = event.clipboardData.getData('application/x-aeback-table')
      const source = metadata ? JSON.parse(metadata) as TableClipboardRange : null
      const matrix = parseDelimited(event.clipboardData.getData('text/plain'), '\t')
      if (!matrix.length) return
      const start = Math.max(0, selectedViewIndex)
      const extraRows = Math.max(0, matrix.length - (viewRows.length - start))
      if (artifact.rows.length + extraRows > MAX_ROWS || active.column + Math.max(...matrix.map((row) => row.length)) > MAX_COLUMNS) throw new Error('粘贴内容超出表格上限')
      const width = Math.max(artifact.columns.length, active.column + Math.max(...matrix.map((row) => row.length)))
      const columns = Array.from({ length: width }, (_, index) => artifact.columns[index] ?? `列 ${index + 1}`)
      const rows = Array.from({ length: artifact.rows.length + extraRows }, (_, row) => columns.map((_, column) => artifact.rows[row]?.[column] ?? ''))
      const cellFormatting = { ...artifact.cellFormatting }
      const cellColors = { ...artifact.cellColors }
      matrix.forEach((values, offset) => {
        const target = viewRows[start + offset] ?? artifact.rows.length + offset - (viewRows.length - start)
        values.forEach((value, column) => {
          const targetColumn = active.column + column
          const sourceRow = source?.sourceRows[offset]
          const sourceColumn = source?.sourceColumn
          rows[target][targetColumn] = sourceRow === undefined || sourceColumn === undefined
            ? value
            : translateFormulaReferences(value, target - sourceRow, targetColumn - sourceColumn)
          if (source?.cellFormatting) {
            const format = source.cellFormatting[offset]?.[column]
            const key = `${target}:${targetColumn}`
            if (format) cellFormatting[key] = format
            else delete cellFormatting[key]
          }
          if (source?.cellColors) {
            const color = source.cellColors[offset]?.[column]
            const key = `${target}:${targetColumn}`
            if (color) cellColors[key] = color
            else delete cellColors[key]
          }
        })
      })
      commit({ ...artifact, columns, rows, columnTypes: columns.map((_, index) => columnType(index)), columnWidths: columns.map((_, index) => columnWidth(index)), columnSummaries: artifact.columnSummaries ? columns.map((_, index) => artifact.columnSummaries?.[index] ?? 'none') : undefined, cellFormatting: Object.keys(cellFormatting).length ? cellFormatting : undefined, cellColors: Object.keys(cellColors).length ? cellColors : undefined })
      setMessage(`已粘贴 ${matrix.length} 行`)
    } catch (error) { setMessage(error instanceof Error ? error.message : '粘贴失败') }
  }
  const move = (deltaRow: number, deltaColumn: number, extend = false) => {
    const index = Math.max(0, Math.min(viewRows.length - 1, selectedViewIndex + deltaRow))
    const column = Math.max(0, Math.min(artifact.columns.length - 1, active.column + deltaColumn))
    focus({ row: viewRows[index] ?? active.row, column }, extend)
  }
  const onGridKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing || event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLButtonElement) return
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
    commit({ ...artifact, columns, rows: importMode === 'append' ? [...artifact.rows, ...rows] : rows, columnTypes: importMode === 'append' ? artifact.columnTypes : columns.map((_, column) => inferColumnType(rows.map((row) => row[column] ?? ''))), columnWidths: importMode === 'append' ? artifact.columnWidths : undefined, columnSummaries: importMode === 'append' ? artifact.columnSummaries : undefined, cellColors: importMode === 'append' ? artifact.cellColors : undefined, cellFormatting: importMode === 'append' ? artifact.cellFormatting : undefined, groupBy: importMode === 'append' ? artifact.groupBy : undefined })
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
  const exportTableImage = async (format: 'png' | 'jpg') => {
    const table = gridRef.current?.querySelector<HTMLTableElement>('.smart-table')
    if (!table || imageExporting) return
    setImageExporting(true)
    setMessage('正在生成表格图片…')
    try {
      const backgroundColor = getComputedStyle(document.querySelector('.table-editor-shell') ?? table).backgroundColor
      const pixelRatio = Math.min(1, Math.sqrt(14_000_000 / Math.max(1, table.scrollWidth * table.scrollHeight)))
      const blob = await toBlob(table, {
        type: format === 'jpg' ? 'image/jpeg' : 'image/png',
        quality: 0.92,
        pixelRatio,
        backgroundColor,
        imagePlaceholder,
        onImageErrorHandler: () => {},
        filter: (node) => !(node instanceof HTMLElement && node.matches('.table-resize-handle, button[aria-label="添加列"], button[aria-label^="排序第"], details:not(.table-summary-menu), .table-summary-menu > div')),
      })
      if (!blob) throw new Error('图片生成失败')
      downloadBlob(artifact.title, format, blob)
      setMessage(`已导出当前页 ${format.toUpperCase()} 图片（${pagedRows.length} 行${pixelRatio < 1 ? ' · 已自动缩放' : ''}）`)
    } catch (error) {
      setMessage(error instanceof Error ? `图片导出失败：${error.message}` : '图片导出失败')
    } finally {
      setImageExporting(false)
    }
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
      <div className="table-formatbar" role="toolbar" aria-label="单元格格式">
        <div className="table-format-group" role="group" aria-label="文本对齐">
          {alignments.map((alignment) => <button className="tool-button" key={alignment.value} type="button" aria-label={alignment.label} title={alignment.label} aria-pressed={activeAlignment === alignment.value} disabled={formattingDisabled} onClick={() => applyCellFormatting({ alignment: alignment.value })}><Icon name={alignment.icon} size={16} /></button>)}
        </div>
        <span className="table-format-divider" />
        <button className={`tool-button table-wrap-button${activeFormatting.wrap ? ' tool-button--active' : ''}`} type="button" aria-label="自动换行" title="自动换行" aria-pressed={Boolean(activeFormatting.wrap)} disabled={formattingDisabled} onClick={() => applyCellFormatting({ wrap: activeFormatting.wrap ? undefined : true })}><Icon name="wrap" size={16} /><span>换行</span></button>
        <label className="table-format-size"><span>字号</span><select aria-label="字号" title="设置所选单元格字号" value={activeFormatting.fontSize ?? 0} disabled={formattingDisabled} onChange={(event) => applyCellFormatting({ fontSize: Number(event.target.value) || undefined })}><option value={0}>默认</option>{fontSizes.map((size) => <option key={size} value={size}>{size}px</option>)}</select></label>
        <details className="editor-menu table-text-color-menu"><summary aria-label="文字颜色" title="文字颜色"><span className="table-font-color-preview" style={{ color: activeFormatting.textColor ?? 'currentColor', borderColor: activeFormatting.textColor ?? 'currentColor' }}>A</span><span>颜色</span></summary><div><span className="table-menu-label">文字颜色</span><div className="table-text-color-options">{textColors.map((color) => <button key={color.value} type="button" className="table-text-color-swatch" style={{ backgroundColor: color.value }} aria-label={`${color.label}文字`} aria-pressed={activeFormatting.textColor === color.value} title={color.label} disabled={formattingDisabled} onClick={(event) => { applyCellFormatting({ textColor: color.value }); event.currentTarget.closest('details')?.removeAttribute('open') }} />)}</div><label className="table-custom-color"><span>自定义</span><input type="color" aria-label="自定义文字颜色" value={activeFormatting.textColor ?? '#ff9c4a'} disabled={formattingDisabled} onChange={(event) => applyCellFormatting({ textColor: event.target.value })} /></label><button type="button" disabled={formattingDisabled} onClick={(event) => { applyCellFormatting({ textColor: undefined }); event.currentTarget.closest('details')?.removeAttribute('open') }}>恢复默认颜色</button><button type="button" disabled={formattingDisabled} onClick={(event) => { clearSelectedCellFormatting(); event.currentTarget.closest('details')?.removeAttribute('open') }}>清除单元格格式</button></div></details>
      </div>
      <div className="editor-command-group table-command-actions">
        <details className="editor-menu table-group-menu"><summary className={artifact.groupBy !== undefined ? 'tool-button--active' : ''}>分组</summary><div><button type="button" onClick={() => setGroupBy(-1)}>取消分组</button>{artifact.columns.map((column, index) => <button key={index} type="button" onClick={() => setGroupBy(index)}>按 {columnName(index)} · {column} 分组</button>)}</div></details>
        <details className="editor-menu table-settings-menu"><summary>表格设置</summary><div><span className="table-menu-label">行高</span>{rowHeights.map((height) => <button key={height.value} type="button" aria-pressed={(artifact.rowHeight ?? 'normal') === height.value} onClick={() => setRowHeight(height.value)}>{height.label}</button>)}</div></details>
        <details className="editor-menu table-fill-menu"><summary title="为选区填色">填色</summary><div><span className="table-menu-label">选区颜色</span><div className="table-color-options">{cellColors.map((color) => <button key={color.value} type="button" className="table-color-swatch" data-fill={color.value} aria-label={`${color.label}填色`} title={color.label} onClick={() => applyCellColor(color.value)} />)}</div><button type="button" onClick={() => applyCellColor()}>清除填色</button></div></details>
        <button className="tool-button" type="button" onClick={() => fileRef.current?.click()}>导入 CSV</button>
        <details className="editor-menu"><summary>导出</summary><div><button type="button" onClick={() => exportCsv(false)}>CSV · 当前视图值</button><button type="button" onClick={() => exportCsv(true)}>CSV · 全表原始值与公式</button><span className="table-menu-label">图片 · 当前页</span><button type="button" disabled={imageExporting} onClick={() => void exportTableImage('png')}>PNG</button><button type="button" disabled={imageExporting} onClick={() => void exportTableImage('jpg')}>JPG</button></div></details>
        <button className="tool-button" type="button" disabled={artifact.columns.length >= MAX_COLUMNS} onClick={() => changeStructure('column', 'insert', artifact.columns.length)}><Icon name="column" size={15} />列</button>
        <button className="tool-button tool-button--accent" type="button" disabled={artifact.rows.length >= MAX_ROWS} onClick={() => changeStructure('row', 'insert', artifact.rows.length)}><Icon name="plus" size={15} />行</button>
      </div>
    </div>
    <div className="table-viewbar"><select aria-label="筛选列" value={filterColumn} onChange={(event) => { setFilterColumn(Number(event.target.value)); setPage(0); setAnchor(null) }}><option value={-1}>筛选列</option>{artifact.columns.map((column, index) => <option value={index} key={index}>{columnName(index)} · {column}</option>)}</select>{filterColumn >= 0 && <input aria-label="筛选内容" placeholder="包含内容" value={filterValue} onChange={(event) => { setFilterValue(event.target.value); setPage(0); setAnchor(null) }} />}{(query || filterColumn >= 0 || sort) && <button className="tool-button" type="button" onClick={() => { setQuery(''); setFilterColumn(-1); setFilterValue(''); setSort(null); setAnchor(null) }}>重置视图</button>}<span>{viewRows.length} / {artifact.rows.length} 行 · {artifact.columns.length} 列</span></div>
    <div className="table-formulabar"><span>{columnName(active.column)}{active.row + 1}</span><span>ƒx</span><input aria-label="单元格值或公式" placeholder="输入值或 =SUM(B1:B3)" value={editing?.draft ?? artifact.rows[active.row]?.[active.column] ?? ''} disabled={!artifact.rows.length} onChange={(event) => setEditing({ ...active, draft: event.target.value, source: 'bar' })} onBlur={finishEdit} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); finishEdit(); focus(active) } if (event.key === 'Escape') { setEditing(null); focus(active) } }} /><details className="editor-menu formula-help"><summary aria-label="公式帮助">?</summary><div><p>支持 A1、$A$1 和 A1:B5 引用</p><p>+ − * / ^ 与括号</p><p>SUM · AVERAGE · MIN · MAX · COUNT · ROUND · ABS</p><p>排序仅改变视图；公式坐标使用左侧原始行号。</p><p>Shift + 方向键选区；复制 / 粘贴可与 Excel 互通。</p></div></details></div>
    <div ref={gridRef} className="table-scroll" onKeyDown={onGridKey} onCopy={onCopy} onPaste={onPaste}>
      <table className={`smart-table table-density--${artifact.rowHeight ?? 'normal'}${resizingColumnWidths ? ' table-column-resizing' : ''}`} role="grid" aria-label="Aeback 智能表格" aria-rowcount={viewRows.length + 1} aria-colcount={artifact.columns.length + 1} style={{ minWidth: 79 + artifact.columns.reduce((total, _, index) => total + columnWidth(index), 0) }}>
        <thead><tr><th className="table-row-number" aria-label="原始行号">#</th>{artifact.columns.map((column, columnIndex) => <th key={columnIndex} style={{ width: columnWidth(columnIndex) }} aria-sort={sort?.column === columnIndex ? sort.direction === 1 ? 'ascending' : 'descending' : 'none'}><div className="table-column-heading"><span>{columnName(columnIndex)}</span><input aria-label={`第 ${columnIndex + 1} 列标题`} value={column} onChange={(event) => commit({ ...artifact, columns: artifact.columns.map((item, index) => index === columnIndex ? event.target.value : item) }, `heading-${columnIndex}`)} /><button type="button" aria-label={`排序第 ${columnIndex + 1} 列`} title="升序 / 降序 / 原始顺序" onClick={() => { setSort(sort?.column === columnIndex ? sort.direction === 1 ? { column: columnIndex, direction: -1 } : null : { column: columnIndex, direction: 1 }); setAnchor(null); setPage(0) }}>{sort?.column === columnIndex ? sort.direction === 1 ? '↑' : '↓' : '↕'}</button></div><div className="table-column-settings"><select aria-label={`第 ${columnIndex + 1} 列类型`} value={columnType(columnIndex)} onChange={(event) => commit({ ...artifact, columnTypes: artifact.columns.map((_, index) => index === columnIndex ? event.target.value as TableColumnType : columnType(index)) })}>{columnTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select><details className="editor-menu"><summary aria-label={`第 ${columnIndex + 1} 列操作`}>···</summary><div><button type="button" onClick={() => changeStructure('column', 'insert', columnIndex)}>左侧插入列</button><button type="button" onClick={() => changeStructure('column', 'insert', columnIndex + 1)}>右侧插入列</button><button type="button" disabled={artifact.columns.length <= 1} onClick={() => changeStructure('column', 'delete', columnIndex)}>删除列</button></div></details></div><button className="table-resize-handle" type="button" aria-label={`调整第 ${columnIndex + 1} 列宽度`} title="拖动调整列宽" onPointerDown={(event) => beginColumnResize(event, columnIndex)} onPointerMove={updateColumnResize} onPointerUp={finishColumnResize} onPointerCancel={finishColumnResize} onKeyDown={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); event.stopPropagation(); const widths = Array.from({ length: artifact.columns.length }, (_, index) => columnWidth(index)); widths[columnIndex] = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, widths[columnIndex] + (event.key === 'ArrowRight' ? 16 : -16))); commit({ ...artifact, columnWidths: widths }) } }} /></th>)}<th className="table-actions-head"><button type="button" aria-label="添加列" title="添加属性列" disabled={artifact.columns.length >= MAX_COLUMNS} onClick={() => changeStructure('column', 'insert', artifact.columns.length)}><Icon name="plus" size={14} /></button></th></tr></thead>
        <tbody>{visibleTableRows.map((entry) => {
          if (entry.kind === 'group') {
            const collapsed = collapsedGroups.has(entry.key)
            return <tr key={entry.key} className="table-group-row"><th colSpan={artifact.columns.length + 2}><button type="button" aria-expanded={!collapsed} onClick={() => setCollapsedGroups((current) => { const next = new Set(current); if (next.has(entry.key)) next.delete(entry.key); else next.add(entry.key); return next })}><span aria-hidden="true">{collapsed ? '▸' : '▾'}</span>{entry.label}<small>{entry.count}</small></button></th></tr>
          }
          const rowIndex = entry.row
          return <tr key={rowIndex} aria-rowindex={viewRows.indexOf(rowIndex) + 2}><th className="table-row-number" scope="row"><button type="button" aria-label={`选择第 ${rowIndex + 1} 行`} onClick={() => { setAnchor({ row: rowIndex, column: 0 }); setSelected({ row: rowIndex, column: artifact.columns.length - 1 }) }}>{rowIndex + 1}</button></th>{artifact.columns.map((_, columnIndex) => {
          const address = { row: rowIndex, column: columnIndex }
          const isActive = active.row === rowIndex && active.column === columnIndex
          const inRange = selectedRows.includes(rowIndex) && columnIndex >= startColumn && columnIndex <= endColumn
          const isEditing = editing?.row === rowIndex && editing.column === columnIndex && editing.source !== 'bar'
          const raw = artifact.rows[rowIndex][columnIndex] ?? ''
          const result = results[rowIndex][columnIndex]
          const error = result.error ?? validateCell(raw, columnType(columnIndex))
          const formatting = cellFormatting(address)
          const isNumeric = typeof result.value === 'number'
          const cellStyle = { width: columnWidth(columnIndex), textAlign: formatting.alignment ?? (isNumeric ? 'right' : 'left'), color: formatting.textColor, fontSize: formatting.fontSize ? `${formatting.fontSize}px` : undefined, height: formatting.wrap ? 'auto' : undefined }
          return <td key={columnIndex} style={cellStyle} role="gridcell" data-cell={`${rowIndex}:${columnIndex}`} data-fill={artifact.cellColors?.[`${rowIndex}:${columnIndex}`]} data-wrap={formatting.wrap ? 'true' : undefined} aria-selected={inRange} aria-invalid={Boolean(error)} tabIndex={isActive ? 0 : -1} className={`${inRange ? 'table-cell--selected ' : ''}${isActive ? 'table-cell--active ' : ''}${error ? 'table-cell--error ' : ''}${isNumeric ? 'table-cell--numeric' : ''}`} title={error || (raw.startsWith('=') ? raw : undefined)} onClick={(event) => { if (!isEditing) focus(address, event.shiftKey, true) }} onDoubleClick={() => edit(address)}>
            {isEditing ? <input className="table-cell-editor" style={{ fontSize: cellStyle.fontSize, color: cellStyle.color, textAlign: cellStyle.textAlign }} list={columnType(columnIndex) === 'select' ? `aeback-${artifact.id}-select-${columnIndex}` : undefined} type={columnType(columnIndex) === 'date' && !raw.startsWith('=') ? 'date' : columnType(columnIndex) === 'image' ? 'url' : 'text'} aria-label={`编辑 ${columnName(columnIndex)}${rowIndex + 1}`} value={editing.draft} autoFocus onChange={(event) => setEditing({ ...editing, draft: event.target.value })} onClick={(event) => event.stopPropagation()} onBlur={finishEdit} onKeyDown={(event) => { if (event.nativeEvent.isComposing) return; if (event.key === 'Enter' || event.key === 'Tab') { event.preventDefault(); finishEdit(); if (event.key === 'Enter') move(event.shiftKey ? -1 : 1, 0); else move(0, event.shiftKey ? -1 : 1) } if (event.key === 'Escape') { event.preventDefault(); editingRef.current = null; setEditing(null); focus(address) } }} /> : columnType(columnIndex) === 'checkbox' && !raw.startsWith('=') && !error ? <input type="checkbox" aria-label={`切换 ${columnName(columnIndex)}${rowIndex + 1}`} checked={raw.toUpperCase() === 'TRUE'} onClick={(event) => event.stopPropagation()} onChange={(event) => { setSelected(address); setCell(address, event.target.checked ? 'TRUE' : 'FALSE') }} /> : columnType(columnIndex) === 'select' && !raw.startsWith('=') ? <span className="table-select-value" style={{ fontSize: cellStyle.fontSize, color: cellStyle.color }} data-tone={Math.max(0, selectOptions(columnIndex).indexOf(raw)) % 6}>{displayCell(result)}</span> : columnType(columnIndex) === 'image' && !raw.startsWith('=') && !error ? <TableImageCell source={raw} /> : <span>{displayCell(result)}</span>}
          </td>
        })}<td className="table-row-action"><details className="editor-menu"><summary aria-label={`第 ${rowIndex + 1} 行操作`}>···</summary><div><button type="button" onClick={() => changeStructure('row', 'insert', rowIndex)}>上方插入行</button><button type="button" onClick={() => changeStructure('row', 'insert', rowIndex + 1)}>下方插入行</button><button type="button" onClick={() => changeStructure('row', 'delete', rowIndex)}>删除行</button></div></details></td></tr>
        })}</tbody>
        <tfoot><tr><th className="table-row-number" title="列汇总函数">Σ</th>{artifact.columns.map((_, column) => {
          const summary = summaryType(column)
          const label = summaryOptions.find((option) => option.value === summary)?.label ?? '汇总'
          const value = summaryValue(column, summary)
          return <td key={column} title={`${columnName(column)} · ${label}`}><details className="editor-menu table-summary-menu"><summary aria-label={`第 ${column + 1} 列汇总：${label}`} title={`设置${columnName(column)}列汇总函数`}>
            {summary === 'none' ? <span className="table-summary-empty">＋ 汇总</span> : <><span className="table-summary-label">{label}</span><strong>{value}</strong></>}
          </summary><div>{summaryOptions.map((option) => <button key={option.value} type="button" aria-pressed={summary === option.value} onClick={(event) => { setColumnSummary(column, option.value); event.currentTarget.closest('details')?.removeAttribute('open') }}>{option.label}</button>)}</div></details></td>
        })}<td /></tr></tfoot>
      </table>
      {artifact.columns.map((_, column) => columnType(column) === 'select' ? <datalist key={column} id={`aeback-${artifact.id}-select-${column}`}>{selectOptions(column).map((option) => <option value={option} key={option} />)}</datalist> : null)}
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
