const DB_NAME = 'midi-seq'
const DB_VERSION = 1
const STORE_NAME = 'projects'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

export async function saveProject(id: string, project: unknown) {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put({ id, data: project, updatedAt: Date.now() })
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve()
  })
}

export async function loadProject(id: string): Promise<unknown | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(id)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const result = req.result
      resolve(result ? result.data : null)
    }
  })
}

export async function listProjects(): Promise<{ id: string; updatedAt: number }[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.getAll()
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const rows = (req.result as Array<{ id: string; updatedAt: number }>) ?? []
      resolve(rows.map((r) => ({ id: r.id, updatedAt: r.updatedAt })))
    }
  })
}

export async function deleteProject(id: string) {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(id)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve()
  })
}
