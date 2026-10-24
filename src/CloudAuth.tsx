import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react"

type AppUser = { id: string; email: string }
const AuthAccountContext = createContext<{ user: AppUser; signOut: () => Promise<void> } | null>(null)

export function AccountMenu() {
  const account = useContext(AuthAccountContext)
  const [open, setOpen] = useState(false)
  if (!account) return null
  const { user, signOut } = account
  return <div className="cc-account">
    <button type="button" className="cc-account-trigger" aria-label="เมนูบัญชี" aria-expanded={open} onClick={() => setOpen(v => !v)}><span>{user.email.slice(0,1).toUpperCase()}</span><i /></button>
    {open && <><button type="button" className="cc-account-dismiss" aria-label="ปิดเมนูบัญชี" onClick={() => setOpen(false)} /><section className="cc-account-menu"><small>ACCOUNT / ACTIVE</small><strong>{user.email}</strong><span className="cc-account-connected"><i /> เชื่อมต่อข้อมูลแล้ว</span><button type="button" onClick={() => { setOpen(false); void signOut() }}>ออกจากระบบ <span>↗</span></button></section></>}
  </div>
}
type LocalSnapshot = Record<string, string>
const isCommandCenterPreview = window.location.hostname === "money102-command-center-preview.onrender.com"
const TOKEN_KEY = isCommandCenterPreview ? "money102_cloudflare_session_preview" : "money102_cloudflare_session"
const OWNER_KEY = isCommandCenterPreview ? "money102_cloudflare_owner_preview" : "money102_cloudflare_owner"
const LOCAL_PREFIX = "lamoon-"
const defaultApiUrl = window.location.hostname === "money102-command-center-preview.onrender.com"
  ? "https://money102-api-staging.s2mtha16.workers.dev"
  : "https://money102-api.s2mtha16.workers.dev"
const apiUrl = ((import.meta.env.VITE_CLOUDFLARE_API_URL as string | undefined) || defaultApiUrl).replace(/\/$/, "")

function readLocalSnapshot(): LocalSnapshot {
  const snapshot: LocalSnapshot = {}
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key?.startsWith(LOCAL_PREFIX)) {
      const value = localStorage.getItem(key)
      if (value !== null) snapshot[key] = value
    }
  }
  return snapshot
}

function restoreSnapshot(snapshot: LocalSnapshot) {
  Object.entries(snapshot || {}).forEach(([key, value]) => {
    if (key.startsWith(LOCAL_PREFIX) && typeof value === "string") localStorage.setItem(key, value)
  })
}

function getToken() { return localStorage.getItem(TOKEN_KEY) || "" }

async function api(path: string, init: RequestInit = {}) {
  const token = getToken()
  const headers = new Headers(init.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json")
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers })
  const body = await response.json().catch(() => ({})) as { error?: string; detail?: string; [key: string]: unknown }
  if (!response.ok) throw new Error([body.error, body.detail].filter(Boolean).join(': ') || `Request failed (${response.status})`)
  return body
}

