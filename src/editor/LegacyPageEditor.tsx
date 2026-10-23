import { useCallback, useRef, useState } from "react";

type LegacyPage = { id: string; label: string; hash: string; description: string };
const LEGACY_PAGES: LegacyPage[] = [
  { id: "home", label: "หน้าหลัก", hash: "", description: "ภาพรวมและการ์ดทางเข้า" },
  { id: "saving", label: "ออมเงิน", hash: "#saving", description: "รายการเงิน เป้าหมาย และสรุป" },
  { id: "health", label: "สุขภาพ", hash: "#health", description: "โปรไฟล์ น้ำหนัก และกิจกรรม" },
  { id: "notes", label: "โน้ต", hash: "#notes", description: "บันทึกและจัดการโน้ต" },
];

export default function LegacyPageEditor() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [activePage, setActivePage] = useState("home");
  const [frameReady, setFrameReady] = useState(false);
  const [showHelp, setShowHelp] = useState(true);

  const navigate = useCallback((page: LegacyPage) => {
    setActivePage(page.id);
    setFrameReady(false);
    const frame = frameRef.current;
    if (!frame) return;
    try {
      const target = new URL("/", window.location.origin);
      target.hash = page.hash.replace(/^#/, "");
      frame.contentWindow?.location.assign(target.toString());
    } catch {
      frame.src = `/${page.hash}`;
    }
  }, []);

  const openNativeEditor = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    try {
      const doc = frame.contentDocument;
      const button = doc?.querySelector<HTMLButtonElement>('button[aria-label="ปรับแต่งหน้าตาและเลย์เอาต์"]');
      if (button) {
        button.click();
        setShowHelp(false);
        return;
      }
      const hasLogin = Boolean(doc?.querySelector('input[type="email"]'));
      window.alert(hasLogin
        ? "หน้านี้ยังไม่ได้เข้าสู่ระบบในตัวอย่างเว็บ กรุณาเข้าสู่ระบบในหน้าที่แสดงอยู่ก่อน แล้วกดปุ่มนี้อีกครั้ง"
        : "ยังไม่พบตัวแก้ไขของหน้าเว็บ รอให้หน้าโหลดเสร็จแล้วลองอีกครั้ง");
    } catch {
      window.alert("ไม่สามารถเชื่อมต่อกับหน้าเว็บตัวอย่างได้ กรุณาเปิดตัวอย่างในแท็บใหม่");
    }
  }, []);

  const active = LEGACY_PAGES.find((page) => page.id === activePage) ?? LEGACY_PAGES[0];

  return <section className="builder-legacy-view">
    <header className="builder-legacy-toolbar">
      <div className="builder-legacy-heading">
        <p className="builder-eyebrow">EXISTING WEBSITE</p>
        <h2>แก้ไขหน้าเว็บเดิม</h2>
        <p className="builder-muted">เปิดหน้าเดิมในสภาพแวดล้อมจริง ไม่สร้างสำเนาหรือแก้ข้อมูลธุรกิจ</p>
      </div>
      <div className="builder-legacy-actions">
        <button className="builder-quiet-button" onClick={() => { setFrameReady(false); if (frameRef.current) frameRef.current.src = `/${active.hash}`; }}>↻ โหลดใหม่</button>
        <button className="builder-export-button" onClick={openNativeEditor}>เปิดตัวแก้ไขหน้าเดิม ↗</button>
        <button className="builder-quiet-button" onClick={() => window.open(`/${active.hash}`, "_blank", "noopener,noreferrer")}>เปิดแท็บใหม่</button>
      </div>
    </header>
    <nav className="builder-legacy-page-tabs" aria-label="เลือกหน้าเว็บเดิม">
      {LEGACY_PAGES.map((page) => <button key={page.id} className={activePage === page.id ? "active" : ""} onClick={() => navigate(page)}>
        <span>{page.label}</span><small>{page.description}</small>
      </button>)}
    </nav>
    {showHelp && <div className="builder-legacy-notice">
      <span className="builder-legacy-notice-icon">i</span>
      <div><b>โหมดแก้หน้าเดิม</b><p>ตัวอย่างด้านล่างเป็นหน้าเว็บจริงของแอป เมื่อโหลดเสร็จ กด “เปิดตัวแก้ไขหน้าเดิม” เพื่อใช้เครื่องมือที่มีอยู่แล้วสำหรับข้อความ รูปแบบตัวอักษร และตำแหน่งองค์ประกอบ การแก้ไขนี้ยังเป็นค่าที่เก็บในเบราว์เซอร์และไม่ Publish ให้ผู้ใช้อื่นเห็น</p></div>
      <button aria-label="ปิดคำแนะนำ" onClick={() => setShowHelp(false)}>×</button>
    </div>}
    <div className="builder-legacy-frame-shell">
      {!frameReady && <div className="builder-legacy-loading"><span className="builder-spinner" />กำลังโหลดหน้า {active.label}…</div>}
      <iframe
        ref={frameRef}
        title={`ตัวอย่างหน้าเว็บเดิม: ${active.label}`}
        src={`/${active.hash}`}
        onLoad={() => setFrameReady(true)}
        className="builder-legacy-frame"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
      />
    </div>
    <footer className="builder-legacy-footer"><span>หน้า: <b>{active.label}</b></span><span>การเปลี่ยนแปลงใช้ระบบตัวแก้ไขเดิมของเว็บ</span></footer>
  </section>;
}
