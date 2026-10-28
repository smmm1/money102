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
const LOCAL_PREFIX = "lamoon-"
const isCommandCenterPreview = window.location.hostname === "money102-command-center-preview.onrender.com"
const defaultApiUrl = window.location.hostname === "money102-command-center-preview.onrender.com"
  ? "https://money102-api-staging.s2mtha16.workers.dev"
  : "https://money102-api.s2mtha16.workers.dev"
const apiUrl = ((import.meta.env.VITE_CLOUDFLARE_API_URL as string | undefined) || defaultApiUrl).replace(/\/$/, "")

let memorySnapshot: LocalSnapshot = {}
let storageShimInstalled = false
function installStorageShim() {
  if (storageShimInstalled) return
  storageShimInstalled = true
  const proto = Storage.prototype
  const nativeGet = proto.getItem
  const nativeSet = proto.setItem
  const nativeRemove = proto.removeItem
  proto.getItem = function(key: string) {
    if (this === window.localStorage) return memorySnapshot[String(key)] ?? null
    return nativeGet.call(this, key)
  }
  proto.setItem = function(key: string, value: string) {
    if (this !== window.localStorage) return nativeSet.call(this, key, value)
    const k = String(key), v = String(value)
    memorySnapshot[k] = v
    scheduleCloudSave()
  }
  proto.removeItem = function(key: string) {
    if (this !== window.localStorage) return nativeRemove.call(this, key)
    const k = String(key)
    delete memorySnapshot[k]
    if (k.startsWith(LOCAL_PREFIX)) scheduleCloudSave()
  }
}
function readLocalSnapshot(): LocalSnapshot {
  return { ...memorySnapshot }
}
let saveTimer: number | undefined
let saveChain: Promise<unknown> = Promise.resolve()
function scheduleCloudSave() {
  if (saveTimer !== undefined) window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    const payload = readLocalSnapshot()
    saveChain = saveChain.then(() => api("/api/state", { method: "PUT", body: JSON.stringify({ payload }) }))
      .then(() => window.dispatchEvent(new CustomEvent("d1-persist-success")))
      .catch((error: unknown) => window.dispatchEvent(new CustomEvent("d1-persist-error", { detail: error instanceof Error ? error.message : String(error) })))
  }, 250)
}
function restoreSnapshot(snapshot: LocalSnapshot) {
  memorySnapshot = Object.fromEntries(Object.entries(snapshot || {}).filter(([key, value]) => key.length > 0 && typeof value === "string"))
}
const AUTH_TOKEN_KEY = "money102_auth_token"
let sessionToken = window.sessionStorage.getItem(AUTH_TOKEN_KEY) || ""
function getToken() { return sessionToken }
function setSessionToken(token: string) {
  sessionToken = token
  if (token) window.sessionStorage.setItem(AUTH_TOKEN_KEY, token)
  else window.sessionStorage.removeItem(AUTH_TOKEN_KEY)
}

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
    <div className="cc-auth-brand-panel"><div className="cc-auth-brand"><span className="cc-auth-logo" aria-hidden="true"><svg viewBox="0 0 40 40" focusable="false" fill="none"><path d="M12 23C7 16 12 8 20 10c7 1 11 8 7 14-3 6-11 8-15 3-4-5 0-12 6-12 4 0 7 2 10 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><circle cx="30" cy="10" r="2.2" fill="#8DAF91"/></svg></span><strong className="cc-auth-brand-name">DayTogether<small>พื้นที่ส่วนตัว</small></strong></div>
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
  const [checking] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [authMode, setAuthMode] = useState<"signin" | "signup" | "forgot">("signin")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [cloudReady, setCloudReady] = useState(false)
  const [cloudError, setCloudError] = useState("")
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)

  useEffect(() => {
    installStorageShim()
    if (!sessionToken) return
    let cancelled = false
    ;(async () => {
      try {
        const result = await api("/api/auth/me") as { user: AppUser }
        if (!cancelled) setUser(result.user)
      } catch {
        setSessionToken("")
        if (!cancelled) setUser(null)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!user) { setCloudReady(false); setCloudError(""); return }
    let cancelled = false
    setCloudReady(false); setCloudError("")
    ;(async () => {
      const result = await api("/api/state") as { payload?: LocalSnapshot | null }
      if (cancelled) return
      restoreSnapshot(result.payload && typeof result.payload === "object" ? result.payload : {})
      setCloudReady(true)
    })().catch((error: unknown) => {
      if (!cancelled) setCloudError("เชื่อมต่อ Cloudflare ไม่สำเร็จ: " + (error instanceof Error ? error.message : String(error)))
    })
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => {
    const handler = (event: Event) => setCloudError("บันทึกลง Cloudflare D1 ไม่สำเร็จ: " + ((event as CustomEvent).detail || "ไม่ทราบสาเหตุ"))
    window.addEventListener("d1-persist-error", handler)
    return () => window.removeEventListener("d1-persist-error", handler)
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage("")
    if (authMode === "forgot") { setMessage("ยังไม่ได้ตั้งค่าการส่งอีเมลรีเซ็ตรหัสผ่าน จึงยังส่งลิงก์รีเซ็ตไม่ได้"); return }
    if (authMode === "signup" && password !== confirmPassword) { setMessage("รหัสผ่านทั้งสองช่องไม่ตรงกัน"); return }
    setBusy(true)
    try {
      const result = await api(authMode === "signup" ? "/api/auth/signup" : "/api/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      }) as { token: string; user: AppUser }
      setSessionToken(result.token)
      setUser(result.user)
      setPassword("")
      setConfirmPassword("")
      setMessage(authMode === "signup" ? "สร้างบัญชีสำเร็จ" : "เข้าสู่ระบบสำเร็จ")
      setAuthMode("signin")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    try { await api("/api/auth/logout", { method: "POST", body: "{}" }) } catch { /* clear local session even if network is unavailable */ }
    setSessionToken("")
    if (saveTimer !== undefined) window.clearTimeout(saveTimer)
    saveTimer = undefined
    memorySnapshot = {}
    setUser(null)
    setCloudReady(false)
    setCloudError("")
    setMessage("ออกจากระบบแล้ว")
  }

  if (checking) return <AuthExperience state="loading" title="กำลังตรวจสอบพื้นที่ของคุณ" detail="กำลังตรวจสอบเซสชันอย่างปลอดภัย" />
  if (!user) return <main className="cc-auth-screen">
    <section className="cc-auth-frame">
      <div className="cc-auth-brand-panel">
        <div className="cc-auth-brand"><span className="cc-auth-logo" aria-hidden="true"><svg viewBox="0 0 40 40" focusable="false" fill="none"><path d="M12 23C7 16 12 8 20 10c7 1 11 8 7 14-3 6-11 8-15 3-4-5 0-12 6-12 4 0 7 2 10 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><circle cx="30" cy="10" r="2.2" fill="#8DAF91"/></svg></span><strong className="cc-auth-brand-name">DayTogether<small>พื้นที่ส่วนตัว</small></strong></div>
        <div className="cc-auth-editorial"><span className="cc-overline">A LITTLE SPACE FOR YOU</span><h1>Make room<br/><em>for what matters.</em></h1><p>พื้นที่เงียบ ๆ สำหรับสิ่งสำคัญของคุณ ในจังหวะที่เป็นตัวเอง</p></div>
        <div className="cc-auth-index"><span><b>01</b> PRIVATE</span><span><b>02</b> PERSONAL</span><span><b>03</b> ALWAYS YOURS</span></div>
        <div className="cc-auth-grid-art" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><div className="cc-auth-orbit" aria-hidden="true"><span/><span/><span/></div>
      </div>
      <div className="cc-auth-form-side">
        <div className="cc-auth-form-top"><span className="cc-overline">WELCOME BACK</span><span className="cc-auth-lock"><i/> PRIVATE ACCESS</span></div>
        <div className="cc-auth-form-content"><div className="cc-auth-mini-mark" aria-hidden="true"><svg viewBox="0 0 40 40" focusable="false" fill="none"><path d="M12 23C7 16 12 8 20 10c7 1 11 8 7 14-3 6-11 8-15 3-4-5 0-12 6-12 4 0 7 2 10 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><circle cx="30" cy="10" r="2.2" fill="#8DAF91"/></svg></div>
          <h2>{authMode==="signup"?"สร้างพื้นที่ส่วนตัวใหม่":authMode==="forgot"?"ลืมรหัสผ่าน?":"ยินดีที่ได้พบกันอีกครั้ง"}</h2><p className="cc-auth-intro">{authMode==="signup"?"สร้างบัญชีเพื่อเก็บข้อมูลส่วนตัวแยกจากผู้ใช้อื่น":authMode==="forgot"?"การรีเซ็ตรหัสผ่านผ่านอีเมลยังไม่ได้ตั้งค่าในระบบนี้":"เข้าสู่ระบบเพื่อกลับไปยังพื้นที่ของคุณ"}</p>
          {authMode==="forgot" ? <div className="cc-auth-form"><p role="status" className="cc-auth-message">ยังไม่มีบริการส่งอีเมลรีเซ็ตรหัสผ่าน จึงไม่สามารถเปลี่ยนรหัสผ่านจากหน้านี้ได้</p><button type="button" className="cc-auth-submit" onClick={()=>{setAuthMode("signin");setMessage("")}}>กลับเข้าสู่ระบบ</button></div> : <form onSubmit={submit} className="cc-auth-form">
            <label>อีเมล<input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="อีเมลของคุณ" /></label>
            <label>รหัสผ่าน<input type="password" required minLength={8} autoComplete={authMode==="signup"?"new-password":"current-password"} value={password} onChange={e => setPassword(e.target.value)} placeholder={authMode==="signup"?"อย่างน้อย 8 ตัวอักษร":"กรอกรหัสผ่าน"} /></label>
            {authMode==="signup"&&<label>ยืนยันรหัสผ่าน<input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="กรอกรหัสผ่านอีกครั้ง" /></label>}
            {message && <p role="status" className="cc-auth-message">{message}</p>}
            <button disabled={busy} className="cc-auth-submit">{busy ? <><span className="cc-auth-button-spinner"/>กำลังตรวจสอบ…</> : <>{authMode==="signup"?"สร้างบัญชี":"เข้าสู่ระบบ"}<span aria-hidden="true">↗</span></>}</button>
            <div className="cc-auth-mode-links">{authMode==="signin"?<><button type="button" onClick={()=>{setAuthMode("signup");setMessage("")}}>สมัครสมาชิก</button><button type="button" onClick={()=>{setAuthMode("forgot");setMessage("")}}>ลืมรหัสผ่าน?</button></>:<button type="button" onClick={()=>{setAuthMode("signin");setMessage("");setConfirmPassword("")}}>มีบัญชีแล้ว? เข้าสู่ระบบ</button>}</div>
          </form>}
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