import { useCallback, useEffect, useState } from "react";

type LegacyPage = { id: string; label: string; hash: string; description: string };
const LEGACY_PAGES: LegacyPage[] = [
  { id: "home", label: "หน้าหลัก", hash: "", description: "ภาพรวมและการ์ดทางเข้า" },
  { id: "saving", label: "ออมเงิน", hash: "#saving", description: "รายการเงิน เป้าหมาย และสรุป" },
  { id: "health", label: "สุขภาพ", hash: "#health", description: "โปรไฟล์ น้ำหนัก และกิจกรรม" },
  { id: "notes", label: "โน้ต", hash: "#notes", description: "บันทึกและจัดการโน้ต" },
];

function pageUrl(page: LegacyPage) {
  return page.hash ? `/${page.hash}` : "/";
}

export default function LegacyPageEditor() {
  const [activePage, setActivePage] = useState("home");
  const [reloadKey, setReloadKey] = useState(0);
  const [frameReady, setFrameReady] = useState(false);
  const [frameError, setFrameError] = useState(false);
  const [showHelp, setShowHelp] = useState(true);

  const active = LEGACY_PAGES.find((page) => page.id === activePage) ?? LEGACY_PAGES[0];

  const navigate = useCallback((page: LegacyPage) => {
    setActivePage(page.id);
    setFrameReady(false);
    setFrameError(false);
    setReloadKey((value) => value + 1);
  }, []);

  const reload = useCallback(() => {
    setFrameReady(false);
    setFrameError(false);
    setReloadKey((value) => value + 1);
  }, []);

  useEffect(() => {
    if (frameReady) return;
    const timeout = window.setTimeout(() => setFrameError(true), 20000);
    return () => window.clearTimeout(timeout);
  }, [activePage, reloadKey, frameReady]);

  const openNativeEditor = useCallback(() => {
    const frame = document.querySelector<HTMLIFrameElement>(".builder-legacy-frame");
    if (!frame?.contentDocument) {
      window.alert("หน้าเว็บยังโหลดไม่เสร็จ กรุณารอให้หน้าแสดงผลก่อน");
      return;
    }
    try {
      const doc = frame.contentDocument;
      const button = doc.querySelector<HTMLButtonElement>('button[aria-label="ปรับแต่งหน้าตาและเลย์เอาต์"]');
      if (button) {
        button.click();
        setShowHelp(false);
        return;
      }
      const login = doc.querySelector<HTMLInputElement>('input[type="email"]');
      window.alert(login
        ? "ตัวอย่างเว็บยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบในหน้าที่แสดงอยู่ก่อน แล้วกดปุ่มนี้อีกครั้ง"
        : "ไม่พบปุ่มแก้ไขในหน้านี้ รอให้หน้าโหลดเสร็จและตรวจว่าคุณเข้าสู่ระบบแล้ว");
    } catch {
      window.alert("ไม่สามารถเข้าถึงหน้าเว็บตัวอย่างได้ กรุณาเปิดหน้านี้ในแท็บใหม่แล้วเข้าสู่ระบบ");
    }
  }, []);

  return <section className="builder-legacy-view">
    <header className="builder-legacy-toolbar">
      <div className="builder-legacy-heading">
        <p className="builder-eyebrow">EXISTING WEBSITE</p>
        <h2>แก้ไขหน้าเว็บเดิม</h2>
        <p className="builder-muted">เลือกหน้าเว็บด้านล่างเพื่อเปิดหน้านั้นโดยตรง แล้วใช้ตัวแก้ไขเดิมของเว็บ</p>
      </div>
      <div className="builder-legacy-actions">
        <button className="builder-quiet-button" onClick={reload}>↻ โหลดหน้าใหม่</button>
        <button className="builder-export-button" onClick={openNativeEditor} disabled={!frameReady}>เปิดตัวแก้ไขหน้าเดิม ↗</button>
        <button className="builder-quiet-button" onClick={() => window.open(pageUrl(active), "_blank", "noopener,noreferrer")}>เปิดแท็บใหม่</button>
      </div>
    </header>
    <nav className="builder-legacy-page-tabs" aria-label="เลือกหน้าเว็บเดิม">
      {LEGACY_PAGES.map((page) => <button type="button" key={page.id} aria-current={activePage === page.id ? "page" : undefined} className={activePage === page.id ? "active" : ""} onClick={() => navigate(page)}>
        <span>{page.id === "home" ? "⌂ " : page.id === "saving" ? "↗ " : page.id === "health" ? "♡ " : "▤ "}{page.label}</span><small>{page.description}</small>
      </button>)}
    </nav>
    {showHelp && <div className="builder-legacy-notice">
      <span className="builder-legacy-notice-icon">i</span>
      <div><b>วิธีแก้ไขหน้าเดิม</b><p>1) เลือกหน้าหลัก / ออมเงิน / สุขภาพ / โน้ต 2) รอหน้าโหลด 3) กด “เปิดตัวแก้ไขหน้าเดิม” เพื่อใช้เครื่องมือที่มีอยู่ในเว็บ การเปลี่ยนแปลงใช้ระบบเดิมและยังไม่ Publish ให้ผู้ใช้อื่นเห็น</p></div>
      <button type="button" aria-label="ปิดคำแนะนำ" onClick={() => setShowHelp(false)}>×</button>
    </div>}
    <div className="builder-legacy-frame-shell" aria-busy={!frameReady && !frameError}>
      {!frameReady && !frameError && <div className="builder-legacy-loading" role="status"><span className="builder-spinner" />กำลังโหลดหน้า {active.label}…</div>}
      {frameError && <div className="builder-legacy-error" role="alert"><b>โหลดหน้า {active.label} ไม่สำเร็จ</b><p>หน้าเว็บใช้เวลานานเกินไปในการตอบสนอง กรุณาลองโหลดใหม่หรือเปิดหน้านี้ในแท็บใหม่</p><button type="button" onClick={reload}>ลองอีกครั้ง</button><a href={pageUrl(active)} target="_blank" rel="noreferrer">เปิดหน้าเว็บในแท็บใหม่ ↗</a></div>}
      <iframe
        key={`${activePage}-${reloadKey}`}
        title={`ตัวอย่างหน้าเว็บเดิม: ${active.label}`}
        src={pageUrl(active)}
        onLoad={() => { setFrameReady(true); setFrameError(false); }}
        className="builder-legacy-frame"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
      />
    </div>
    <footer className="builder-legacy-footer"><span>หน้า: <b>{active.label}</b></span><span>{frameReady ? "โหลดหน้าเสร็จแล้ว" : frameError ? "เกิดปัญหาในการโหลด" : "กำลังเชื่อมต่อหน้าเว็บ"}</span></footer>
  </section>;
}
