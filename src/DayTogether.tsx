import { useMemo, useState } from "react"
import "./daytogether.css"
import DailyLog from "./DailyLog"
import Journal from "./Journal"
import Health from "./Health"
import Finance from "./Finance"
import FoodLife from "./FoodLife"
import Archive from "./Archive"
import HomeOverview from "./HomeOverview"
import { useAuth } from "./CloudAuth"

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
  life: { eyebrow: "FOOD & EVERYDAY LIFE", title: "เรื่องธรรมดาที่อยากจำ", desc: "เก็บมื้ออาหาร ร้านที่เคยไป และกิจกรรมเล็ก ๆ ที่ทำให้แต่ละวันมีความหมาย", note: "บันทึกมื้ออาหาร ร้าน และกิจกรรมของคุณ" },
  archive: { eyebrow: "YOUR PERSONAL ARCHIVE", title: "ทุกเรื่องราวในที่เดียว", desc: "ย้อนดูบันทึกตามวัน ค้นหาสิ่งที่เคยจด และกลับไปหาความทรงจำเดิม", note: "ค้นหาและย้อนดูเรื่องราวจากทุกหมวดได้ในคลังบันทึก" },
}
const dateText = () => new Intl.DateTimeFormat("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())

export default function DayTogether() {
  const [active, setActive] = useState<Section>("home")
  const [accountOpen, setAccountOpen] = useState(false)
  const { user, signOut } = useAuth()
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
      <header className="dt-topbar"><div className="dt-mobile-brand"><span className="dt-mark"><i /></span><b>daytogether</b></div><div className="dt-crumb">พื้นที่ส่วนตัว <span>/</span> <b>{selected.label}</b></div><div className="dt-actions"><button aria-label="ค้นหาบันทึก" onClick={() => setActive("archive")}>⌕</button><div className="dt-account"><button className="dt-avatar" aria-label="บัญชีผู้ใช้" aria-expanded={accountOpen} onClick={() => setAccountOpen(v => !v)}>{(user.email[0]||"D").toUpperCase()}</button>{accountOpen&&<div className="dt-account-menu"><b>{user.email}</b><button onClick={() => void signOut()}>ออกจากระบบ</button></div>}</div></div></header>
      <main className="dt-content">
        {active === "home" ? <>
          <section className="dt-hero"><div className="dt-hero-copy"><span className="dt-eyebrow">A LITTLE SPACE FOR YOUR EVERYDAY</span><h1>ค่อย ๆ ใช้ชีวิต<br /><em>ในจังหวะของเรา</em></h1><p>พื้นที่เล็ก ๆ สำหรับเก็บเรื่องราว ดูแลตัวเอง และจัดระเบียบชีวิตในแบบที่เป็นคุณ</p><div className="dt-date">▦ &nbsp;{today}</div></div><div className="dt-landscape"><div className="dt-sun" /><div className="dt-hill hill-a" /><div className="dt-hill hill-b" /><div className="dt-plant">✳</div><span>take it<br />one day at a time</span></div></section>
          <section className="dt-heading"><div><span className="dt-eyebrow">START WITH TODAY</span><h2>วันนี้อยากบันทึกอะไร?</h2></div><button onClick={() => setActive("daily")}>ไปที่บันทึกวันนี้&nbsp; →</button></section>
          <section className="dt-shortcuts">
            <button className="dt-shortcut featured" onClick={() => setActive("daily")}><i>＋</i><b>บันทึกเรื่องราว</b><small>สิ่งที่เกิดขึ้นในวันนี้</small><span>↗</span></button>
            <button className="dt-shortcut" onClick={() => setActive("journal")}><i className="lav">▤</i><b>เขียนความรู้สึก</b><small>เก็บความคิดของตัวเอง</small><span>↗</span></button>
            <button className="dt-shortcut" onClick={() => setActive("health")}><i className="terra">♡</i><b>ดูแลสุขภาพ</b><small>บันทึกการดูแลตัวเอง</small><span>↗</span></button>
            <button className="dt-shortcut" onClick={() => setActive("finance")}><i className="gold">◫</i><b>จัดการเรื่องเงิน</b><small>ออมเงินและหารค่าใช้จ่าย</small><span>↗</span></button>
          </section>
          <HomeOverview onOpen={section => setActive(section)} />
          <div className="dt-footer-note">✳ &nbsp; ชีวิตไม่ใช่รายการที่ต้องทำให้ครบ แต่เป็นเรื่องราวที่ค่อย ๆ เติบโต &nbsp; ✳</div>
        </> : <section className="dt-inner">
          <div className="dt-inner-meta"><span className="dt-eyebrow">{copy[active].eyebrow}</span><small>{today}</small></div><h1>{copy[active].title}</h1><p className="dt-inner-desc">{copy[active].desc}</p>
          {active === "daily" && <DailyLog />}
          {active === "journal" && <Journal />}
          {active === "health" && <Health />}
          {active === "finance" && <Finance />}
          {active === "life" && <FoodLife />}
          {active === "archive" && <Archive />}
          {!["daily","journal","health","finance","life","archive"].includes(active) && <div className="dt-coming"><i>✳</i><div><b>พื้นที่นี้กำลังจัดเตรียม</b><p>{copy[active].note}</p></div><small>COMING SOON</small></div>}
          {!["daily","journal","health","finance","life"].includes(active) && <button className="dt-back" onClick={() => setActive("home")}>← กลับสู่ภาพรวม</button>}
        </section>}
      </main>
    </div>
    <nav className="dt-mobile-nav">{nav.map(item => <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => setActive(item.id)}><i>{item.icon}</i><small>{item.mobile}</small></button>)}</nav>

  </div>
}
