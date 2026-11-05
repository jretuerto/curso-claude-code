import { test, expect } from '@playwright/test'
import { openNewDishForm } from './helpers'

test('humo: se puede abrir el formulario de nuevo plato', async ({ page }) => {
  await openNewDishForm(page)
  await expect(page.getByLabel('Nombre del plato')).toBeVisible()
})
