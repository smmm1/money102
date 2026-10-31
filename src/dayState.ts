import { api } from "./CloudAuth"

export type DayState = {
  goals: unknown[]
  savings: unknown[]
  health: Record<string, unknown>[]
  notes: Record<string, unknown>[]
  bills: unknown[]
  bbq?: unknown[]
  visits?: unknown[]
  settings?: Record<string, unknown>
  [key: string]: unknown
}
type SnapshotResponse = { payload?: Record<string,string> | null; updated_at?: string | null }
export const DAY_STATE_KEY = "lamoon-daytogether-v1"
export const HEALTH_PROFILE_KEY = "lamoon-health-profile-v1"
export type LoadedState = { state: DayState; payload: Record<string,string>; revision: string | null }

export function emptyDayState(): DayState {
  return { goals: [], savings: [], health: [], notes: [], bills: [], bbq: [] }
}
export function parseDayState(raw?: string): DayState {
  if (!raw) return emptyDayState()
  try {
    const value = JSON.parse(raw)
    if (!value || typeof value !== "object" || Array.isArray(value)) return emptyDayState()
    const arrays = ["goals","savings","health","notes","bills"]
    if (arrays.some(key => !Array.isArray(value[key]))) return emptyDayState()
    if (!Array.isArray(value.bbq) && !Array.isArray(value.visits)) return emptyDayState()
    return value as DayState
  } catch { return emptyDayState() }
}
export async function loadDayState(): Promise<LoadedState> {
  const result = await api("/api/state") as SnapshotResponse
  const payload = result.payload || {}
  return { state: parseDayState(payload[DAY_STATE_KEY]), payload, revision: result.updated_at ?? null }
}
export async function saveDayState(loaded: LoadedState, next: DayState, extra: Record<string,string> = {}): Promise<string | null> {
  const current = await api("/api/state") as SnapshotResponse
  const revision = current.updated_at ?? null
  if (revision !== loaded.revision) throw Object.assign(new Error("ข้อมูลถูกเปลี่ยนจากอีกอุปกรณ์แล้ว กรุณาโหลดข้อมูลล่าสุด"), { status: 409 })
  const payload = { ...(current.payload || {}), ...extra, [DAY_STATE_KEY]: JSON.stringify(next) }
  const saved = await api("/api/state", { method: "PUT", body: JSON.stringify({ payload, expected_updated_at: revision }) }) as { updated_at?: string }
  return saved.updated_at ?? null
}
export function isModernState(state: DayState): boolean { return Array.isArray(state.visits) && !!state.settings }
export function localDateTime() {
  const d = new Date()
  const pad = (n:number) => String(n).padStart(2,"0")
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export function localDate() { return localDateTime().slice(0,10) }
export function uid() { return crypto.randomUUID() }