function AuthExperience({ state, title, detail, onRetry }: { state: "loading" | "error"; title: string; detail: string; onRetry?: () => void }) {
  return <main className="cc-auth-screen cc-auth-screen-status"><section className="cc-auth-frame cc-auth-frame-status">
    <div className="cc-auth-brand-panel"><div className="cc-auth-brand"><span className="cc-auth-logo" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="M11 27.5C5 19 13 8 23 12c9 4 12 12 6 20-5 6-14 8-19 2-4-5 0-13 7-13 5 0 8 4 11 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M34 10v8M30 14h8" stroke="#8DAF91" strokeWidth="2.4" strokeLinecap="round"/></svg></span><strong>YOUR SPACE<br/>YOUR PACE</strong></div>
      <div className="cc-auth-editorial"><span className="cc-overline">A LITTLE SPACE FOR YOU</span><h1>Make room<br/><em>for what matters.</em></h1><p>พื้นที่เงียบ ๆ สำหรับสิ่งสำคัญของคุณ ในจังหวะที่เป็นตัวเอง</p></div>
      <div className="cc-auth-index"><span><b>01</b> PRIVATE</span><span><b>02</b> PERSONAL</span><span><b>03</b> ALWAYS YOURS</span></div><div className="cc-auth-grid-art" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><div className="cc-auth-orbit" aria-hidden="true"><span/><span/><span/></div>
    </div>
    <div className="cc-auth-form-side cc-auth-status-side"><div className="cc-auth-form-top"><span className="cc-overline">PRIVATE ACCESS</span><span className="cc-auth-lock"><i/> SECURE SESSION</span></div>
      <div className="cc-auth-status-content"><div className={state === "error" ? "cc-auth-status-icon is-error" : "cc-auth-status-icon"}>{state === "error" ? "!" : <span className="cc-auth-loader"/>}</div><span className="cc-overline">{state === "error" ? "CONNECTION STATUS" : "PLEASE WAIT A MOMENT"}</span><h2>{title}</h2><p>{detail}</p>{state === "loading" && <div className="cc-auth-progress"><span/></div>}{onRetry && <button type="button" onClick={onRetry} className="cc-auth-submit">กลับไปหน้าเข้าสู่ระบบ <span>↗</span></button>}</div>
      <div className="cc-auth-foot"><span><i/> YOUR DATA STAYS YOURS</span><span>พื้นที่ส่วนตัวของคุณ</span></div>
    </div>
  </section></main>
}
export default function CloudAuth({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [cloudReady, setCloudReady] = useState(false)
  const [cloudError, setCloudError] = useState("")
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const token = getToken()
      if (!token) { if (!cancelled) setChecking(false); return }
      try {
        const result = await api("/api/auth/me")
        if (!cancelled) setUser(result.user as AppUser)
      } catch {
        localStorage.removeItem(TOKEN_KEY)
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!user) { setCloudReady(false); setCloudError(""); return }
    let cancelled = false
    setCloudReady(false)
    setCloudError("")
    ;(async () => {
      const result = await api("/api/state") as { payload?: LocalSnapshot | null }
      if (cancelled) return
      const localSnapshot = readLocalSnapshot()
      const cloudSnapshot = result.payload && typeof result.payload === "object" ? result.payload : {}
      const previousOwner = localStorage.getItem(OWNER_KEY)
      const sameAccount = !previousOwner || previousOwner === user.id
      const mergedSnapshot = sameAccount ? { ...localSnapshot, ...cloudSnapshot } : cloudSnapshot

      // Keep local app data isolated when switching accounts in the same browser.
      if (!sameAccount) {
        Object.keys(localSnapshot).forEach((key) => localStorage.removeItem(key))
      }
      await api("/api/state", {
        method: "PUT",
        body: JSON.stringify({ payload: mergedSnapshot }),
      })
      if (cancelled) return
      restoreSnapshot(mergedSnapshot)
      localStorage.setItem(OWNER_KEY, user.id)
      setCloudReady(true)
    })().catch((error: unknown) => {
      if (!cancelled) setCloudError("เชื่อมต่อ Cloudflare ไม่สำเร็จ: " + (error instanceof Error ? error.message : String(error)))
    })
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => {
    if (!user || !cloudReady) return
    const originalSetItem = Storage.prototype.setItem
    const originalRemoveItem = Storage.prototype.removeItem
    let timer: number | undefined
    let stopped = false
    const sync = async () => {
      if (stopped) return
      await api("/api/state", { method: "PUT", body: JSON.stringify({ payload: readLocalSnapshot() }) })
      if (!stopped) setCloudError("")
    }
    const schedule = () => {
      if (timer !== undefined) window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        void sync().catch((error: unknown) => {
          if (!stopped) setCloudError("บันทึกลง Cloudflare D1 ไม่สำเร็จ: " + (error instanceof Error ? error.message : String(error)))
        })
      }, 600)
    }
    Storage.prototype.setItem = function (key: string, value: string) {
      originalSetItem.call(this, key, value)
      if (this === window.localStorage && key.startsWith(LOCAL_PREFIX)) schedule()
    }
    Storage.prototype.removeItem = function (key: string) {
      originalRemoveItem.call(this, key)
      if (this === window.localStorage && key.startsWith(LOCAL_PREFIX)) schedule()
    }
    return () => {
      stopped = true
      if (timer !== undefined) window.clearTimeout(timer)
      Storage.prototype.setItem = originalSetItem
      Storage.prototype.removeItem = originalRemoveItem
    }
  }, [user?.id, cloudReady])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage("")
    try {
      const result = await api("/api/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      }) as { token: string; user: AppUser }
      localStorage.setItem(TOKEN_KEY, result.token)
      setUser(result.user)
      setPassword("")
      setMessage("เข้าสู่ระบบสำเร็จ")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    try { await api("/api/auth/logout", { method: "POST", body: "{}" }) } catch { /* clear local session even if network is unavailable */ }
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    setCloudReady(false)
    setCloudError("")
    setMessage("ออกจากระบบแล้ว")
  }

  if (checking) return <AuthExperience state="loading" title="กำลังตรวจสอบพื้นที่ของคุณ" detail="กำลังตรวจสอบเซสชันอย่างปลอดภัย" />
  if (!user) return <main className="cc-auth-screen">
    <section className="cc-auth-frame">
      <div className="cc-auth-brand-panel">
        <div className="cc-auth-brand"><span className="cc-auth-logo" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="M11 27.5C5 19 13 8 23 12c9 4 12 12 6 20-5 6-14 8-19 2-4-5 0-13 7-13 5 0 8 4 11 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M34 10v8M30 14h8" stroke="#8DAF91" strokeWidth="2.4" strokeLinecap="round"/></svg></span><strong>YOUR SPACE<br/>YOUR PACE</strong></div>
        <div className="cc-auth-editorial"><span className="cc-overline">A LITTLE SPACE FOR YOU</span><h1>Make room<br/><em>for what matters.</em></h1><p>พื้นที่เงียบ ๆ สำหรับสิ่งสำคัญของคุณ ในจังหวะที่เป็นตัวเอง</p></div>
        <div className="cc-auth-index"><span><b>01</b> PRIVATE</span><span><b>02</b> PERSONAL</span><span><b>03</b> ALWAYS YOURS</span></div>
        <div className="cc-auth-grid-art" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><div className="cc-auth-orbit" aria-hidden="true"><span/><span/><span/></div>
      </div>
      <div className="cc-auth-form-side">
        <div className="cc-auth-form-top"><span className="cc-overline">WELCOME BACK</span><span className="cc-auth-lock"><i/> PRIVATE ACCESS</span></div>
        <div className="cc-auth-form-content"><div className="cc-auth-mini-mark" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="M11 27.5C5 19 13 8 23 12c9 4 12 12 6 20-5 6-14 8-19 2-4-5 0-13 7-13 5 0 8 4 11 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M34 10v8M30 14h8" stroke="#8DAF91" strokeWidth="2.4" strokeLinecap="round"/></svg></div>
          <h2>ยินดีที่ได้พบกันอีกครั้ง</h2><p className="cc-auth-intro">เข้าสู่ระบบเพื่อกลับไปยังพื้นที่ของคุณ</p>
          <form onSubmit={submit} className="cc-auth-form">
            <label>อีเมล<input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="อีเมลของคุณ" /></label>
            <label>รหัสผ่าน<input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="กรอกรหัสผ่าน" /></label>
            {message && <p role="status" className="cc-auth-message">{message}</p>}
            <button disabled={busy} className="cc-auth-submit">{busy ? <><span className="cc-auth-button-spinner"/>กำลังตรวจสอบ…</> : <>เข้าสู่ระบบ<span aria-hidden="true">↗</span></>}</button>
          </form>
        </div>
        <div className="cc-auth-foot"><span><i/> SECURE SESSION</span><span>พื้นที่ส่วนตัวของคุณ</span></div>
      </div>
    </section>
  </main>
  if (!cloudReady) return <AuthExperience state={cloudError ? "error" : "loading"} title={cloudError ? "ยังเชื่อมต่อไม่สำเร็จ" : "กำลังเตรียมพื้นที่ของคุณ"} detail={cloudError || "กำลังเชื่อมต่อพื้นที่จัดเก็บข้อมูลอย่างปลอดภัย"} onRetry={cloudError ? () => { void signOut() } : undefined} />
  return <AuthAccountContext.Provider value={{ user, signOut }}>
    {cloudError && <div role="alert" className="fixed bottom-4 left-4 right-4 z-[110] rounded-xl bg-red-50 p-3 text-sm text-red-800 shadow">{cloudError}</div>}
    {children}
  </AuthAccountContext.Provider>
}