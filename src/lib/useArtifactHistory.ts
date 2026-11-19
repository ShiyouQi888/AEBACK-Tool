// Aeback editor history — grouped edits, atomic imports, and reversible structure changes.
import { useRef, useState } from 'react'

export function useArtifactHistory<T extends { title: string }>(value: T, onChange: (value: T) => void) {
  const current = useRef(value)
  current.current = value
  const history = useRef({ past: [] as T[], future: [] as T[], group: '', time: 0 })
  const [, render] = useState(0)
  const commit = (next: T, group = '') => {
    if (next === current.current) return
    const state = history.current
    const now = Date.now()
    if (!group || state.group !== group || now - state.time > 800) state.past = [...state.past.slice(-79), current.current]
    state.future = []
    state.group = group
    state.time = now
    current.current = next
    onChange(next)
    render((count) => count + 1)
  }
  const travel = (direction: 'undo' | 'redo') => {
    const state = history.current
    const source = direction === 'undo' ? state.past : state.future
    const target = direction === 'undo' ? state.future : state.past
    const next = source.pop()
    if (!next) return
    target.push(current.current)
    state.group = ''
    const restored = { ...next, title: current.current.title }
    current.current = restored
    onChange(restored)
    render((count) => count + 1)
  }
  return { commit, undo: () => travel('undo'), redo: () => travel('redo'), canUndo: history.current.past.length > 0, canRedo: history.current.future.length > 0 }
}
