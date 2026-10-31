import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react"
import "./auth.css"

type AppUser = { id: string; email: string }
type AuthContextValue = { user: AppUser; signOut: () => Promise<void> }
const AuthContext = createContext<AuthContextValue | null>(null)
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth must be used inside CloudAuth")
  return value
}
const TOKEN_KEY = "money102_auth_token"
const API_URL = (import.meta.env.VITE_CLOUDFLARE_API_URL as string | undefined || "https://money102-api.s2mtha16.workers.dev").replace(/\/$/, "")

let sessionToken = window.sessionStorage.getItem(TOKEN_KEY) || ""
function setToken(token: string) {
  sessionToken = token
  if (token) window.sessionStorage.setItem(TOKEN_KEY, token)
  else window.sessionStorage.removeItem(TOKEN_KEY)
}

export async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  if (sessionToken) headers.set("Authorization", `Bearer ${sessionToken}`)
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json")
  const response = await fetch(`${API_URL}${path}`, { ...init, headers, cache: "no-store" })
  const body = await response.json().catch(() => ({})) as { error?: string; detail?: string; user?: AppUser; token?: string }
  if (!response.ok) {
    const error = new Error([body.error, body.detail].filter(Boolean).join(": ") || `Request failed (${response.status})`)
    Object.assign(error, { status: response.status })
    throw error
  }
  return body
}

export default function CloudAuth({ children }: { children?: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [checking, setChecking] = useState(Boolean(sessionToken))
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [connectionError, setConnectionError] = useState("")

  useEffect(() => {
    if (!sessionToken) { setChecking(false); return }
    let cancelled = false
    api("/api/auth/me").then(result => {
      if (!cancelled && result.user) setUser(result.user)
    }).catch(error => {
      if (cancelled) return
      if ((error as { status?: number }).status === 401) setToken("")
      else setConnectionError(error instanceof Error ? error.message : String(error))
    }).finally(() => { if (!cancelled) setChecking(false) })
    return () => { cancelled = true }
  }, [])

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setMessage("")
    setConnectionError("")
    try {
      const result = await api("/api/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      })
      if (!result.token || !result.user) throw new Error("ข้อมูลการเข้าสู่ระบบจาก Cloudflare ไม่ครบถ้วน")
      setToken(result.token)
      setUser(result.user)
      setPassword("")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    try { await api("/api/auth/logout", { method: "POST", body: "{}" }) } catch { /* local session is still cleared */ }
    setToken("")
    setUser(null)
    setPassword("")
    setMessage("")
  }

  if (checking) return <main className="auth-state" aria-live="polite"><span className="auth-loading-mark" /><p>กำลังเตรียมพื้นที่ส่วนตัว…</p></main>
  if (connectionError) return <main className="auth-state"><p>เชื่อมต่อระบบยืนยันตัวตนไม่ได้</p><p>{connectionError}</p><button type="button" onClick={() => window.location.reload()}>ลองอีกครั้ง</button></main>
  if (user) return <AuthContext.Provider value={{ user, signOut }}>{children ?? <main className="auth-empty"><span>เข้าสู่ระบบแล้ว</span><button type="button" onClick={() => void signOut()}>ออกจากระบบ</button></main>}</AuthContext.Provider>

  return <main className="auth-page">
    <section className="auth-story">
      <div className="auth-story-brand"><span className="auth-story-mark"><i /></span><span><strong>daytogether</strong><small>your life, gently kept</small></span></div>
      <div className="auth-story-copy">
        <span className="auth-kicker">A LITTLE SPACE FOR YOUR EVERYDAY</span>
        <h2>ค่อย ๆ ใช้ชีวิต<br /><em>ในจังหวะของเรา</em></h2>
        <p>พื้นที่ส่วนตัวสำหรับเก็บเรื่องราว ดูแลตัวเอง และจัดระเบียบสิ่งต่าง ๆ ในแบบที่เป็นคุณ</p>
      </div>
      <div className="auth-story-foot">YOUR PERSONAL SPACE · EVERY DAY, TOGETHER</div>
    </section>
    <section className="auth-form-wrap">
      <form className="auth-form" onSubmit={signIn}>
        <span className="auth-kicker">WELCOME BACK</span>
        <h1>ยินดีต้อนรับกลับมา</h1>
        <p>เข้าสู่ระบบเพื่อกลับไปยังพื้นที่ของคุณ</p>
        <label htmlFor="auth-email">อีเมล</label>
        <input id="auth-email" type="email" autoComplete="username" placeholder="name@example.com" value={email} onChange={event => setEmail(event.target.value)} required />
        <label htmlFor="auth-password">รหัสผ่าน</label>
        <input id="auth-password" type="password" autoComplete="current-password" placeholder="กรอกรหัสผ่านของคุณ" value={password} onChange={event => setPassword(event.target.value)} required />
        {message && <p className="auth-error" role="alert">{message}</p>}
        <button type="submit" disabled={busy}>{busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
      </form>
    </section>
  </main>
}
