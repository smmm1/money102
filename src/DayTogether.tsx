import { useMemo, useState } from "react"
import "./daytogether.css"
import DailyLog from "./DailyLog"

type Section = "home" | "daily" | "journal" | "health" | "finance" | "life" | "archive"
const nav: { id: Section; label: string; mobile: string; icon: string }[] = [
  { id: "home", label: "ภาพรวม", mobile: "หน้าหลัก", icon: "⌂" },
  { id: "daily", label: "บันทึกวันนี้", mobile: "บันทึก", icon: "+" },
  { id: "journal", label: "บันทึกส่วนตัว", mobile: "ไดอารี่", icon: "▤" },
  { id: "health", label: "สุขภาพ", mobile: "สุขภาพ", icon: "♡" },
  { id: "finance", label: "การเงิน", mobile: "การเงิน", icon: "◫" },
  { id: "life", label: "อาหารและชีวิต", mobile: "ไลฟ์", icon: "☕" },
  { id: "archive", label: "คลังบันทึก", mobile: "คลัง", icon: "▣" },
]
const copy: Record<Exclude<Section, "home">, { eyebrow: string; title: string; desc: string; note: string }> = {
  daily: { eyebrow: "YOUR DAILY SPACE", title: "วันนี้เป็นอย่างไรบ้าง", desc: "พื้นที่กลางสำหรับบันทึกสิ่งที่เกิดขึ้นในแต่ละวัน ไม่ว่าจะเป็นเรื่องเล็กหรือเรื่องสำคัญ", note: "ระบบบันทึกและเชื่อมโยงข้อมูลกับแต่ละหมวดจะพัฒนาในเฟสถัดไป" },
  journal: { eyebrow: "PERSONAL JOURNAL", title: "พื้นที่ของความคิด", desc: "เก็บเรื่องราว ความรู้สึก และช่วงเวลาที่อยากกลับมาอ่านอีกครั้ง", note: "หน้าบันทึกส่วนตัวกำลังเตรียมโครงสร้างสำหรับข้อความและอารมณ์ประจำวัน" },
  health: { eyebrow: "HEALTH & WELLBEING", title: "ดูแลตัวเองทีละนิด", desc: "รวมบันทึกสุขภาพ น้ำหนัก การออกกำลังกาย และความเปลี่ยนแปลงของร่างกาย", note: "แดชบอร์ดสุขภาพและประวัติข้อมูลจะเชื่อมกับ Cloudflare D1 ในเฟสถัดไป" },
  finance: { eyebrow: "PERSONAL FINANCE", title: "จัดระเบียบเรื่องเงิน", desc: "ติดตามเงินออม เป้าหมาย และค่าใช้จ่ายที่ต้องหารร่วมกัน โดยไม่ทำให้ชีวิตซับซ้อน", note: "พื้นที่เงินออมและหารค่าใช้จ่ายกำลังเตรียมระบบบันทึกจริง" },
  life: { eyebrow: "FOOD & EVERYDAY LIFE", title: "เรื่องธรรมดาที่อยากจำ", desc: "เก็บมื้ออาหาร ร้านที่เคยไป และกิจกรรมเล็ก ๆ ที่ทำให้แต่ละวันมีความหมาย", note: "รายการอาหารและกิจกรรมจะเพิ่มเข้ามาในขั้นตอนพัฒนาฟีเจอร์" },
  archive: { eyebrow: "YOUR PERSONAL ARCHIVE", title: "ทุกเรื่องราวในที่เดียว", desc: "ย้อนดูบันทึกตามวัน ค้นหาสิ่งที่เคยจด และกลับไปหาความทรงจำเดิม", note: "ปฏิทิน การค้นหา และการส่งออกข้อมูลจะพัฒนาในเฟส Archive" },
}
const dateText = () => new Intl.DateTimeFormat("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())

export default function DayTogether() {
  const [active, setActive] = useState<Section>("home")
  const [modal, setModal] = useState(false)
  const today = useMemo(dateText, [])
  const selected = nav.find(item => item.id === active)!
  return <div className="dt-app">
    <aside className="dt-sidebar">
      <button className="dt-brand" onClick={() => setActive("home")}><span className="dt-mark"><i /></span><span><b>daytogether</b><small>your life, gently kept</small></span></button>
      <div className="dt-side-label">พื้นที่ของคุณ</div>
      <nav className="dt-nav" aria-label="เมนูหลัก">{nav.map(item => <button key={item.id} onClick={() => setActive(item.id)} className={active === item.id ? "active" : ""}><span className="dt-nav-icon">{item.icon}</span>{item.label}{item.id === "daily" && <i className="dt-dot" />}</button>)}</nav>
      <div className="dt-sidebar-bottom"><div className="dt-note"><span>✳</span><p>ไม่ต้องทำทุกอย่างให้สมบูรณ์แบบ<br /><b>แค่ค่อย ๆ ใช้ชีวิตในแบบของเรา</b></p></div><small>DAYTOGETHER · PERSONAL SPACE</small></div>
    </aside>
    <div className="dt-main">
      <header className="dt-topbar"><div className="dt-mobile-brand"><span className="dt-mark"><i /></span><b>daytogether</b></div><div className="dt-crumb">พื้นที่ส่วนตัว <span>/</span> <b>{selected.label}</b></div><div className="dt-actions"><button aria-label="ค้นหาบันทึก" onClick={() => setActive("archive")}>⌕</button><button aria-label="การแจ้งเตือน">♧</button><span className="dt-avatar">D</span></div></header>
      <main className="dt-content">
        {active === "home" ? <>
          <section className="dt-hero"><div className="dt-hero-copy"><span className="dt-eyebrow">A LITTLE SPACE FOR YOUR EVERYDAY</span><h1>ค่อย ๆ ใช้ชีวิต<br /><em>ในจังหวะของเรา</em></h1><p>พื้นที่เล็ก ๆ สำหรับเก็บเรื่องราว ดูแลตัวเอง และจัดระเบียบชีวิตในแบบที่เป็นคุณ</p><div className="dt-date">▦ &nbsp;{today}</div></div><div className="dt-landscape"><div className="dt-sun" /><div className="dt-hill hill-a" /><div className="dt-hill hill-b" /><div className="dt-plant">✳</div><span>take it<br />one day at a time</span></div></section>
          <section className="dt-heading"><div><span className="dt-eyebrow">START WITH TODAY</span><h2>วันนี้อยากบันทึกอะไร?</h2></div><button onClick={() => setActive("daily")}>ไปที่บันทึกวันนี้&nbsp; →</button></section>
          <section className="dt-shortcuts">
            <button className="dt-shortcut featured" onClick={() => { setActive("daily"); setModal(true) }}><i>＋</i><b>บันทึกเรื่องราว</b><small>สิ่งที่เกิดขึ้นในวันนี้</small><span>↗</span></button>
            <button className="dt-shortcut" onClick={() => setActive("journal")}><i className="lav">▤</i><b>เขียนความรู้สึก</b><small>เก็บความคิดของตัวเอง</small><span>↗</span></button>
            <button className="dt-shortcut" onClick={() => setActive("health")}><i className="terra">♡</i><b>ดูแลสุขภาพ</b><small>บันทึกการดูแลตัวเอง</small><span>↗</span></button>
            <button className="dt-shortcut" onClick={() => setActive("finance")}><i className="gold">◫</i><b>จัดการเรื่องเงิน</b><small>ออมเงินและหารค่าใช้จ่าย</small><span>↗</span></button>
          </section>
          <section className="dt-lower"><div className="dt-panel"><div className="dt-panel-head"><div><span className="dt-eyebrow">YOUR DAY</span><h3>พื้นที่ของวันนี้</h3></div><small>TODAY</small></div><div className="dt-empty"><i>▤</i><b>วันใหม่ที่ยังว่างอยู่</b><p>เริ่มต้นด้วยบันทึกสั้น ๆ สักเรื่องก็ได้นะ</p><button onClick={() => setActive("daily")}>เริ่มบันทึก&nbsp; →</button></div></div><div className="dt-panel reminder"><span className="dt-eyebrow">A GENTLE REMINDER</span><blockquote>“ทุกวันไม่จำเป็น<br />ต้องเป็นวันที่ดีที่สุด<br />แค่เป็นวันที่เราได้อยู่กับตัวเอง”</blockquote><small>— &nbsp; LITTLE BY LITTLE</small></div></section>
          <div className="dt-footer-note">✳ &nbsp; ชีวิตไม่ใช่รายการที่ต้องทำให้ครบ แต่เป็นเรื่องราวที่ค่อย ๆ เติบโต &nbsp; ✳</div>
        </> : <section className="dt-inner">
          <div className="dt-inner-meta"><span className="dt-eyebrow">{copy[active].eyebrow}</span><small>{today}</small></div><h1>{copy[active].title}</h1><p className="dt-inner-desc">{copy[active].desc}</p>
          {active === "daily" && <DailyLog />}
          {active !== "daily" && <div className="dt-coming"><i>✳</i><div><b>พื้นที่นี้กำลังจัดเตรียม</b><p>{copy[active].note}</p></div><small>COMING SOON</small></div>}
          {active !== "daily" && <button className="dt-back" onClick={() => setActive("home")}>← กลับสู่ภาพรวม</button>}
        </section>}
      </main>
    </div>
    <nav className="dt-mobile-nav">{nav.filter(item => ["home","daily","journal","health","finance"].includes(item.id)).map(item => <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => setActive(item.id)}><i>{item.icon}</i><small>{item.mobile}</small></button>)}</nav>
    {modal && <div className="dt-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setModal(false) }}><section className="dt-dialog" role="dialog" aria-modal="true"><button className="dt-close" onClick={() => setModal(false)} aria-label="ปิด">×</button><span className="dt-eyebrow">A NOTE FOR TODAY</span><h2>เริ่มบันทึกเรื่องราว</h2><p>หน้าบันทึกจริงพร้อมระบบบันทึกลง Cloudflare D1 จะพัฒนาในเฟส 2</p><div className="dt-dialog-note">✳ &nbsp; บันทึกหนึ่งครั้ง แล้วเชื่อมไปยังหมวดที่เกี่ยวข้องได้</div><button className="dt-confirm" onClick={() => setModal(false)}>เข้าใจแล้ว</button></section></div>}
  </div>
}
