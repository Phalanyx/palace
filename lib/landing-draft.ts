const LANDING_DRAFT_DB_NAME = "palace-landing-draft"
const LANDING_DRAFT_STORE_NAME = "drafts"
const LANDING_DRAFT_KEY = "active"
const LANDING_DRAFT_MAX_AGE_MS = 1000 * 60 * 60 * 4

export interface LandingDraft {
  prompt: string
  files: File[]
  source: "landing"
  timestamp: number
}

function openLandingDraftDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(LANDING_DRAFT_DB_NAME, 1)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(LANDING_DRAFT_STORE_NAME)) {
        database.createObjectStore(LANDING_DRAFT_STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open landing draft database."))
  })
}

function withStore<T>(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  handler: (
    store: IDBObjectStore,
    resolve: (value: T) => void,
    reject: (reason?: unknown) => void
  ) => void
) {
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(LANDING_DRAFT_STORE_NAME, mode)
    const store = transaction.objectStore(LANDING_DRAFT_STORE_NAME)

    handler(store, resolve, reject)

    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Landing draft transaction aborted."))
  })
}

export async function saveLandingDraft(prompt: string, files: File[] = []) {
  if (typeof window === "undefined") {
    return
  }

  const database = await openLandingDraftDb()

  try {
    const draft: LandingDraft = {
      prompt,
      files,
      source: "landing",
      timestamp: Date.now(),
    }

    await withStore<void>(database, "readwrite", (store, resolve, reject) => {
      const request = store.put(draft, LANDING_DRAFT_KEY)
      request.onsuccess = () => resolve()
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to save landing draft."))
    })
  } finally {
    database.close()
  }
}

export async function loadLandingDraft() {
  if (typeof window === "undefined") {
    return null
  }

  const database = await openLandingDraftDb()

  try {
    const draft = await withStore<LandingDraft | null>(
      database,
      "readonly",
      (store, resolve, reject) => {
        const request = store.get(LANDING_DRAFT_KEY)
        request.onsuccess = () => resolve((request.result as LandingDraft | undefined) ?? null)
        request.onerror = () =>
          reject(request.error ?? new Error("Failed to load landing draft."))
      }
    )

    if (
      !draft ||
      typeof draft.prompt !== "string" ||
      typeof draft.timestamp !== "number" ||
      !Array.isArray(draft.files) ||
      Date.now() - draft.timestamp > LANDING_DRAFT_MAX_AGE_MS
    ) {
      await clearLandingDraft()
      return null
    }

    return draft
  } finally {
    database.close()
  }
}

export async function clearLandingDraft() {
  if (typeof window === "undefined") {
    return
  }

  const database = await openLandingDraftDb()

  try {
    await withStore<void>(database, "readwrite", (store, resolve, reject) => {
      const request = store.delete(LANDING_DRAFT_KEY)
      request.onsuccess = () => resolve()
      request.onerror = () =>
        reject(request.error ?? new Error("Failed to clear landing draft."))
    })
  } finally {
    database.close()
  }
}
