// Aeback table engine — quoted CSV, typed cells, safe arithmetic, and reference maintenance.
import type { TableArtifact, TableColumnType } from '../types'

export const MAX_ROWS = 2000
export const MAX_COLUMNS = 52
export type CellResult = { value: string | number | boolean; error?: string }
export const columnTypes: Array<{ value: TableColumnType; label: string }> = [
  { value: 'text', label: '文本' }, { value: 'number', label: '数值' }, { value: 'date', label: '日期' }, { value: 'checkbox', label: '复选框' },
]

export function inferColumnType(values: string[]): TableColumnType {
  const populated = values.map((value) => value.trim()).filter(Boolean)
  if (!populated.length) return 'text'
  const literals = populated.filter((value) => !value.startsWith('='))
  if (literals.length && literals.every((value) => /^(true|false)$/i.test(value))) return 'checkbox'
  if (literals.length && literals.every((value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !validateCell(value, 'date'))) return 'date'
  if (literals.length && literals.every((value) => !/^[+-]?0\d/.test(value) && Number.isFinite(Number(value)))) return 'number'
  if (!literals.length && populated.every((value) => value.startsWith('='))) return 'number'
  return 'text'
}

export function columnName(index: number): string {
  let result = ''
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) result = String.fromCharCode(65 + (value - 1) % 26) + result
  return result
}

export function parseCellReference(reference: string) {
  const match = reference.match(/^\$?([A-Z]+)\$?([1-9]\d*)$/i)
  if (!match) throw new Error('#REF!')
  const column = [...match[1].toUpperCase()].reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0) - 1
  return { row: Number(match[2]) - 1, column }
}

export function parseDelimited(text: string, delimiter: ',' | '\t' = ','): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let closed = false
  const source = text.replace(/^\uFEFF/, '')
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { field += '"'; index += 1 }
      else if (char === '"') { quoted = false; closed = true }
      else field += char
      continue
    }
    if (char === '"' && !field && !closed) { quoted = true; continue }
    if (char === delimiter) { row.push(field); field = ''; closed = false; continue }
    if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1
      row.push(field); rows.push(row); row = []; field = ''; closed = false
      if (rows.length > MAX_ROWS + 1) throw new Error(`最多支持 ${MAX_ROWS} 行数据`)
      continue
    }
    if (closed && !/\s/.test(char)) throw new Error('CSV 引号后的内容格式不正确')
    if (!closed) field += char
  }
  if (quoted) throw new Error('CSV 引号未闭合')
  if (field || row.length || closed) { row.push(field); rows.push(row) }
  if (rows.some((cells) => cells.length > MAX_COLUMNS)) throw new Error(`最多支持 ${MAX_COLUMNS} 列`)
  return rows
}

