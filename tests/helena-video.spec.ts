import { expect, type Page, test } from "@playwright/test";

async function gotoStudio(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Editor IA independente" })).toBeVisible();
}

test("loads the Helena Video studio shell", async ({ page }) => {
  await gotoStudio(page);

  await expect(page).toHaveTitle(/Helena Video/);
  await expect(page.getByRole("button", { name: /Gerar/ })).toBeVisible();
  await expect(page.getByText("Helena IA")).toBeVisible();
  await expect(page.getByText("Corte IA cinemático")).toBeVisible();
});

test("core controls update visible state", async ({ page }) => {
  await gotoStudio(page);

  await page.getByRole("button", { name: /AutoCut/ }).click();
  await expect(page.getByText("Cria cortes sociais, highlights e variacoes curtas.")).toBeVisible();

  await page.getByRole("button", { name: "16:9" }).click();
  await expect(page.locator(".format-label")).toHaveText("Formato 16:9");

  await page.getByRole("button", { name: /Reproduzir preview/ }).click();
  await expect(page.getByText("Preview em reprodução")).toBeVisible();

  await page.getByPlaceholder("Pedir roteiro, legenda, corte...").fill("crie tres hooks");
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("crie tres hooks")).toBeVisible();
});

test("sidebar navigation opens workspace sections", async ({ page }) => {
  await gotoStudio(page);

  await page.getByRole("button", { name: "Assets" }).click();
  await expect(page).toHaveURL(/\/assets$/);
  await expect(page.getByRole("heading", { name: "Assets" })).toBeVisible();
  await expect(page.getByText("Uploads do projeto")).toBeVisible();

  await page.getByRole("button", { name: "Studio" }).click();
  await expect(page).toHaveURL(/\/studio$/);
  await expect(page.getByRole("heading", { name: "Editor IA independente" })).toBeVisible();
});

test("legacy r-prefixed studio routes are normalized", async ({ page }) => {
  await page.goto("/r/r/studio", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/studio$/);
  await expect(page.getByRole("heading", { name: "Editor IA independente" })).toBeVisible();
});

test("export action downloads project json", async ({ page }) => {
  await gotoStudio(page);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Exportar/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("helena-video-project");
});
