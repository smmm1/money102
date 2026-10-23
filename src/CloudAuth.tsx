import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react"

type AppUser = { id: string; email: string }
const AuthAccountContext = createContext<{ user: AppUser; signOut: () => Promise<void> } | null>(null)

export function AccountMenu() {
  const account = useContext(AuthAccountContext)
  const [open, setOpen] = useState(false)
  if (!account) return null
  const { user, signOut } = account
  return (
    <div className="relative">
      <button type="button" aria-label="เปิดเมนูบัญชี" aria-expanded={open} onClick={() => setOpen(value => !value)} className="group grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#E5E0D3] bg-white/85 p-0 shadow-[0_2px_8px_rgba(38,51,41,0.05)] backdrop-blur transition hover:border-[#C9D4C5] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A9C83]/50"
        <span className="relative grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-[#E8EEE5] to-[#C8D9C7] text-[9px] font-bold tracking-wide text-[#35513A]">{user.email.split("@")[0].slice(0, 2).toUpperCase()}<span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full border border-white bg-[#6F9B70]" /></span>
        <svg aria-hidden="true" className={`hidden h-3 w-3 text-[#7B8579] transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && <><button type="button" aria-label="ปิดเมนูบัญชี" className="fixed inset-0 z-[-1] cursor-default" onClick={() => setOpen(false)} /><div className="absolute right-0 top-full z-[120] mt-2.5 w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-[22px] border border-[#E5E0D3] bg-[#FCFBF7] p-2 shadow-[0_20px_60px_rgba(38,51,41,0.16)]"><div className="rounded-[16px] bg-[#F1F3EB] px-3.5 py-3"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A967F]">บัญชีของคุณ</p><p className="mt-1 break-all text-sm font-semibold text-[#344236]">{user.email}</p><div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#D9E4D4] bg-white/80 px-2.5 py-1 text-[10px] font-medium text-[#55745A]"><span className="h-1.5 w-1.5 rounded-full bg-[#6F9B70]" /> เชื่อมต่อ Cloudflare แล้ว</div></div><button type="button" onClick={() => { setOpen(false); void signOut() }} className="mt-1.5 flex w-full items-center gap-2.5 rounded-[14px] px-3.5 py-3 text-left text-sm font-medium text-[#8D5148] transition hover:bg-[#F8EAE6]"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#F6E4DF] text-[#8D5148]"><svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></svg></span><span>ออกจากระบบ</span></button></div></>}
    </div>
  )
}
type LocalSnapshot = Record<string, string>
const TOKEN_KEY = "money102_cloudflare_session"
const LOCAL_PREFIX = "lamoon-"
const apiUrl = ((import.meta.env.VITE_CLOUDFLARE_API_URL as string | undefined) || "https://money102-api.s2mtha16.workers.dev").replace(/\/$/, "")

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
      const mergedSnapshot = { ...localSnapshot, ...cloudSnapshot }
      const migrationResponse = await api("/api/state", {
        method: "PUT",
        body: JSON.stringify({ payload: mergedSnapshot }),
      })
      if (cancelled) return
      restoreSnapshot(mergedSnapshot)
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

  if (checking) return <main className="grid min-h-screen place-items-center bg-[#F7F5EE] text-sm text-[#73796F]">กำลังตรวจสอบบัญชี…</main>
  if (!user) return <main className="grid min-h-screen place-items-center bg-[#F7F5EE] p-5">
    <section className="w-full max-w-md rounded-[28px] border border-[#E5E0D3] bg-[#FCFBF7] p-7 shadow-[0_20px_60px_rgba(38,51,41,0.08)] sm:p-9">
      <div className="mb-7 grid h-12 w-12 place-items-center rounded-2xl bg-[#E8EEE5] text-2xl">🐷</div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9B8450]">LAMOON · PRIVATE SPACE</p>
      <h1 className="mt-2 text-2xl font-semibold text-[#263329]">{mode === "signin" ? "ยินดีต้อนรับกลับ" : "สร้างบัญชีของคุณ"}</h1>
      <p className="mt-2 text-sm leading-6 text-[#777D73]">เข้าสู่ระบบเพื่อเก็บข้อมูลออมเงิน สุขภาพ และโน้ตไว้ใน Cloudflare D1</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-[#414A41]">อีเมล<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-[#DEDACF] bg-white px-4 outline-none focus:border-[#8A9C83]" /></label>
        <label className="block text-sm font-medium text-[#414A41]">รหัสผ่าน<input type="password" required minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-[#DEDACF] bg-white px-4 outline-none focus:border-[#8A9C83]" /></label>
        {message && <p role="status" className="text-sm leading-5 text-[#8B5B42]">{message}</p>}
        <button disabled={busy} className="h-12 w-full rounded-full bg-[#263329] text-sm font-medium text-white disabled:opacity-60">{busy ? "กำลังดำเนินการ…" : mode === "signin" ? "เข้าสู่ระบบ" : "สมัครบัญชี"}</button>
      </form>
      <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage("") }} className="mt-5 w-full text-sm text-[#55745A]">{mode === "signin" ? "ยังไม่มีบัญชี Cloudflare? สมัครใหม่" : "มีบัญชีแล้ว? เข้าสู่ระบบ"}</button>
    </section>
  </main>
  if (!cloudReady) return <main className="grid min-h-screen place-items-center bg-[#F7F5EE] p-5"><section className="max-w-xl rounded-3xl bg-white p-7 shadow-sm"><p className="text-sm leading-6 text-[#5F665D]">{cloudError || "กำลังโหลดข้อมูลของคุณจาก Cloudflare D1…"}</p><button onClick={() => { void signOut() }} className="mt-4 rounded-full border px-4 py-2 text-sm">ออกจากระบบ</button></section></main>
  return <AuthAccountContext.Provider value={{ user, signOut }}>
    {cloudError && <div role="alert" className="fixed bottom-4 left-4 right-4 z-[110] rounded-xl bg-red-50 p-3 text-sm text-red-800 shadow">{cloudError}</div>}
    {children}
  </AuthAccountContext.Provider>
}