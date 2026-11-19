// Aeback workspace persistence — one versioned local record for all tools.
import type { WorkspaceArtifact } from '../types'

const STORAGE_KEY = 'aeback.workspace.v2'

export function loadWorkspace(fallback: WorkspaceArtifact[]): WorkspaceArtifact[] {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    if (!value) return fallback
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed as WorkspaceArtifact[] : fallback
  } catch {
    return fallback
  }
}

export function saveWorkspace(artifacts: WorkspaceArtifact[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(artifacts))
    return null
  } catch {
    return '本地保存失败，请导出备份'
  }
}
