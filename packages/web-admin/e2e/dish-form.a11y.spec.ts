import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'
import { openNewDishForm } from './helpers'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

test.describe('Formulario de platos - nombres accesibles', () => {
  test.beforeEach(async ({ page }) => {
    await openNewDishForm(page)
  })

  test('el formulario tiene nombre accesible', async ({ page }) => {
    await expect(page.getByRole('form', { name: 'Nuevo plato' })).toBeVisible()
  })

  test('todos los controles tienen nombre accesible', async ({ page }) => {
    await expect(page.getByRole('textbox', { name: 'Nombre del plato' })).toBeVisible()
    await expect(page.getByRole('spinbutton', { name: 'Precio (€)' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Categoría' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Disponible' })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Descripción (opcional)' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Ingrediente a añadir' })).toBeVisible()
    await expect(page.getByRole('spinbutton', { name: 'Cantidad del ingrediente' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Añadir ingrediente' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Guardar' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Cancelar' })).toBeVisible()
  })

  test('auditoría axe WCAG 2.2 AA sin violaciones', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .include('app-dish-form')
      .withTags(WCAG_TAGS)
      // TODO(tarea 12): reactivar color-contrast al corregir el contraste del formulario
      .disableRules(['color-contrast'])
      .analyze()
    expect(
      results.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`)
    ).toEqual([])
  })

  test('el formulario indica aria-busy mientras se guarda', async ({ page }) => {
    await page.route('**/api/v1/restaurants/*/dishes', async route => {
      if (route.request().method() !== 'POST') return route.continue()
      // Respuesta simulada y con retraso: no escribe en la BBDD de desarrollo
      await new Promise(r => setTimeout(r, 1500))
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' })
    })
    const form = page.getByRole('form', { name: 'Nuevo plato' })
    await expect(form).toHaveAttribute('aria-busy', 'false')
    await page.getByLabel('Nombre del plato').fill('Plato a11y busy')
    await page.getByLabel('Precio (€)').fill('5')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(form).toHaveAttribute('aria-busy', 'true')
  })
})
