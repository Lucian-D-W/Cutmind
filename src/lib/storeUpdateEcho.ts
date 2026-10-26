const LOCAL_STORE_WRITE_TTL_MS = 1800

interface LocalWriteEntry {
  count: number
  lastAt: number
}

const localWrites = new Map<string, LocalWriteEntry>()

export function markLocalStoreWrite(filename: string, now = Date.now()) {
  const current = localWrites.get(filename)
  localWrites.set(filename, {
    count: (current?.count ?? 0) + 1,
    lastAt: now,
  })
}

export function shouldIgnoreStoreEcho(filename: string, now = Date.now()) {
  const current = localWrites.get(filename)
  if (!current) return false

  if (now - current.lastAt > LOCAL_STORE_WRITE_TTL_MS) {
    localWrites.delete(filename)
    return false
  }

  if (current.count <= 1) {
    localWrites.delete(filename)
  } else {
    localWrites.set(filename, {
      count: current.count - 1,
      lastAt: current.lastAt,
    })
  }

  return true
}

export function clearLocalStoreWriteEchoState() {
  localWrites.clear()
}
