import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

let sqlitePlugin = null

const isNative = () => Capacitor.isNativePlatform()

async function getSQLite() {
  if (!isNative()) return null
  if (sqlitePlugin) return sqlitePlugin
  try {
    const mod = await import('@capacitor-community/sqlite')
    sqlitePlugin = mod.CapacitorSQLite
    return sqlitePlugin
  } catch (e) {
    console.warn('SQLite plugin not available, falling back to Preferences/localStorage')
    return null
  }
}

const dbName = 'chsmart.db'
let dbConn = null

async function init() {
  if (isNative()) {
    const SQLite = await getSQLite()
    if (!SQLite) return
    const { result } = await SQLite.checkConnectionsConsistency({ dbNames: [dbName] })
    if (!result) await SQLite.createConnection({ database: dbName })
    dbConn = await SQLite.createConnection({ database: dbName })
    await dbConn.open()
    await dbConn.execute(`
      CREATE TABLE IF NOT EXISTS forms (
        id TEXT PRIMARY KEY,
        title TEXT,
        category TEXT,
        json TEXT
      );
      CREATE TABLE IF NOT EXISTS submissions_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        form_id TEXT,
        payload TEXT,
        created_at INTEGER
      );
    `)
  }
}

async function saveForms(forms) {
  if (!forms || !forms.length) return
  if (isNative() && dbConn) {
    const stmt = await dbConn.prepare('INSERT OR REPLACE INTO forms (id, title, category, json) VALUES (?,?,?,?)')
    try {
      for (const f of forms) {
        await stmt.bind([String(f.id), f.title || '', f.category || '', JSON.stringify(f)])
        await stmt.run()
        await stmt.reset()
      }
    } finally {
      await stmt.finalize()
    }
  } else {
    try {
      localStorage.setItem('offline_forms', JSON.stringify(forms))
    } catch (_) {}
  }
}

async function getForms() {
  if (isNative() && dbConn) {
    const res = await dbConn.query('SELECT json FROM forms')
    return (res.values || []).map(r => JSON.parse(r.json))
  }
  try {
    const raw = localStorage.getItem('offline_forms')
    return raw ? JSON.parse(raw) : []
  } catch (_) {
    return []
  }
}

async function queueSubmission(formId, payload) {
  if (isNative() && dbConn) {
    await dbConn.run('INSERT INTO submissions_queue (form_id, payload, created_at) VALUES (?,?,?)', [String(formId), JSON.stringify(payload), Date.now()])
    return
  }
  const raw = (await Preferences.get({ key: 'submissions_queue' })).value
  const list = raw ? JSON.parse(raw) : []
  list.push({ form_id: formId, payload, created_at: Date.now() })
  await Preferences.set({ key: 'submissions_queue', value: JSON.stringify(list) })
}

async function processQueue(api) {
  try {
    if (!navigator.onLine) return { processed: 0 }
  } catch (_) {}
  let processed = 0
  if (isNative() && dbConn) {
    const res = await dbConn.query('SELECT id, form_id, payload FROM submissions_queue ORDER BY id ASC')
    for (const row of res.values || []) {
      try {
        const payload = JSON.parse(row.payload)
        await api.post(`/forms/${payload.form_id}/submit`, payload)
        await dbConn.run('DELETE FROM submissions_queue WHERE id = ?', [row.id])
        processed++
      } catch (e) {
        // Stop on first failure to avoid tight loop
        break
      }
    }
    return { processed }
  }
  // Web fallback
  const raw = (await Preferences.get({ key: 'submissions_queue' })).value
  const list = raw ? JSON.parse(raw) : []
  const remaining = []
  for (const item of list) {
    try {
      await api.post(`/forms/${item.form_id}/submit`, item.payload)
      processed++
    } catch (_) {
      remaining.push(item)
      break
    }
  }
  await Preferences.set({ key: 'submissions_queue', value: JSON.stringify(remaining) })
  return { processed }
}

export default { init, saveForms, getForms, queueSubmission, processQueue }
