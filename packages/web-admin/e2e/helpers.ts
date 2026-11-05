import { expect, type Page } from '@playwright/test'

export const RESTAURANT_ID = 'rest-1'

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill('admin@resttek.com')
  await page.getByLabel('Contraseña').fill('admin@resttek.com')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

export async function openNewDishForm(page: Page): Promise<void> {
  await loginAsAdmin(page)
  await page.goto(`/restaurants/${RESTAURANT_ID}/dishes/new`)
  await expect(page.getByRole('heading', { level: 1, name: 'Nuevo plato' })).toBeVisible()
}
