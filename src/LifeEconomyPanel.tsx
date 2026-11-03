import { useState } from "react"
import {
  buyAsset, buyLotteryTickets, drawLottery, financialChoices, netWorth, repayDebt, sellAsset,
  type LifeEconomy,
} from "./lifeEconomy"

type Props = { economy: LifeEconomy; year: number; onChange: (next: LifeEconomy) => void; disabled?: boolean }
const money = (n: number) => new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n)

export default function LifeEconomyPanel({ economy, year, onChange, disabled = false }: Props) {
  const [amount, setAmount] = useState("500")
  const [assetId, setAssetId] = useState("SET50")
  const [tickets, setTickets] = useState("1")
  const [notice, setNotice] = useState("")
  const availableAssets = economy.assets.filter(a => a.kind === "thai-stock" ? year >= 1975 : year >= 2009)
  const selectedAssetId = availableAssets.some(a => a.id === assetId) ? assetId : (availableAssets[0]?.id ?? assetId)
  const selected = availableAssets.find(a => a.id === selectedAssetId)
  const holding = economy.holdings.find(h => h.assetId === selectedAssetId)
  const apply = (result: { economy: LifeEconomy; ok: boolean; message: string }) => {
    setNotice(result.message)
    if (result.ok) onChange(result.economy)
  }
  return <section className="life-economy">
    <div className="life-section-head"><div><span className="life-eyebrow">HOUSEHOLD FINANCE · พ.ศ. {year + 543}</span><h2>การเงินและโอกาสลงทุน</h2></div><small>ตลาดและผลตอบแทนเป็นแบบจำลองเพื่อความบันเทิง</small></div>
    <div className="life-economy-summary">
      <article><span>เงินสด</span><b>{money(economy.cash)} ฿</b></article>
      <article><span>หนี้คงเหลือ</span><b>{money(economy.debt)} ฿</b></article>
      <article><span>มูลค่าทรัพย์สินสุทธิ</span><b>{money(netWorth(economy))} ฿</b></article>
      <article><span>รายรับ / รายจ่ายต่อเดือน</span><b>{money(economy.monthlyIncome)} / {money(economy.monthlyExpenses)} ฿</b></article>
    </div>
    <div className="life-economy-grid">
      <article><span className="life-eyebrow">LOTTERY · สลากกินแบ่ง</span><h3>ลุ้นโชค</h3>{year < 1939 ? <p>ระบบสลากกินแบ่งรัฐบาลยังไม่เปิดในยุคนี้</p> : <><p>ซื้อสลากมีโอกาสเสียเงินทั้งหมด รางวัลใหญ่มีโอกาสเกิดต่ำมาก ไม่ใช่วิธีสร้างรายได้ที่เชื่อถือได้</p><label>จำนวนใบ <input type="number" min="1" max="20" value={tickets} onChange={e => setTickets(e.target.value)} /></label><button disabled={disabled} onClick={() => apply(buyLotteryTickets(economy, Number(tickets)))}>ซื้อสลาก · ใบละ 80 บาท</button><button className="life-secondary" disabled={disabled || economy.lotteryTickets === 0} onClick={() => apply(drawLottery(economy, year * 100 + economy.lastSimulatedMonth + economy.lotteryTickets))}>ออกรางวัล ({economy.lotteryTickets} ใบ)</button><small>ใช้ไป {money(economy.totalLotterySpent)} ฿ · ถูกรางวัลรวม {money(economy.totalLotteryWon)} ฿</small></>}</article>
      <article><span className="life-eyebrow">THAI STOCKS & CRYPTO</span><h3>ลงทุน / ซื้อขาย</h3><p>ราคาจำลองผันผวนตามวัฏจักรและความเสี่ยง สินทรัพย์อาจขาดทุนหนักได้</p>{availableAssets.length === 0 ? <p>ตลาดหุ้นไทยในเกมจะเปิดหลัง พ.ศ. 2518 และตลาดคริปโตหลัง พ.ศ. 2552</p> : <><label>สินทรัพย์ <select value={selectedAssetId} onChange={e => setAssetId(e.target.value)}>{availableAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label><b className="life-economy-price">{money(selected?.price ?? 0)} ฿ / หน่วย</b><label>จำนวนเงิน (บาท) <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} /></label><div className="life-economy-actions"><button disabled={disabled} onClick={() => apply(buyAsset(economy, selectedAssetId, Number(amount)))}>ซื้อ</button><button className="life-secondary" disabled={disabled || !holding} onClick={() => apply(sellAsset(economy, selectedAssetId, Math.min(holding?.units ?? 0, Number(amount) / (selected?.price ?? 1))))}>ขายตามมูลค่าเงินที่กรอก</button></div><small>ถือครอง {holding ? holding.units.toFixed(6) : "0"} หน่วย · ต้นทุนเฉลี่ย {money(holding?.averageCost ?? 0)} ฿</small></>}</article>
      <article><span className="life-eyebrow">DEBT MANAGEMENT</span><h3>จัดการหนี้</h3><p>หนี้มีดอกเบี้ยสะสม การกู้ช่วยสภาพคล่องแต่ลดเงินเหลือใช้ในอนาคต</p><label>ยอดชำระ (บาท) <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} /></label><button disabled={disabled || economy.debt <= 0} onClick={() => apply(repayDebt(economy, Number(amount)))}>ชำระหนี้</button><small>อัตราดอกเบี้ยจำลอง {(economy.debtRate * 100).toFixed(1)}% ต่อปี · ความรู้การเงิน {economy.financialKnowledge}/100</small></article>
    </div>
    <p className="life-economy-note">{notice || "วางแผนเงินสำรองก่อนลงทุน และอย่าใช้เงินกู้หรือเงินจำเป็นไปเสี่ยง"}</p>
    <details><summary>โอกาสทางการเงินในเกม</summary><ul>{financialChoices(economy).map(item => <li key={item.id}><b>{item.label}</b> — {item.description}</li>)}</ul></details>
    <div className="life-economy-ledger"><h3>รายการล่าสุด</h3>{economy.ledger.slice(0,8).map((entry, i) => <div key={i}><span>{entry.label}</span><b>{entry.amount >= 0 ? "+" : ""}{money(entry.amount)} ฿</b></div>)}</div>
  </section>
}
