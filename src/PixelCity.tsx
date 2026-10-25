import { useEffect, useRef } from "react"
import Phaser from "phaser"

type PixelResident = {
  id: string
  name: string
  x: number
  y: number
  color: string
  activity?: string
}
type PixelCityProps = {
  residents: PixelResident[]
  selectedId: string
  onSelect: (id: string) => void
  hour: number
}

const WORLD_W = 1920
const WORLD_H = 1280
const TILE = 32
const BUILDING_BLOCKERS: Array<[number, number, number, number]> = [
  [172, 192, 128, 110], [322, 197, 121, 105], [532, 177, 136, 124], [682, 177, 136, 124],
  [1082, 182, 144, 119], [1252, 182, 136, 119], [1527, 192, 134, 114],
  [172, 402, 139, 119], [342, 412, 126, 106], [532, 412, 144, 119],
  [1072, 407, 136, 119], [1252, 412, 136, 109], [1507, 402, 141, 119],
  [172, 752, 132, 114], [342, 757, 124, 109], [532, 752, 141, 114],
  [1072, 752, 146, 114], [1262, 757, 131, 109], [1512, 757, 141, 114],
  [682, 1002, 141, 109], [872, 1002, 146, 109], [1082, 1002, 141, 109],
]
const COLORS: Record<string, number> = {
  coral: 0xe58b78,
  mint: 0x76bda0,
  blue: 0x78a9d6,
}

class ThaiNeighbourhoodScene extends Phaser.Scene {
  private residents: PixelResident[] = []
  private selectedId = ""
  private selectResident: (id: string) => void = () => {}
  private residentSprites = new Map<string, Phaser.GameObjects.Container>()
  private interiorLayer?: Phaser.GameObjects.Container
  private ambientOverlay?: Phaser.GameObjects.Rectangle
  private worldHour = 7

  constructor() {
    super("thai-neighbourhood")
  }

  init(data: { residents: PixelResident[]; selectedId: string; onSelect: (id: string) => void; hour: number }) {
    this.residents = data.residents
    this.selectedId = data.selectedId
    this.selectResident = data.onSelect
    this.worldHour = data.hour ?? 7
  }

