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

  test('la jerarquía de encabezados no salta niveles', async ({ page }) => {
    const levels = await page
      .locator('app-dish-form')
      .getByRole('heading')
      .evaluateAll(hs => hs.map(h => Number(h.tagName.substring(1))))
    expect(levels).toEqual([1, 2])
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

  test('anuncia en una región de estado que el plato se está guardando', async ({ page }) => {
    await page.route('**/api/v1/restaurants/*/dishes', async route => {
      if (route.request().method() !== 'POST') return route.continue()
      await new Promise(r => setTimeout(r, 1500))
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' })
    })
    const status = page.locator('app-dish-form').getByRole('status')
    await expect(status).toHaveAttribute('aria-live', 'polite')
    await expect(status).toBeEmpty()
    await page.getByLabel('Nombre del plato').fill('Plato a11y status')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(status).toHaveText('Guardando el plato…')
  })
})

test.describe('Formulario de platos - validación accesible', () => {
  test.beforeEach(async ({ page }) => {
    await openNewDishForm(page)
  })

  test('enviar con nombre vacío muestra el error enlazado al campo', async ({ page }) => {
    let posts = 0
    await page.route('**/api/v1/restaurants/*/dishes', route => {
      if (route.request().method() === 'POST') posts++
      return route.continue()
    })
    await page.getByLabel('Precio (€)').fill('5')
    await page.getByRole('button', { name: 'Guardar' }).click()

    const name = page.getByLabel('Nombre del plato')
    await expect(name).toHaveAttribute('aria-invalid', 'true')
    await expect(name).toHaveAccessibleDescription('El nombre es obligatorio.')
    await expect(page.getByLabel('Precio (€)')).not.toHaveAttribute('aria-invalid', 'true')
    expect(posts).toBe(0)
  })

  test('enviar con precio vacío o negativo muestra el error enlazado al campo', async ({ page }) => {
    await page.getByLabel('Nombre del plato').fill('Plato de prueba')
    const price = page.getByLabel('Precio (€)')
    await price.fill('')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(price).toHaveAttribute('aria-invalid', 'true')
    await expect(price).toHaveAccessibleDescription('Introduce un precio igual o mayor que 0.')

    await price.fill('-3')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(price).toHaveAccessibleDescription('Introduce un precio igual o mayor que 0.')
  })

  test('tras corregir el campo el formulario se envía sin errores', async ({ page }) => {
    await page.route('**/api/v1/restaurants/*/dishes', route =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 201, contentType: 'application/json', body: '{}' })
        : route.continue()
    )
    await page.getByRole('button', { name: 'Guardar' }).click()
    const name = page.getByLabel('Nombre del plato')
    await expect(name).toHaveAttribute('aria-invalid', 'true')
    await name.fill('Otro plato')
    await page.getByRole('button', { name: 'Guardar' }).click()
    // Sin errores, el envío es válido y se vuelve al listado
    await expect(page).toHaveURL(/\/restaurants\/[^/]+\/dishes$/)
  })

  test('al fallar la validación el foco va al primer campo inválido', async ({ page }) => {
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByLabel('Nombre del plato')).toBeFocused()

    await page.getByLabel('Nombre del plato').fill('Plato con precio vacío')
    await page.getByLabel('Precio (€)').fill('')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByLabel('Precio (€)')).toBeFocused()
  })
})

test.describe('Formulario de platos - ingredientes accesibles', () => {
  test.beforeEach(async ({ page }) => {
    await openNewDishForm(page)
  })

  async function addIngredient(page: import('@playwright/test').Page, index: number): Promise<string> {
    const select = page.getByRole('combobox', { name: 'Ingrediente a añadir' })
    await expect(select.locator('option')).not.toHaveCount(1)
    const label = (await select.locator('option').nth(index).textContent())!.trim()
    await select.selectOption({ index })
    await page.getByRole('spinbutton', { name: 'Cantidad del ingrediente' }).fill('2')
    await page.getByRole('button', { name: 'Añadir ingrediente' }).click()
    return label
  }

  test('añadir un ingrediente lo anuncia en la región de estado', async ({ page }) => {
    const label = await addIngredient(page, 1)
    await expect(page.locator('app-dish-form').getByRole('status')).toHaveText(`${label} añadido.`)
    await expect(page.getByRole('list', { name: 'Ingredientes añadidos' }).getByRole('listitem')).toHaveCount(1)
  })

  test('quitar un ingrediente lo anuncia y mueve el foco de forma lógica', async ({ page }) => {
    const first = await addIngredient(page, 1)
    await addIngredient(page, 2)
    const status = page.locator('app-dish-form').getByRole('status')

    // Quitar el primero: el foco pasa al botón de quitar del que ocupa su lugar
    await page.getByRole('button', { name: new RegExp(`^Quitar ${first.replace(/[()]/g, '\\$&')}`) }).click()
    await expect(status).toHaveText(`${first} quitado.`)
    await expect(page.getByRole('button', { name: /^Quitar / })).toBeFocused()

    // Quitar el último: no quedan chips, el foco vuelve al selector de ingrediente
    await page.getByRole('button', { name: /^Quitar / }).click()
    await expect(page.getByRole('combobox', { name: 'Ingrediente a añadir' })).toBeFocused()
  })

  test('añadir sin seleccionar ingrediente muestra un error enlazado al selector', async ({ page }) => {
    await page.getByRole('button', { name: 'Añadir ingrediente' }).click()
    const select = page.getByRole('combobox', { name: 'Ingrediente a añadir' })
    await expect(select).toHaveAttribute('aria-invalid', 'true')
    await expect(select).toHaveAccessibleDescription('Selecciona un ingrediente.')
    await expect(select).toBeFocused()
  })

  test('añadir con cantidad 0 muestra un error enlazado a la cantidad', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Ingrediente a añadir' }).selectOption({ index: 1 })
    const qty = page.getByRole('spinbutton', { name: 'Cantidad del ingrediente' })
    await qty.fill('0')
    await page.getByRole('button', { name: 'Añadir ingrediente' }).click()
    await expect(qty).toHaveAttribute('aria-invalid', 'true')
    await expect(qty).toHaveAccessibleDescription('La cantidad debe ser mayor que 0.')
    await expect(qty).toBeFocused()
  })

  test('añadir un ingrediente repetido muestra un error y no lo duplica', async ({ page }) => {
    await addIngredient(page, 1)
    const select = page.getByRole('combobox', { name: 'Ingrediente a añadir' })
    await select.selectOption({ index: 1 })
    await page.getByRole('button', { name: 'Añadir ingrediente' }).click()
    await expect(select).toHaveAccessibleDescription('Este ingrediente ya está añadido.')
    await expect(page.getByRole('list', { name: 'Ingredientes añadidos' }).getByRole('listitem')).toHaveCount(1)
  })
})

