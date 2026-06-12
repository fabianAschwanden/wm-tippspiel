import { expect, test } from "@playwright/test"

test("Dashboard lädt mit Titel und Navigation", async ({ page }) => {
  await page.goto("./")

  await expect(page).toHaveTitle(/WM-Tippspiel/)
  await expect(page.getByRole("link", { name: "Rangliste", exact: true })).toBeVisible()
})