  create() {
    const { width, height } = this.scale
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H)
    this.cameras.main.setZoom(Math.min(width / 1120, height / 740, 0.78))
    this.cameras.main.centerOn(WORLD_W / 2, WORLD_H / 2)
    this.drawGround()
    this.drawRoads()
    this.drawGreenery()
    this.drawNeighbourhood()
    this.drawInteriorEntrances()
    this.drawResidentSprites()
    this.drawLabels()
    this.ambientOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x18234c, 0).setScrollFactor(0).setDepth(2500)
    this.updateAmbient(this.worldHour)
    this.scale.on("resize", (size: Phaser.Structs.Size) => {
      this.cameras.main.setZoom(Math.min(size.width / 1120, size.height / 740, 0.78))
      this.cameras.main.centerOn(WORLD_W / 2, WORLD_H / 2)
      this.ambientOverlay?.setPosition(size.width / 2, size.height / 2).setSize(size.width, size.height)
    })
    let dragStart: { x: number; y: number; scrollX: number; scrollY: number } | null = null
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      if (currentlyOver.length === 0) dragStart = { x: pointer.x, y: pointer.y, scrollX: this.cameras.main.scrollX, scrollY: this.cameras.main.scrollY }
    })
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || !dragStart) return
      const camera = this.cameras.main
      camera.scrollX = dragStart.scrollX - (pointer.x - dragStart.x) / camera.zoom
      camera.scrollY = dragStart.scrollY - (pointer.y - dragStart.y) / camera.zoom
    })
    this.input.on("pointerup", () => { dragStart = null })
    this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _objects: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
      const camera = this.cameras.main
      camera.setZoom(Phaser.Math.Clamp(camera.zoom - dy * 0.0005, 0.35, 1.15))
    })
    this.events.on("update-residents", (residents: PixelResident[], selectedId: string, hour = this.worldHour) => {
      this.residents = residents
      this.selectedId = selectedId
      this.worldHour = hour
      this.updateAmbient(hour)
      this.refreshResidents()
    })
  }

  private updateAmbient(hour: number) {
    if (!this.ambientOverlay) return
    const h = ((Math.floor(hour) % 24) + 24) % 24
    let color = 0x18234c
    let alpha = 0
    if (h >= 19 || h < 5) { color = 0x17254f; alpha = 0.34 }
    else if (h >= 17) { color = 0x9d6048; alpha = 0.18 }
    else if (h < 7) { color = 0x657a9a; alpha = 0.17 }
    else if (h >= 15) { color = 0xe5a05e; alpha = 0.07 }
    this.ambientOverlay.setFillStyle(color, alpha)
  }

  private findWalkPath(startX: number, startY: number, targetX: number, targetY: number) {
    const cols = WORLD_W / TILE
    const rows = WORLD_H / TILE
    const blocked = (gx: number, gy: number) => {
      if (gx < 1 || gy < 1 || gx >= cols - 1 || gy >= rows - 1) return true
      const px = gx * TILE + TILE / 2
      const py = gy * TILE + TILE / 2
      return BUILDING_BLOCKERS.some(([x, y, w, h]) => px >= x - 4 && px <= x + w + 4 && py >= y - 4 && py <= y + h + 4)
    }
    const nearestOpen = (x: number, y: number) => {
      let gx = Phaser.Math.Clamp(Math.floor(x / TILE), 1, cols - 2)
      let gy = Phaser.Math.Clamp(Math.floor(y / TILE), 1, rows - 2)
      if (!blocked(gx, gy)) return { gx, gy }
      for (let radius = 1; radius < 8; radius++) {
        for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue
          if (!blocked(gx + dx, gy + dy)) return { gx: gx + dx, gy: gy + dy }
        }
      }
      return { gx, gy }
    }
    const start = nearestOpen(startX, startY)
    const goal = nearestOpen(targetX, targetY)
    const startIndex = start.gy * cols + start.gx
    const goalIndex = goal.gy * cols + goal.gx
    const parent = new Int32Array(cols * rows).fill(-2)
    const queue = new Int32Array(cols * rows)
    let head = 0, tail = 0
    queue[tail++] = startIndex
    parent[startIndex] = -1
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    while (head < tail && parent[goalIndex] === -2) {
      const current = queue[head++]
      const cx = current % cols, cy = Math.floor(current / cols)
      for (const [dx, dy] of directions) {
        const nx = cx + dx, ny = cy + dy
        if (blocked(nx, ny)) continue
        const next = ny * cols + nx
        if (parent[next] !== -2) continue
        parent[next] = current
        queue[tail++] = next
      }
    }
    if (parent[goalIndex] === -2) return [{ x: targetX, y: targetY }]
    const path: Array<{ x: number; y: number }> = []
    for (let at = goalIndex; at !== -1; at = parent[at]) path.push({ x: (at % cols) * TILE + TILE / 2, y: Math.floor(at / cols) * TILE + TILE / 2 })
    path.reverse()
    path[path.length - 1] = { x: targetX, y: targetY }
    return path
  }

  private animateAlongPath(group: Phaser.GameObjects.Container, path: Array<{ x: number; y: number }>, index = 0) {
    if (!group.active) return
    const legs = group.getData("legs") as Phaser.GameObjects.Rectangle | undefined
    if (index === 0 && legs) {
      const previous = group.getData("walkTween") as Phaser.Tweens.Tween | undefined
      previous?.stop()
      const walkTween = this.tweens.add({ targets: legs, angle: { from: -10, to: 10 }, duration: 105, yoyo: true, repeat: -1, ease: "Linear" })
      group.setData("walkTween", walkTween)
    }
    if (index >= path.length) {
      const walkTween = group.getData("walkTween") as Phaser.Tweens.Tween | undefined
      walkTween?.stop()
      group.setData("walkTween", undefined)
      if (legs) legs.setAngle(0)
      return
    }
    const point = path[index]
    this.tweens.add({
      targets: group, x: point.x, y: point.y, duration: 90, ease: "Linear",
      onComplete: () => this.animateAlongPath(group, path, index + 1),
    })
  }

  private drawGround() {
    const g = this.add.graphics()
    g.fillStyle(0x9fbd86, 1).fillRect(0, 0, WORLD_W, WORLD_H)
    // Pixel-sized grass flecks make the base read as a hand-built tilemap.
    for (let y = 8; y < WORLD_H; y += 24) {
      for (let x = 7 + ((y / 24) % 2) * 11; x < WORLD_W; x += 37) {
        const shade = ((x * 7 + y * 3) % 5) === 0 ? 0x88aa76 : 0xb1c991
        g.fillStyle(shade, 0.8).fillRect(x, y, 3, 3)
      }
    }
    g.fillStyle(0xe1d6b5, 1).fillRect(96, 96, 1728, 1088)
    g.fillStyle(0xd7c99f, 1).fillRect(112, 112, 1696, 1056)
    g.fillStyle(0x9fbd86, 1).fillRect(128, 128, 1664, 1024)
    // Garden plots and small community green.
    g.fillStyle(0x7ea96f, 1).fillRect(1450, 760, 260, 250)
    g.fillStyle(0xc3d59a, 1).fillRect(1470, 780, 220, 210)
    g.fillStyle(0x79a5ae, 1).fillRect(210, 850, 180, 112)
    g.fillStyle(0x91c1c0, 1).fillRect(220, 860, 160, 92)
    g.fillStyle(0xd4e3c0, 1).fillRect(232, 871, 17, 5).fillRect(300, 908, 23, 5).fillRect(352, 883, 11, 5)
    g.destroy()
  }

  private drawRoads() {
    const g = this.add.graphics()
    const road = (x: number, y: number, w: number, h: number) => {
      g.fillStyle(0x9e9b8a, 1).fillRect(x, y, w, h)
      g.fillStyle(0xe1d7b7, 1).fillRect(x, y, w, 6).fillRect(x, y + h - 6, w, 6)
      g.fillStyle(0xf1e8ca, 0.8)
      if (w > h) for (let dx = x + 18; dx < x + w - 18; dx += 48) g.fillRect(dx, y + h / 2 - 2, 23, 4)
      else for (let dy = y + 18; dy < y + h - 18; dy += 48) g.fillRect(x + w / 2 - 2, dy, 4, 23)
    }
    road(0, 600, WORLD_W, 84)
    road(930, 0, 88, WORLD_H)
    road(128, 300, 1664, 54)
    road(128, 920, 1664, 54)
    road(420, 128, 54, 1024)
    road(1430, 128, 54, 1024)
    // Alleys are intentionally narrower than the main roads.
    g.fillStyle(0xbab39c, 1).fillRect(620, 354, 18, 246).fillRect(1220, 684, 18, 236).fillRect(1018, 740, 210, 18).fillRect(474, 760, 240, 18)
    g.fillStyle(0xd9d0b8, 1).fillRect(620, 354, 18, 246).fillRect(1220, 684, 18, 236)
    g.destroy()
  }

  private drawGreenery() {
    const spots = [
      [170, 180], [255, 410], [355, 510], [530, 210], [720, 420], [800, 1040],
      [1110, 200], [1280, 430], [1600, 210], [1710, 450], [1650, 1070], [1340, 1070],
      [270, 1060], [540, 1060], [810, 820], [1150, 1080], [1730, 820], [800, 480],
    ]
    for (const [x, y] of spots) this.drawTree(x, y)
    for (let i = 0; i < 22; i++) {
      const x = 170 + (i * 73) % 1550
      const y = 170 + (i * 131) % 940
      this.add.rectangle(x, y, 5, 5, i % 3 === 0 ? 0xf0c77d : 0xf0d9b5).setDepth(y)
    }
  }

  private drawTree(x: number, y: number) {
    const g = this.add.graphics().setDepth(y)
    g.fillStyle(0x7d6449, 1).fillRect(x + 10, y + 16, 8, 16)
    g.fillStyle(0x477b51, 1).fillRect(x, y + 5, 28, 19)
    g.fillStyle(0x5d965e, 1).fillRect(x + 4, y, 22, 18)
    g.fillStyle(0x7eaf6c, 1).fillRect(x + 9, y + 3, 7, 5)
    g.fillStyle(0x3d7049, 1).fillRect(x + 2, y + 19, 8, 5)
    g.destroy()
  }

  private building(x: number, y: number, w: number, h: number, wall: number, roof: number, name: string, sign: string) {
    const g = this.add.graphics().setDepth(y + h)
    g.fillStyle(0x52604d, 0.18).fillRect(x + 9, y + h - 1, w, 15)
    g.fillStyle(0xe5d9bd, 1).fillRect(x - 7, y + h - 12, w + 14, 13)
    g.fillStyle(wall, 1).fillRect(x, y + 18, w, h - 18)
    g.fillStyle(roof, 1).fillRect(x - 8, y, w + 16, 25)
    g.fillStyle(0xffffff, 0.25).fillRect(x, y + 19, w, 4)
    g.fillStyle(0x9a6d51, 1).fillRect(x + w / 2 - 10, y + h - 34, 20, 34)
    g.fillStyle(0x83b5bc, 1).fillRect(x + 12, y + 35, 19, 17).fillRect(x + w - 31, y + 35, 19, 17)
    g.fillStyle(0xe9d4a3, 1).fillRect(x + 13, y + 36, 17, 3).fillRect(x + w - 30, y + 36, 17, 3)
    g.fillStyle(0x3d5542, 1).fillRect(x + 4, y + h - 14, w - 8, 5)
    g.destroy()
    const label = this.add.text(x + w / 2, y + h + 8, name, {
      fontFamily: "Tahoma, sans-serif", fontSize: "13px", color: "#334c39",
      backgroundColor: "#f8f0d8", padding: { x: 6, y: 3 }, align: "center",
    }).setOrigin(0.5, 0).setDepth(y + h + 20)
    const signText = this.add.text(x + w / 2, y + 29, sign, {
      fontFamily: "Tahoma, sans-serif", fontSize: "11px", fontStyle: "bold",
      color: "#fff7dc", backgroundColor: "#8e4d42", padding: { x: 5, y: 3 },
    }).setOrigin(0.5, 0).setDepth(y + h + 21)
    return { label, signText }
  }

  private drawNeighbourhood() {
    const buildings = [
      [180, 200, 112, 96, 0xf0d4ad, 0xb9604f, "ร้านข้าวแกง", "ข้าวแกงป้า"],
      [330, 205, 105, 91, 0xe4c9a2, 0x587e63, "ร้านชำ", "ของชุมชน"],
      [540, 185, 120, 110, 0xd7c2a5, 0x9d554b, "ห้องเช่า A", "บ้านพลอย"],
      [690, 185, 120, 110, 0xe4d6b6, 0x668b70, "หอพักนักศึกษา", "หอฟ้า"],
      [1090, 190, 128, 105, 0xe7d3b0, 0x507d78, "คลินิกชุมชน", "สุขภาพดี"],
      [1260, 190, 120, 105, 0xe3c4a2, 0xc17b54, "ร้านซ่อมมือถือ", "เจ โมบาย"],
      [1535, 200, 118, 100, 0xe5d1aa, 0x78649b, "ร้านกาแฟ", "Slow Day"],
      [180, 410, 125, 105, 0xe5d3b5, 0x9a574b, "บ้านลุงสมชาย", "บ้านสวน"],
      [350, 420, 110, 92, 0xe6d7b9, 0x8c7150, "ร้านซักผ้า", "ซักสะอาด"],
      [540, 420, 128, 105, 0xdcc9ab, 0x637eab, "สำนักงาน", "บัญชี"],
      [1080, 415, 120, 105, 0xe8d5b5, 0x7e9e8d, "บ้านเมย์", "พักเวร"],
      [1260, 420, 120, 95, 0xe5d0a7, 0x9b6b4b, "ร้านอาหารตามสั่ง", "ตามสั่ง"],
      [1515, 410, 125, 105, 0xe3cfaa, 0xb45e4d, "ตลาดสด", "ตลาดเช้า"],
      [180, 760, 118, 100, 0xe5d4b7, 0x657e9a, "ห้องเช่า B", "บ้านนนท์"],
      [350, 765, 110, 95, 0xe8d9bc, 0xb56b4e, "ร้านยา", "เภสัชกร"],
      [540, 760, 125, 100, 0xdac8a8, 0x6a9873, "ห้องสมุด", "อ่านเพลิน"],
      [1080, 760, 130, 100, 0xe6d4b2, 0x9d5e50, "ศาลาชุมชน", "พบปะกัน"],
      [1270, 765, 115, 95, 0xe2d0af, 0x658b9c, "ป้ายรถเมล์", "รถสองแถว"],
      [1520, 765, 125, 100, 0xe4d2b2, 0x5b8466, "สวนสาธารณะ", "สวนชุมชน"],
      [690, 1010, 125, 95, 0xe6d2af, 0xb85f4b, "ร้านหมูกระทะ", "ย่างกัน"],
      [880, 1010, 130, 95, 0xe4d2b3, 0x6d8a9c, "สถานีรถ", "ไปต่อเมือง"],
      [1090, 1010, 125, 95, 0xe2d0ae, 0x8b6a99, "วัดชุมชน", "วัดร่มเย็น"],
    ] as const
    buildings.forEach(([x, y, w, h, wall, roof, name, sign]) => this.building(x, y, w, h, wall, roof, name, sign))
    // Temple roof and golden stupa make the neighbourhood distinctly Thai.
    const temple = this.add.graphics().setDepth(1110)
    temple.fillStyle(0xc29a43, 1).fillRect(1144, 1068, 24, 37)
    temple.fillStyle(0xe3c56e, 1).fillRect(1137, 1060, 38, 8).fillRect(1149, 1051, 14, 9)
    temple.fillStyle(0xb65c4c, 1).fillRect(1120, 1025, 74, 20)
    temple.fillStyle(0xe7c77a, 1).fillRect(1127, 1030, 60, 5)
    temple.destroy()
    // Market awnings and produce stalls.
    for (let i = 0; i < 5; i++) {
      const x = 1538 + i * 24
      const y = 530 + (i % 2) * 12
      const g = this.add.graphics().setDepth(y + 25)
      g.fillStyle(i % 2 ? 0x6b9d72 : 0xc96956, 1).fillRect(x, y, 22, 16)
      g.fillStyle(0xf3e4be, 1).fillRect(x, y + 7, 22, 3)
      g.fillStyle(0x9c7751, 1).fillRect(x + 3, y + 16, 3, 15).fillRect(x + 17, y + 16, 3, 15)
      g.fillStyle(0xe7b55d, 1).fillRect(x + 3, y + 20, 6, 5).fillRect(x + 12, y + 20, 6, 5)
      g.destroy()
    }
  }


  private drawInteriorEntrances() {
    const places = [
      { x: 236, y: 258, w: 110, h: 62, name: "ร้านข้าวแกง", kind: "shop" },
      { x: 382, y: 262, w: 104, h: 58, name: "ร้านชำชุมชน", kind: "shop" },
      { x: 600, y: 246, w: 120, h: 62, name: "ห้องเช่าของพลอย", kind: "home" },
      { x: 750, y: 246, w: 120, h: 62, name: "หอพักนักศึกษา", kind: "home" },
      { x: 1150, y: 250, w: 120, h: 62, name: "คลินิกชุมชน", kind: "clinic" },
      { x: 1320, y: 252, w: 120, h: 62, name: "ร้านซ่อมมือถือ", kind: "shop" },
      { x: 1590, y: 260, w: 120, h: 60, name: "ร้านกาแฟ", kind: "cafe" },
      { x: 240, y: 468, w: 125, h: 62, name: "บ้านลุงสมชาย", kind: "home" },
      { x: 410, y: 472, w: 110, h: 58, name: "ร้านซักผ้า", kind: "shop" },
      { x: 600, y: 472, w: 125, h: 62, name: "สำนักงานบัญชี", kind: "office" },
      { x: 1140, y: 466, w: 120, h: 62, name: "บ้านเมย์", kind: "home" },
      { x: 1320, y: 470, w: 120, h: 58, name: "ร้านอาหารตามสั่ง", kind: "shop" },
      { x: 1580, y: 468, w: 125, h: 62, name: "ตลาดสด", kind: "market" },
      { x: 240, y: 808, w: 115, h: 60, name: "ห้องเช่าของนนท์", kind: "home" },
      { x: 405, y: 810, w: 105, h: 58, name: "ร้านยา", kind: "clinic" },
      { x: 600, y: 808, w: 125, h: 60, name: "ห้องสมุด", kind: "study" },
      { x: 1145, y: 808, w: 125, h: 60, name: "ศาลาชุมชน", kind: "community" },
      { x: 1328, y: 812, w: 112, h: 58, name: "สถานีรถ", kind: "transit" },
      { x: 1582, y: 812, w: 125, h: 60, name: "สวนสาธารณะ", kind: "park" },
      { x: 752, y: 1055, w: 125, h: 60, name: "ร้านหมูกระทะ", kind: "shop" },
      { x: 945, y: 1055, w: 125, h: 60, name: "สถานีรถสองแถว", kind: "transit" },
      { x: 1150, y: 1055, w: 125, h: 60, name: "วัดร่มเย็น", kind: "temple" },
    ]
    for (const place of places) {
      this.add.zone(place.x, place.y, place.w, place.h).setOrigin(0.5, 0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.showInterior(place.name, place.kind))
        .on("pointerover", () => this.game.canvas.style.cursor = "pointer")
        .on("pointerout", () => this.game.canvas.style.cursor = "default")
    }
  }

  private showInterior(name: string, kind: string) {
    this.interiorLayer?.destroy(true)
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(10000)
    this.interiorLayer = layer
    const width = this.scale.width
    const height = this.scale.height
    const panelW = Math.min(width - 36, 600)
    const panelH = Math.min(height - 36, 410)
    const x = (width - panelW) / 2
    const y = (height - panelH) / 2
    const add = (obj: Phaser.GameObjects.GameObject) => { layer.add(obj); return obj }
    add(this.add.rectangle(width / 2, height / 2, width, height, 0x24382b, 0.68).setScrollFactor(0))
    add(this.add.rectangle(width / 2 + 5, height / 2 + 7, panelW, panelH, 0x31432f, 0.28).setScrollFactor(0))
    add(this.add.rectangle(width / 2, height / 2, panelW, panelH, 0xf2e7c9).setStrokeStyle(5, 0x725c42).setScrollFactor(0))
    add(this.add.rectangle(width / 2, y + 31, panelW - 10, 52, 0x527553).setScrollFactor(0))
    add(this.add.text(x + 22, y + 16, name, { fontFamily: "Tahoma, sans-serif", fontSize: "18px", color: "#fff3d2", fontStyle: "bold" }).setScrollFactor(0))
    add(this.add.text(x + 22, y + 61, "INTERIOR VIEW · จำลองกิจกรรมภายในอาคาร", { fontFamily: "Tahoma, sans-serif", fontSize: "11px", color: "#66715b" }).setScrollFactor(0))
    const floorX = x + 24
    const floorY = y + 92
    const floorW = panelW - 48
    const floorH = panelH - 142
    add(this.add.rectangle(width / 2, floorY + floorH / 2, floorW, floorH, kind === "home" ? 0xd8bc91 : 0xd9d3b4).setStrokeStyle(2, 0xb5a37f).setScrollFactor(0))
    for (let px = floorX + 8; px < floorX + floorW - 8; px += 32) {
      add(this.add.rectangle(px, floorY + 2, 2, floorH - 4, 0xb8ad8b, 0.35).setScrollFactor(0))
    }
    const furniture = (fx: number, fy: number, fw: number, fh: number, color: number) => {
      add(this.add.rectangle(fx, fy, fw, fh, color).setStrokeStyle(3, 0x77664d).setScrollFactor(0))
      add(this.add.rectangle(fx, fy - fh / 2 + 5, fw - 8, 5, 0xf0e1bd).setScrollFactor(0))
    }
    if (kind === "home") {
      furniture(x + 100, y + 210, 112, 58, 0x9a6d50)
      furniture(x + panelW - 100, y + 200, 84, 92, 0x7b9c83)
      add(this.add.rectangle(x + panelW / 2, y + panelH - 82, 76, 38, 0x6b8f9b).setStrokeStyle(3, 0x536e72).setScrollFactor(0))
      add(this.add.text(x + panelW / 2, y + panelH - 90, "เตียง / พักผ่อน", { fontFamily: "Tahoma", fontSize: "11px", color: "#fff8df" }).setOrigin(0.5).setScrollFactor(0))
    } else if (kind === "market" || kind === "shop" || kind === "cafe") {
      furniture(x + 105, y + 190, 140, 42, 0xa86648)
      furniture(x + panelW - 112, y + 190, 100, 62, 0x759a6a)
      for (let i = 0; i < 5; i++) add(this.add.rectangle(x + 68 + i * 25, y + 178, 12, 12, [0xd36c52,0xe4b44f,0x78a66e][i % 3]).setScrollFactor(0))
      add(this.add.text(x + panelW / 2, y + panelH - 73, "เคาน์เตอร์ · วัตถุดิบ · พื้นที่ทำงาน", { fontFamily: "Tahoma", fontSize: "11px", color: "#53634d" }).setOrigin(0.5).setScrollFactor(0))
    } else {
      furniture(x + 112, y + 194, 112, 50, 0x6f8b9b)
      furniture(x + panelW - 112, y + 194, 104, 50, 0x9a8b68)
      add(this.add.text(x + panelW / 2, y + panelH - 73, "พื้นที่ใช้งาน · อุปกรณ์ · จุดพัก", { fontFamily: "Tahoma", fontSize: "11px", color: "#53634d" }).setOrigin(0.5).setScrollFactor(0))
    }
    add(this.add.text(x + 22, y + panelH - 32, "ห้องจำลอง · แตะปุ่มปิดเพื่อกลับสู่เมือง", { fontFamily: "Tahoma, sans-serif", fontSize: "11px", color: "#64745a" }).setScrollFactor(0))
    const closeButton = this.add.text(x + panelW - 18, y + 17, "× ปิด", {
      fontFamily: "Tahoma, sans-serif", fontSize: "14px", fontStyle: "bold", color: "#fff3d2",
      backgroundColor: "#9b5848", padding: { x: 9, y: 5 },
    }).setOrigin(1, 0).setScrollFactor(0).setInteractive({ useHandCursor: true })
    closeButton.on("pointerdown", () => { this.interiorLayer?.destroy(true); this.interiorLayer = undefined })
    layer.add(closeButton)
  }

  private drawResidentSprites() {
    this.residents.forEach((resident, index) => this.addResident(resident, index))
  }

  private addResident(resident: PixelResident, index: number) {
    const x = Math.max(150, Math.min(WORLD_W - 150, (resident.x / 100) * WORLD_W))
    const y = Math.max(150, Math.min(WORLD_H - 150, (resident.y / 100) * WORLD_H))
    const group = this.add.container(x, y).setDepth(y + 50)
    const shadow = this.add.rectangle(0, 18, 23, 7, 0x52634b, 0.25)
    const bodyColor = COLORS[resident.color] ?? 0x76bda0
    const body = this.add.rectangle(0, 5, 17, 19, bodyColor).setStrokeStyle(2, 0x3d5143)
    const head = this.add.rectangle(0, -11, 15, 14, 0xf1c6a0).setStrokeStyle(2, 0x6e5547)
    const hair = this.add.rectangle(0, -17, 16, 7, index % 2 ? 0x393b37 : 0x5b4438)
    const eyes = this.add.rectangle(-4, -11, 2, 2, 0x3a3a34).setOrigin(0.5)
    const eye2 = this.add.rectangle(4, -11, 2, 2, 0x3a3a34).setOrigin(0.5)
    const legs = this.add.rectangle(0, 17, 17, 5, 0x4b5b62)
    const outline = this.add.rectangle(0, 0, 32, 42).setStrokeStyle(2, 0xf7e4a4, 0).setFillStyle(0xffffff, 0)
    group.add([shadow, legs, body, head, hair, eyes, eye2, outline])
    group.setData("legs", legs)
    const name = this.add.text(0, 28, resident.name, {
      fontFamily: "Tahoma, sans-serif", fontSize: "12px", color: "#263b2b",
      backgroundColor: "#fff5db", padding: { x: 5, y: 3 },
    }).setOrigin(0.5, 0)
    group.add(name)
    const activity = this.add.text(0, -39, resident.activity ?? "ใช้ชีวิตประจำวัน", {
      fontFamily: "Tahoma, sans-serif", fontSize: "9px", color: "#fffaf0",
      backgroundColor: "#496c50", padding: { x: 4, y: 2 },
    }).setOrigin(0.5, 0.5)
    group.add(activity)
    group.setData("activityLabel", activity)
    group.setSize(36, 64).setInteractive(new Phaser.Geom.Rectangle(-18, -43, 36, 76), Phaser.Geom.Rectangle.Contains)
    ;(group as Phaser.GameObjects.Container & { residentId?: string }).residentId = resident.id
    group.on("pointerdown", () => this.selectResident(resident.id))
    group.setData("outline", outline)
    group.setData("residentId", resident.id)
    this.residentSprites.set(resident.id, group)
    this.paintSelection(resident.id)
    this.tweens.add({ targets: group, y: y - 2, duration: 900 + index * 80, yoyo: true, repeat: -1, ease: "Sine.inOut" })
  }

  private paintSelection(id: string) {
    for (const [residentId, group] of this.residentSprites) {
      const outline = group.getData("outline") as Phaser.GameObjects.Rectangle | undefined
      outline?.setStrokeStyle(2, 0xf7e4a4, residentId === id ? 1 : 0)
    }
  }

  private refreshResidents() {
    const seen = new Set<string>()
    this.residents.forEach((resident, index) => {
      seen.add(resident.id)
      const group = this.residentSprites.get(resident.id)
      if (!group || !group.active) {
        this.addResident(resident, index)
        return
      }
      const x = Math.max(150, Math.min(WORLD_W - 150, (resident.x / 100) * WORLD_W))
      const y = Math.max(150, Math.min(WORLD_H - 150, (resident.y / 100) * WORLD_H))
      this.tweens.killTweensOf(group)
      if (Phaser.Math.Distance.Between(group.x, group.y, x, y) > 24) {
        const path = this.findWalkPath(group.x, group.y, x, y)
        this.animateAlongPath(group, path)
      }
      group.setDepth(y + 50)
      const activity = group.getData("activityLabel") as Phaser.GameObjects.Text | undefined
      activity?.setText(resident.activity ?? "ใช้ชีวิตประจำวัน")
      group.setData("activity", resident.activity)
      this.paintSelection(resident.id)
    })
    for (const [id, group] of this.residentSprites) {
      if (!seen.has(id)) {
        group.destroy()
        this.residentSprites.delete(id)
      }
    }
  }

  private drawLabels() {
    this.add.text(960, 42, "ชุมชนริมคลอง · RIM KHLONG COMMUNITY", {
      fontFamily: "Tahoma, sans-serif", fontSize: "17px", color: "#37563b",
      backgroundColor: "#dce7c5", padding: { x: 12, y: 7 },
    }).setOrigin(0.5, 0).setDepth(2000)
    this.add.text(960, 1200, "ตลาด · บ้านเช่า · ร้านค้า · วัด · สวน · สถานีรถ", {
      fontFamily: "Tahoma, sans-serif", fontSize: "13px", color: "#f9f0d5",
      backgroundColor: "#496b4c", padding: { x: 10, y: 6 },
    }).setOrigin(0.5, 0).setDepth(2000)
    this.add.text(16, 16, "ลากเพื่อเลื่อนเมือง · เลื่อนล้อเมาส์เพื่อซูม · แตะอาคารเพื่อเข้า", {
      fontFamily: "Tahoma, sans-serif", fontSize: "11px", color: "#fff7dc",
      backgroundColor: "#496b4c", padding: { x: 8, y: 5 },
    }).setScrollFactor(0).setDepth(3000)
  }
}

