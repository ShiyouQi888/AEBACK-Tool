// Aeback browser persistence — IndexedDB workspace storage with automatic localStorage migration.
import type { WorkspaceArtifact } from '../types'
import { refreshStarterExample } from '../data'

const LEGACY_STORAGE_KEY = 'aeback.workspace.v2'
const DATABASE_NAME = 'aeback.workspace'
const DATABASE_VERSION = 1
const OBJECT_STORE = 'workspaces'
const WORKSPACE_ID = 'current'

type WorkspaceRecord = { id: string; artifacts: WorkspaceArtifact[]; savedAt: string }

let databasePromise: Promise<IDBDatabase> | null = null
let useLegacyStorage = false
let writeQueue: Promise<void> = Promise.resolve()

function isWorkspaceArtifact(value: unknown): value is WorkspaceArtifact {
  if (!value || typeof value !== 'object') return false
  const artifact = value as Record<string, unknown>
  if (typeof artifact.id !== 'string' || typeof artifact.title !== 'string' || typeof artifact.updatedAt !== 'string') return false
  if (artifact.type === 'mindmap') return Array.isArray(artifact.nodes)
  if (artifact.type === 'graph') return Array.isArray(artifact.nodes) && Array.isArray(artifact.edges)
  if (artifact.type === 'document') return typeof artifact.content === 'string'
  if (artifact.type === 'table') return Array.isArray(artifact.columns) && Array.isArray(artifact.rows)
  return false
}

function parseWorkspace(value: unknown): WorkspaceArtifact[] | null {
  return Array.isArray(value) && value.every(isWorkspaceArtifact) ? value : null
}

function readLegacyWorkspace(): WorkspaceArtifact[] | null {
  try {
    const value = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    return value ? parseWorkspace(JSON.parse(value)) : null
  } catch {
    return null
  }
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('IndexedDB is unavailable')); return }
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(OBJECT_STORE)) request.result.createObjectStore(OBJECT_STORE, { keyPath: 'id' })
    }
    request.onsuccess = () => {
      const database = request.result
      database.onversionchange = () => {
        database.close()
        databasePromise = null
      }
      resolve(database)
    }
    request.onerror = () => reject(request.error ?? new Error('Could not open browser storage'))
  }).catch((error: unknown) => {
    databasePromise = null
    throw error
  })
  return databasePromise!
}

function readWorkspaceRecord(database: IDBDatabase): Promise<WorkspaceRecord | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(OBJECT_STORE, 'readonly')
    const request = transaction.objectStore(OBJECT_STORE).get(WORKSPACE_ID)
    let record: WorkspaceRecord | undefined
    request.onsuccess = () => { record = request.result as WorkspaceRecord | undefined }
    request.onerror = () => reject(request.error ?? new Error('Could not read browser storage'))
    transaction.oncomplete = () => resolve(record)
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not read browser storage'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Browser storage read was cancelled'))
  })
}

function writeWorkspaceRecord(database: IDBDatabase, artifacts: WorkspaceArtifact[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(OBJECT_STORE, 'readwrite')
    transaction.objectStore(OBJECT_STORE).put({ id: WORKSPACE_ID, artifacts, savedAt: new Date().toISOString() } satisfies WorkspaceRecord)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save browser storage'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Browser storage write was cancelled'))
  })
}

export async function loadWorkspace(fallback: WorkspaceArtifact[]): Promise<WorkspaceArtifact[]> {
  try {
    const database = await openDatabase()
    const record = await readWorkspaceRecord(database)
    const stored = parseWorkspace(record?.artifacts)
    if (stored) return refreshStarterExample(stored)

    const legacy = readLegacyWorkspace()
    if (!legacy) return refreshStarterExample(fallback)
    try {
      await writeWorkspaceRecord(database, legacy)
    } catch {
      useLegacyStorage = true
    }
    if (!useLegacyStorage) {
      try { window.localStorage.removeItem(LEGACY_STORAGE_KEY) } catch { /* Keep the migrated copy in browser storage if cleanup is blocked. */ }
    }
    return refreshStarterExample(legacy)
  } catch {
    useLegacyStorage = true
    return refreshStarterExample(readLegacyWorkspace() ?? fallback)
  }
}

async function persistWorkspace(artifacts: WorkspaceArtifact[]): Promise<string | null> {
  if (useLegacyStorage) {
    try {
      window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(artifacts))
      return null
    } catch {
      return '本地保存失败，请导出备份'
    }
  }

  try {
    const database = await openDatabase()
    await writeWorkspaceRecord(database, artifacts)
    return null
  } catch {
    return '本地保存失败，请导出备份'
  }
}

export function saveWorkspace(artifacts: WorkspaceArtifact[]): Promise<string | null> {
  const nextWrite = writeQueue.then(() => persistWorkspace(artifacts), () => persistWorkspace(artifacts))
  writeQueue = nextWrite.then(() => undefined, () => undefined)
  return nextWrite
}
