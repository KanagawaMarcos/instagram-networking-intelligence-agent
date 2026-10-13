import { test, expect } from "@playwright/test";

test("importa, analisa, prioriza e copia uma mensagem", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Comece com os dados certos." })).toBeVisible();
  await page.getByRole("button", { name: "Abrir demonstração" }).click();
  await expect(page.getByRole("heading", { name: "Seu networking, com contexto." })).toBeVisible();
  await page.getByRole("link", { name: /Importar contatos/ }).click();
  await page.getByRole("button", { name: "Validar e visualizar" }).click();
  await expect(page.getByText("Válidos")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar importação" }).click();
  await expect(page.getByText("Importação concluída:")).toBeVisible();
  await page.getByRole("link", { name: "Contatos" }).click();
  await expect(page.getByLabel("Selecionar todos")).toBeVisible();
  // Aciona a alteração nativa: mantém o cenário resiliente ao Chromium do ambiente Nix.
  await page.getByLabel("Selecionar todos").evaluate((element) => (element as HTMLInputElement).click());
  await page.getByRole("button", { name: /Analisar selecionados/ }).click();
  const firstContact = page.getByRole("link", { name: "Ver" }).first();
  await expect(firstContact).toBeVisible();
  await firstContact.click();
  await expect(page.getByText("Mensagem sugerida")).toBeVisible();
  await page.getByRole("button", { name: "Copiar mensagem" }).click();
  await expect(page.getByRole("button", { name: "Copiada" })).toBeVisible();
  await page.getByRole("button", { name: "Salvar no pipeline" }).click();
});
