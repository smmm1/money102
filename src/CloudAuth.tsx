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
const TOKEN_KEY = "money102_cloudflare_session"
const OWNER_KEY = "money102_cloudflare_owner"
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

export default function CloudAuth({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mode, setMode] = useState<"signin" | "signup">("signin")
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
      const result = await api(mode === "signin" ? "/api/auth/signin" : "/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      }) as { token: string; user: AppUser }
      localStorage.setItem(TOKEN_KEY, result.token)
      setUser(result.user)
      setPassword("")
      setMessage(mode === "signup" ? "สร้างบัญชี Cloudflare สำเร็จ" : "เข้าสู่ระบบสำเร็จ")
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

  if (checking) return <main className="cc-auth-screen"><div className="cc-auth-mark">m.</div><section className="cc-auth-loading"><span className="cc-auth-loader" /><p>กำลังตรวจสอบพื้นที่ส่วนตัว</p><small>AUTH / SECURE SESSION</small></section></main>
  if (!user) return <main className="cc-auth-screen">
    <section className="cc-auth-frame">
      <div className="cc-auth-brand-panel">
        <div className="cc-auth-brand"><span>m.</span><strong>PERSONAL<br/>COMMAND CENTER</strong></div>
        <div className="cc-auth-editorial"><span className="cc-overline">A SPACE TO THINK CLEARLY</span><h1>Less noise.<br/><em>More meaning.</em></h1><p>การเงิน สุขภาพ และความคิดของคุณ ไม่จำเป็นต้องกระจัดกระจายอยู่คนละที่</p></div>
        <div className="cc-auth-index"><span><b>01</b> MONEY</span><span><b>02</b> NOTES</span><span><b>03</b> BODY</span></div>
        <div className="cc-auth-grid-art"><i/><i/><i/><i/><i/><i/><i/><i/><i/></div>
      </div>
      <div className="cc-auth-form-side">
        <div className="cc-auth-form-top"><span className="cc-overline">PRIVATE ACCESS / 01</span><span className="cc-auth-lock">⌁ SECURE</span></div>
        <h2>{mode === "signin" ? "กลับเข้าสู่พื้นที่ของคุณ" : "สร้างพื้นที่ของคุณ"}</h2>
        <p className="cc-auth-intro">{mode === "signin" ? "เข้าสู่ระบบเพื่อดำเนินต่อจากจุดที่คุณหยุดไว้" : "สร้างบัญชีเพื่อเริ่มจัดระเบียบเรื่องสำคัญของคุณ"}</p>
        <form onSubmit={submit} className="cc-auth-form">
          <label>อีเมล<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
          <label>รหัสผ่าน<input type="password" required minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="อย่างน้อย 8 ตัวอักษร" /></label>
          {message && <p role="status" className="cc-auth-message">{message}</p>}
          <button disabled={busy} className="cc-auth-submit">{busy ? "กำลังดำเนินการ…" : mode === "signin" ? "เข้าสู่ระบบ" : "สร้างบัญชี"}<span>↗</span></button>
        </form>
        <div className="cc-auth-switch"><span>{mode === "signin" ? "ยังไม่มีบัญชี?" : "มีบัญชีแล้ว?"}</span><button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage("") }}>{mode === "signin" ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}</button></div>
        <div className="cc-auth-foot"><span>ENCRYPTED SESSION</span><span>ข้อมูลส่วนตัวของคุณ</span></div>
      </div>
    </section>
  </main>
  if (!cloudReady) return <main className="cc-auth-screen"><div className="cc-auth-mark">m.</div><section className="cc-auth-loading"><span className="cc-auth-loader" /><p>{cloudError ? "เชื่อมต่อข้อมูลไม่สำเร็จ" : "กำลังเตรียมพื้นที่ของคุณ"}</p><small>{cloudError || "กำลังซิงก์ข้อมูลกับ Cloudflare D1"}</small>{cloudError && <button onClick={() => { void signOut() }} className="cc-auth-submit">กลับไปหน้าเข้าสู่ระบบ <span>↗</span></button>}</section></main>
  return <AuthAccountContext.Provider value={{ user, signOut }}>
    {cloudError && <div role="alert" className="fixed bottom-4 left-4 right-4 z-[110] rounded-xl bg-red-50 p-3 text-sm text-red-800 shadow">{cloudError}</div>}
    {children}
  </AuthAccountContext.Provider>
}