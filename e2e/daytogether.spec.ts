import { test, expect } from "@playwright/test"

const email = process.env.E2E_EMAIL || ""
const password = process.env.E2E_PASSWORD || ""
const apiOrigin = "https://money102-api.s2mtha16.workers.dev"
const originalTitle = `E2E temporary record ${Date.now()}`
const editedTitle = `${originalTitle} — edited`

test("authenticated Daily Log create, read-after-reload, edit and delete", async ({ page }) => {
  if (!email || !password) throw new Error("Set E2E_EMAIL and E2E_PASSWORD in GitHub Actions secrets.")

  // The API is called from the local test origin. Add CORS response headers in the
  // test proxy only; production Worker allowlists and configuration remain untouched.
  await page.route(`${apiOrigin}/**`, async route => {
    const response = await route.fetch({ timeout: 45_000 })
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        "access-control-allow-origin": "http://127.0.0.1:4173",
        "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
        "access-control-allow-headers": "Authorization, Content-Type",
      },
    })
  })

  await page.goto("/")
  await page.locator("#auth-email").fill(email)
  await page.locator("#auth-password").fill(password)
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click()
  await expect(page.getByRole("heading", { name: "วันนี้อยากบันทึกอะไร?" })).toBeVisible({ timeout: 45_000 })

  const openDailyLog = async () => {
    await page.locator(".dt-nav").getByRole("button", { name: "บันทึกวันนี้" }).click()
    await expect(page.locator(".dl-wrap")).toBeVisible()
  }
  const record = (title: string) => page.locator(".dl-entry").filter({ hasText: title })

  await openDailyLog()
  try {
    await page.locator(".dl-toolbar .dl-primary").click()
    await page.locator("#dl-title").fill(originalTitle)
    await page.locator("#dl-body").fill("Temporary Phase 9 verification record. It must be removed by this test.")
    await page.getByRole("button", { name: "บันทึกลงพื้นที่ส่วนตัว" }).click()
    await expect(record(originalTitle)).toBeVisible({ timeout: 30_000 })

    // A full page reload proves the new record was read back from the authenticated API.
    await page.reload()
    await expect(page.getByRole("heading", { name: "วันนี้อยากบันทึกอะไร?" })).toBeVisible({ timeout: 45_000 })
    await openDailyLog()
    await expect(record(originalTitle)).toBeVisible()

    await record(originalTitle).getByRole("button", { name: "แก้ไข" }).click()
    await page.locator("#dl-title").fill(editedTitle)
    await page.getByRole("button", { name: "บันทึกลงพื้นที่ส่วนตัว" }).click()
    await expect(record(editedTitle)).toBeVisible({ timeout: 30_000 })

    await page.reload()
    await expect(page.getByRole("heading", { name: "วันนี้อยากบันทึกอะไร?" })).toBeVisible({ timeout: 45_000 })
    await openDailyLog()
    await expect(record(editedTitle)).toBeVisible()
  } finally {
    // The page may have reloaded back to Home when an assertion failed.
    // Re-open Daily Log before attempting to remove this test's own record.
    try {
      const nav = page.locator(".dt-nav").getByRole("button", { name: "บันทึกวันนี้" })
      if (await nav.count()) await nav.click()
    } catch { /* login/session failure: no safe UI cleanup is possible */ }
    // Clean up only this test's uniquely named record. Never clear a snapshot or user data.
    for (const title of [editedTitle, originalTitle]) {
      const item = record(title)
      if (await item.count()) {
        await item.getByRole("button", { name: "ลบ" }).click()
        await item.getByRole("button", { name: "ยืนยันลบ" }).click()
        await expect(item).toHaveCount(0, { timeout: 30_000 })
      }
    }
  }
})
