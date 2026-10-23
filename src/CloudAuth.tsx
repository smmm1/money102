import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { createClient, type User } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

const LOCAL_PREFIX = "lamoon-"
type LocalSnapshot = Record<string, string>

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
  const existing: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key?.startsWith(LOCAL_PREFIX)) existing.push(key)
  }
  existing.forEach((key) => localStorage.removeItem(key))
  Object.entries(snapshot || {}).forEach(([key, value]) => {
    if (key.startsWith(LOCAL_PREFIX) && typeof value === "string") localStorage.setItem(key, value)
  })
}

export default function CloudAuth({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [cloudReady, setCloudReady] = useState(false)
  const [cloudError, setCloudError] = useState("")

  useEffect(() => {
    if (!supabase) {
      setChecking(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setChecking(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const apiUrl = (import.meta.env.VITE_CLOUDFLARE_API_URL as string | undefined)?.replace(/\/$/, "");

  useEffect(() => {
    if (!user || !supabase) {
      setCloudReady(false);
      setCloudError("");
      return;
    }
    if (!apiUrl) {
      setCloudError("ยังไม่ได้ตั้งค่า VITE_CLOUDFLARE_API_URL สำหรับ Cloudflare Worker");
      return;
    }
    let cancelled = false;
    setCloudReady(false);
    setCloudError("");
    (async () => {
      const { data: sessionData } = await supabase!.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        if (!cancelled) setCloudError("ไม่พบ session สำหรับเชื่อมต่อฐานข้อมูล");
        return;
      }
      const response = await fetch(`${apiUrl}/api/state`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const body = await response.text();
        if (!cancelled) setCloudError("อ่าน Cloudflare D1 ไม่สำเร็จ: " + body);
        return;
      }
      const result = await response.json() as { payload: LocalSnapshot | null };
      if (cancelled) return;
      if (result.payload && typeof result.payload === "object") {
        restoreSnapshot(result.payload);
      } else {
        const migrationResponse = await fetch(`${apiUrl}/api/state`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ payload: readLocalSnapshot() }),
        });
        if (!migrationResponse.ok) {
          const body = await migrationResponse.text();
          if (!cancelled) setCloudError("ย้ายข้อมูลจากเบราว์เซอร์ไป Cloudflare ไม่สำเร็จ: " + body);
          return;
        }
      }
      if (!cancelled) setCloudReady(true);
    })().catch((error: unknown) => {
      if (!cancelled) setCloudError("เชื่อมต่อ Cloudflare ไม่สำเร็จ: " + (error instanceof Error ? error.message : String(error)));
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (!user || !cloudReady || !supabase || !apiUrl) return;
    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    let timer: number | undefined;
    let stopped = false;
    const sync = async () => {
      if (stopped) return;
      const { data } = await supabase!.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        if (!stopped) setCloudError("session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
        return;
      }
      const response = await fetch(`${apiUrl}/api/state`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload: readLocalSnapshot() }),
      });
      if (!response.ok && !stopped) setCloudError("บันทึกลง Cloudflare D1 ไม่สำเร็จ: " + await response.text());
      else if (!stopped) setCloudError("");
    };
    const schedule = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void sync().catch((error: unknown) => {
          if (!stopped) setCloudError("บันทึกลง Cloudflare ไม่สำเร็จ: " + (error instanceof Error ? error.message : String(error)));
        });
      }, 500);
    };
    Storage.prototype.setItem = function (key: string, value: string) {
      originalSetItem.call(this, key, value);
      if (this === window.localStorage && key.startsWith(LOCAL_PREFIX)) schedule();
    };
    Storage.prototype.removeItem = function (key: string) {
      originalRemoveItem.call(this, key);
      if (this === window.localStorage && key.startsWith(LOCAL_PREFIX)) schedule();
    };
    return () => {
      stopped = true;
      if (timer !== undefined) window.clearTimeout(timer);
      Storage.prototype.setItem = originalSetItem;
      Storage.prototype.removeItem = originalRemoveItem;
    };
  }, [user?.id, cloudReady]);

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    setMessage("")
    const result = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password })
    setBusy(false)
    if (result.error) setMessage(result.error.message)
    else if (mode === "signup" && !result.data.session) setMessage("สมัครแล้ว กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ")
    else setMessage("สำเร็จ")
  }

  if (!supabase) return <main className="grid min-h-screen place-items-center bg-[#F7F5EE] p-5"><section className="max-w-lg rounded-3xl bg-white p-7 shadow-sm"><h1 className="text-xl font-semibold text-[#263329]">ยังไม่ได้ตั้งค่า Supabase</h1><p className="mt-3 text-sm leading-6 text-[#666D64]">ต้องตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_PUBLISHABLE_KEY ใน Render แล้ว Build ใหม่</p></section></main>
  if (checking) return <main className="grid min-h-screen place-items-center bg-[#F7F5EE] text-sm text-[#73796F]">กำลังตรวจสอบบัญชี…</main>
  if (!user) return <main className="grid min-h-screen place-items-center bg-[#F7F5EE] p-5">
    <section className="w-full max-w-md rounded-[28px] border border-[#E5E0D3] bg-[#FCFBF7] p-7 shadow-[0_20px_60px_rgba(38,51,41,0.08)] sm:p-9">
      <div className="mb-7 grid h-12 w-12 place-items-center rounded-2xl bg-[#E8EEE5] text-2xl">🐷</div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9B8450]">LAMOON · PRIVATE SPACE</p>
      <h1 className="mt-2 text-2xl font-semibold text-[#263329]">{mode === "signin" ? "ยินดีต้อนรับกลับ" : "สร้างบัญชีของคุณ"}</h1>
      <p className="mt-2 text-sm leading-6 text-[#777D73]">เข้าสู่ระบบเพื่อเก็บข้อมูลออมเงิน สุขภาพ และโน้ตไว้ในฐานข้อมูลส่วนตัวของคุณ</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-[#414A41]">อีเมล<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-[#DEDACF] bg-white px-4 outline-none focus:border-[#8A9C83]" /></label>
        <label className="block text-sm font-medium text-[#414A41]">รหัสผ่าน<input type="password" required minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-[#DEDACF] bg-white px-4 outline-none focus:border-[#8A9C83]" /></label>
        {message && <p role="status" className="text-sm leading-5 text-[#8B5B42]">{message}</p>}
        <button disabled={busy} className="h-12 w-full rounded-full bg-[#263329] text-sm font-medium text-white disabled:opacity-60">{busy ? "กำลังดำเนินการ…" : mode === "signin" ? "เข้าสู่ระบบ" : "สมัครบัญชี"}</button>
      </form>
      <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage("") }} className="mt-5 w-full text-sm text-[#55745A]">{mode === "signin" ? "ยังไม่มีบัญชี? สมัครใหม่" : "มีบัญชีแล้ว? เข้าสู่ระบบ"}</button>
    </section>
  </main>
  if (!cloudReady) return <main className="grid min-h-screen place-items-center bg-[#F7F5EE] p-5"><section className="max-w-xl rounded-3xl bg-white p-7 shadow-sm"><p className="text-sm leading-6 text-[#5F665D]">{cloudError || "กำลังโหลดข้อมูลของคุณจาก Supabase…"}</p><button onClick={() => { void supabase.auth.signOut() }} className="mt-4 rounded-full border px-4 py-2 text-sm">ออกจากระบบ</button></section></main>
  return <><div className="fixed right-4 top-4 z-[100] flex items-center gap-3 rounded-full border border-[#E5E0D3] bg-[#FCFBF7]/95 px-3 py-2 shadow-sm backdrop-blur"><span className="hidden max-w-[180px] truncate text-xs text-[#697166] sm:block">{user.email}</span><button onClick={() => { void supabase.auth.signOut() }} className="text-xs font-medium text-[#55745A]">ออกจากระบบ</button></div>{cloudError && <div role="alert" className="fixed bottom-4 left-4 right-4 z-[110] rounded-xl bg-red-50 p-3 text-sm text-red-800 shadow">{cloudError}</div>}{children}</>
}
