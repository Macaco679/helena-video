import { expect, test } from "@playwright/test";

test("loads the Helena Video studio shell", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Helena Video/);
  await expect(page.getByRole("heading", { name: "Editor IA independente" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Gerar/ })).toBeVisible();
  await expect(page.getByText("Helena IA")).toBeVisible();
  await expect(page.getByText("Corte IA cinemático")).toBeVisible();
});

test("core controls update visible state", async ({ page }) => {
  await page.goto("/");

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

test("export action downloads project json", async ({ page }) => {
  await page.goto("/");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Exportar/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("helena-video-project");
});
