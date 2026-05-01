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

test("publishes baseline SEO assets", async ({ page, request }) => {
  await gotoStudio(page);

  await expect(page).toHaveTitle("Helena Video | Editor IA");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /editor independente com IA/i
  );
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    "href",
    "/helena-video-logo-small.jpeg"
  );

  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  await expect(await robots.text()).toContain("Sitemap:");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  await expect(await sitemap.text()).toContain("/studio");
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

  await page.getByRole("button", { name: "Gere legendas dinamicas para Reels" }).click();
  await expect(
    page.locator(".chat-bubble.user").filter({ hasText: "Gere legendas dinamicas para Reels" })
  ).toBeVisible();

  await page.getByLabel("Zoom da timeline").fill("120");
  await expect(page.getByText("120%")).toBeVisible();
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

test("assistant panel can collapse and expand", async ({ page }) => {
  await gotoStudio(page);

  await page.getByRole("button", { name: "Recolher Helena IA" }).click();
  await expect(page.getByRole("button", { name: "Expandir Helena IA" })).toBeVisible();

  await page.getByRole("button", { name: "Expandir Helena IA" }).click();
  await expect(page.getByPlaceholder("Pedir roteiro, legenda, corte...")).toBeVisible();
});

test("advanced controls expand on demand", async ({ page }) => {
  await gotoStudio(page);

  await expect(page.getByLabel("Modelo")).toBeHidden();
  await page.getByText("Controles avancados").click();
  await expect(page.getByLabel("Modelo")).toBeVisible();
  await expect(page.getByLabel("Duracao")).toBeVisible();
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

test("upload flow opens media adjustment modal", async ({ page }) => {
  await gotoStudio(page);

  await page.locator('input[accept="image/*"]').setInputFiles({
    name: "referencia.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64"
    )
  });

  const dialog = page.getByRole("dialog", { name: "Ajuste de midia" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("referencia.png", { exact: true })).toBeVisible();
  await page.getByLabel("Zoom do enquadramento").fill("1.5");
  await page.getByRole("button", { name: "Confirmar enquadramento" }).click();
  await expect(page.getByText("Enquadramento confirmado em 1.5x")).toBeVisible();
});
