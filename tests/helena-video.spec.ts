import { expect, type Page, test } from "@playwright/test";

async function gotoStudio(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Studio" })).toBeVisible();
  await expect(page.getByText("Campanha Helena Launch")).toBeVisible();
}

test("loads the Helena Video studio shell", async ({ page }) => {
  await gotoStudio(page);

  await expect(page).toHaveTitle(/Helena Video/);
  await expect(page.getByRole("button", { name: /Gerar/ })).toBeVisible();
  await expect(page.getByText("Helena IA").first()).toBeVisible();
  await expect(page.locator("body")).toContainText("Corte IA cinemático");
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

  await page.getByRole("button", { name: "16:9" }).click();
  await expect(page.locator(".format-label")).toHaveText("Formato 16:9");

  await expect(page.locator("body")).toContainText("Storyboard");
});

test("chat page sends a visible message", async ({ page }) => {
  await page.goto("/chat", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Chat IA" })).toBeVisible();
  await page.getByPlaceholder("Descreva sua ideia ou peça algo para a Helena IA...").fill("crie tres hooks");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("crie tres hooks")).toBeVisible();
  await expect(page.getByText(/checklist de produção/)).toBeVisible();
});

test("sidebar navigation opens launch pages", async ({ page }) => {
  await gotoStudio(page);

  for (const [name, url, heading] of [
    ["Assets", /\/assets$/, "Assets"],
    ["Minha conta", /\/minha-conta$/, "Minha conta"],
    ["Equipe & Workspace", /\/workspace$/, "Equipe & Workspace"],
    ["Integrações & API", /\/integracoes$/, "Integrações & API"],
    ["Chat IA", /\/chat$/, "Chat IA"],
    ["Projetos", /\/projetos$/, "Projetos"],
    ["Templates", /\/templates$/, "Templates"]
  ] as const) {
    await page.getByRole("button", { name }).click();
    await expect(page).toHaveURL(url);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  }

  await page.getByRole("button", { name: "Studio" }).click();
  await expect(page).toHaveURL(/\/studio$/);
  await expect(page.getByText("Campanha Helena Launch")).toBeVisible();
});

test("studio shows storyboard and quality metadata", async ({ page }) => {
  await gotoStudio(page);

  await expect(page.getByRole("button", { name: /Gancho visual/ })).toBeVisible();
  await expect(page.locator("body")).toContainText("6 cenas planejadas");
  await expect(page.locator("body")).toContainText("18s - 1080p - 2 var.");
});

test("legacy r-prefixed studio routes are normalized", async ({ page }) => {
  await page.goto("/r/r/studio", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/studio$/);
  await expect(page.getByText("Campanha Helena Launch")).toBeVisible();
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

  const dialog = page.getByRole("dialog", { name: "Ajuste de mídia" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("referencia.png", { exact: true })).toBeVisible();
  await page.getByLabel("Zoom do enquadramento").fill("1.5");
  await page.getByRole("button", { name: "Confirmar enquadramento" }).click();
  await expect(dialog).toBeHidden();
});