export default function PixelCity({ residents, selectedId, onSelect, hour }: PixelCityProps) {
  const host = useRef<HTMLDivElement>(null)
  const game = useRef<Phaser.Game | null>(null)
  const sceneRef = useRef<ThaiNeighbourhoodScene | null>(null)
  const residentsRef = useRef(residents)
  const selectedRef = useRef(selectedId)
  const hourPropRef = useRef(hour)
  const onSelectRef = useRef(onSelect)
  residentsRef.current = residents
  hourPropRef.current = hour
  selectedRef.current = selectedId
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!host.current || game.current) return
    const scene = new class extends ThaiNeighbourhoodScene {
      constructor() { super() }
      init() {
        super.init({
          residents: residentsRef.current,
          selectedId: selectedRef.current,
          onSelect: (id) => onSelectRef.current(id),
          hour: hourPropRef.current,
        })
      }
    }()
    sceneRef.current = scene
    game.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current,
      width: host.current.clientWidth || 900,
      height: host.current.clientHeight || 500,
      backgroundColor: "#9fbd86",
      pixelArt: true,
      antialias: false,
      roundPixels: true,
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [scene],
    })
    return () => {
      game.current?.destroy(true)
      game.current = null
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    const active = sceneRef.current
    if (active?.scene?.isActive()) active.events.emit("update-residents", residents, selectedId, hour)
  }, [residents, selectedId, hour])

  return <div className="pixel-city" ref={host} role="img" aria-label="แผนที่ชุมชนไทย Pixel Art แบบ top-down พร้อมร้านค้า บ้านเช่า วัด ตลาด สวน และตัวละครที่เลือกได้" />
}