export function serializeDelimited(rows: string[][], delimiter = ',') {
  return rows.map((row) => row.map((cell) => cell.includes(delimiter) || /["\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell).join(delimiter)).join('\r\n')
}

export function validateCell(value: string, type: TableColumnType) {
  if (!value.trim() || value.startsWith('=')) return ''
  if (type === 'number' && !Number.isFinite(Number(value))) return '请输入有效数值'
  if (type === 'date') {
    const date = new Date(`${value}T00:00:00Z`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return '日期格式应为 YYYY-MM-DD'
  }
  if (type === 'checkbox' && !/^(true|false)$/i.test(value)) return '复选框只能填写 TRUE 或 FALSE'
  return ''
}

export function evaluateTable(table: Pick<TableArtifact, 'rows' | 'columns'>): CellResult[][] {
  const cache = new Map<string, CellResult>()
  const visiting = new Set<string>()
  const numeric = (value: CellResult): number => {
    if (value.error) throw new Error(value.error)
    const result = Number(value.value)
    if (!Number.isFinite(result)) throw new Error('#VALUE!')
    return result
  }
  const evaluate = (row: number, column: number): CellResult => {
    if (row < 0 || column < 0 || row >= table.rows.length || column >= table.columns.length) return { value: '', error: '#REF!' }
    const key = `${row}:${column}`
    const cached = cache.get(key)
    if (cached) return cached
    if (visiting.has(key)) return { value: '', error: '#CYCLE!' }
    if (visiting.size >= 256) return { value: '', error: '#LIMIT!' }
    const raw = table.rows[row][column] ?? ''
    if (!raw.startsWith('=')) {
      const hasLeadingZero = /^[+-]?0\d/.test(raw.trim())
      const safePrecision = raw.replace(/\D/g, '').length <= 15
      const value = raw.trim() && !hasLeadingZero && safePrecision && Number.isFinite(Number(raw)) ? Number(raw) : /^(true|false)$/i.test(raw) ? raw.toUpperCase() === 'TRUE' : raw
      const result = { value }
      cache.set(key, result)
      return result
    }
    visiting.add(key)
    let result: CellResult
    try {
      const expression = raw.slice(1).toUpperCase()
      const tokens: string[] = []
      let offset = 0
      while (offset < expression.length) {
        const match = expression.slice(offset).match(/^\s*(#REF!|\$?[A-Z]+\$?[1-9]\d*|[A-Z]+|(?:\d+(?:\.\d*)?|\.\d+)(?:E[+-]?\d+)?|[+\-*/^(),:])/)
        if (!match) { if (!expression.slice(offset).trim()) break; throw new Error('#ERROR!') }
        tokens.push(match[1]); offset += match[0].length
        if (tokens.length > 1024) throw new Error('#LIMIT!')
      }
      let cursor = 0
      type Value = CellResult | CellResult[]
      const single = (value: Value): CellResult => { if (Array.isArray(value)) throw new Error('#VALUE!'); return value }
      const primary = (): Value => {
        const token = tokens[cursor++]
        if (!token) throw new Error('#ERROR!')
        if (token === '#REF!') throw new Error('#REF!')
        if (token === '(') { const value = expressionValue(); if (tokens[cursor++] !== ')') throw new Error('#ERROR!'); return value }
        if (/^\$?[A-Z]+\$?[1-9]\d*$/.test(token)) {
          const from = parseCellReference(token)
          if (tokens[cursor] !== ':') return evaluate(from.row, from.column)
          cursor += 1
          const to = parseCellReference(tokens[cursor++] ?? '')
          if (Math.max(from.row, to.row) >= table.rows.length || Math.max(from.column, to.column) >= table.columns.length) throw new Error('#REF!')
          const values: CellResult[] = []
          for (let r = Math.min(from.row, to.row); r <= Math.max(from.row, to.row); r += 1) {
            for (let c = Math.min(from.column, to.column); c <= Math.max(from.column, to.column); c += 1) values.push(evaluate(r, c))
          }
          return values
        }
        if (/^[A-Z]+$/.test(token)) {
          if (!['SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'ROUND', 'ABS'].includes(token)) throw new Error('#NAME?')
          if (tokens[cursor++] !== '(') throw new Error('#ERROR!')
          const values: Value[] = []
          if (tokens[cursor] !== ')') {
            values.push(expressionValue())
            while (tokens[cursor] === ',') { cursor += 1; values.push(expressionValue()) }
          }
          if (tokens[cursor++] !== ')') throw new Error('#ERROR!')
          const flat = values.flat()
          const error = flat.find((value) => value.error)?.error
          if (error) throw new Error(error)
          const numbers = flat.filter((item) => typeof item.value === 'number').map((item) => Number(item.value))
          if (token === 'ROUND' || token === 'ABS') {
            if (values.length < 1 || values.length > (token === 'ABS' ? 1 : 2)) throw new Error('#ERROR!')
            const value = numeric(single(values[0]))
            const digits = values[1] ? numeric(single(values[1])) : 0
            if (!Number.isInteger(digits) || Math.abs(digits) > 15) throw new Error('#VALUE!')
            return { value: token === 'ABS' ? Math.abs(value) : Math.round((value + Number.EPSILON) * 10 ** digits) / 10 ** digits }
          }
          if (token === 'COUNT') return { value: numbers.length }
          if (token === 'SUM') return { value: numbers.reduce((total, value) => total + value, 0) }
          if (!numbers.length) throw new Error('#DIV/0!')
          return { value: token === 'MIN' ? Math.min(...numbers) : token === 'MAX' ? Math.max(...numbers) : numbers.reduce((total, value) => total + value, 0) / numbers.length }
        }
        const number = Number(token)
        if (!Number.isFinite(number)) throw new Error('#ERROR!')
        return { value: number }
      }
      const power = (): Value => {
        const left = primary()
        if (tokens[cursor] !== '^') return left
        cursor += 1
        return { value: numeric(single(left)) ** numeric(single(unary())) }
      }
      const unary = (): Value => {
        if (tokens[cursor] === '+' || tokens[cursor] === '-') { const sign = tokens[cursor++]; return { value: (sign === '-' ? -1 : 1) * numeric(single(unary())) } }
        return power()
      }
      const product = (): Value => {
        let value = unary()
        while (tokens[cursor] === '*' || tokens[cursor] === '/') {
          const operator = tokens[cursor++]
          const right = numeric(single(unary()))
          if (operator === '/' && right === 0) throw new Error('#DIV/0!')
          value = { value: operator === '*' ? numeric(single(value)) * right : numeric(single(value)) / right }
        }
        return value
      }
      const expressionValue = (): Value => {
        let value = product()
        while (tokens[cursor] === '+' || tokens[cursor] === '-') {
          const operator = tokens[cursor++]
          const right = numeric(single(product()))
          value = { value: operator === '+' ? numeric(single(value)) + right : numeric(single(value)) - right }
        }
        return value
      }
      result = single(expressionValue())
      if (cursor !== tokens.length) throw new Error('#ERROR!')
      if (typeof result.value === 'number' && !Number.isFinite(result.value)) throw new Error('#NUM!')
    } catch (error) { result = { value: '', error: error instanceof Error ? error.message : '#ERROR!' } }
    visiting.delete(key)
    cache.set(key, result)
    return result
  }
  return table.rows.map((_, row) => table.columns.map((_, column) => evaluate(row, column)))
}

export function displayCell(result: CellResult) {
  if (result.error) return result.error
  if (typeof result.value === 'number') return String(Number(result.value.toPrecision(15)))
  if (typeof result.value === 'boolean') return result.value ? 'TRUE' : 'FALSE'
  return result.value
}

export function translateFormulaReferences(value: string, rowDelta: number, columnDelta: number) {
  if (!value.startsWith('=')) return value
  const translate = (reference: string) => {
    const match = reference.match(/^(\$?)([A-Z]+)(\$?)([1-9]\d*)$/i)
    if (!match) return '#REF!'
    const current = parseCellReference(reference)
    const row = current.row + (match[3] ? 0 : rowDelta)
    const column = current.column + (match[1] ? 0 : columnDelta)
    if (row < 0 || column < 0 || column >= MAX_COLUMNS) return '#REF!'
    return `${match[1]}${columnName(column)}${match[3]}${row + 1}`
  }
  return value.replace(/(?<![A-Z0-9_.])\$?[A-Z]+\$?[1-9]\d*(?:\s*:\s*\$?[A-Z]+\$?[1-9]\d*)?/gi, (reference) => reference.split(/\s*:\s*/).map(translate).join(':'))
}

export function adjustFormulaReferences(value: string, axis: 'row' | 'column', index: number, action: 'insert' | 'delete') {
  if (!value.startsWith('=')) return value
  const render = (reference: string, row: number, column: number) => {
    const match = reference.match(/^(\$?)[A-Z]+(\$?)\d+$/i)!
    return `${match[1]}${columnName(column)}${match[2]}${row + 1}`
  }
  return value.replace(/(?<![A-Z0-9_.])\$?[A-Z]+\$?[1-9]\d*(?:\s*:\s*\$?[A-Z]+\$?[1-9]\d*)?/gi, (reference) => {
    const [first, last] = reference.split(/\s*:\s*/)
    const start = parseCellReference(first)
    if (last) {
      const end = parseCellReference(last)
      const low = Math.min(start[axis], end[axis])
      const high = Math.max(start[axis], end[axis])
      let nextLow = low
      let nextHigh = high
      if (action === 'insert') { if (index <= low) nextLow += 1; if (index <= high) nextHigh += 1 }
      else { if (index < low) nextLow -= 1; if (index <= high) nextHigh -= 1 }
      if (nextHigh < nextLow) return '#REF!'
      start[axis] = start[axis] <= end[axis] ? nextLow : nextHigh
      end[axis] = parseCellReference(first)[axis] <= parseCellReference(last)[axis] ? nextHigh : nextLow
      return `${render(first, start.row, start.column)}:${render(last, end.row, end.column)}`
    }
    if (action === 'delete' && start[axis] === index) return '#REF!'
    if (start[axis] >= index) start[axis] += action === 'insert' ? 1 : -1
    return render(first, start.row, start.column)
  })
}
