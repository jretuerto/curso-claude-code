import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { RESTAURANT_ID } from './helpers'

/**
 * Graba en vídeo el flujo completo del formulario de platos usando SOLO el teclado
 * (sin ratón): login, abrir «Nuevo plato», editar datos, añadir y quitar ingredientes,
 * enviar incompleto (errores), corregir y crear el plato, que aparece en el listado.
 *
 * Salida: packages/web-admin/e2e-videos/dish-form-teclado.webm
 * Crea un plato real y lo borra al terminar.
 */
const VIDEO_DIR = join(__dirname, '..', 'e2e-videos')
const VIDEO_FILE = join(VIDEO_DIR, 'dish-form-teclado.webm')
const DISH_NAME = 'Tarta de queso accesible (vídeo)'
const SIZE = { width: 1280, height: 720 }

test.use({ viewport: SIZE, video: { mode: 'on', size: SIZE } })

const pause = (page: Page, ms = 700) => page.waitForTimeout(ms)

/** Nombre accesible del elemento con foco (etiqueta, aria-label o texto). */
const focusedName = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    if (!el) return ''
    const label = el.id ? document.querySelector(`label[for="${el.id}"]`)?.textContent : null
    return (label || el.getAttribute('aria-label') || el.textContent || '').trim()
  })

/** Pulsa Tab (o Shift+Tab) a ritmo legible hasta que el foco llega al control indicado. */
async function tabTo(page: Page, name: string, back = false): Promise<void> {
  for (let i = 0; i < 40; i++) {
    if ((await focusedName(page)).startsWith(name)) return
    await page.keyboard.press(back ? 'Shift+Tab' : 'Tab')
    await pause(page, 180)
  }
  throw new Error(`El foco no llegó a "${name}" con el teclado`)
}

const type = async (page: Page, text: string) => {
  await page.keyboard.type(text, { delay: 70 })
  await pause(page, 400)
}

async function deleteDish(request: APIRequestContext): Promise<void> {
  const login = await request.post('/api/v1/auth/login', {
    data: { email: 'admin@resttek.com', password: 'admin@resttek.com' }
  })
  const headers = { Authorization: `Bearer ${(await login.json()).token}` }
  const list = await request.get(`/api/v1/restaurants/${RESTAURANT_ID}/dishes`, { headers })
  const dishes: { id: string; name: string }[] = await list.json()
  for (const dish of dishes.filter(d => d.name === DISH_NAME)) {
    await request.delete(`/api/v1/restaurants/${RESTAURANT_ID}/dishes/${dish.id}`, { headers })
  }
}

test.afterEach(async ({ request }) => {
  await deleteDish(request)
})

test('vídeo: flujo completo del formulario de platos solo con teclado', async ({ page }) => {
  test.setTimeout(180_000)
  mkdirSync(VIDEO_DIR, { recursive: true })

  // 1. Login con teclado
  await page.goto('/login')
  await pause(page, 800)
  await page.keyboard.press('Tab')
  await type(page, 'admin@resttek.com')
  await page.keyboard.press('Tab')
  await type(page, 'admin@resttek.com')
  await page.keyboard.press('Enter')
  await expect(page).not.toHaveURL(/\/login/)
  await pause(page, 1200)

  // 2. Listado de platos y botón «Nuevo plato» con Tab + Enter
  await page.goto(`/restaurants/${RESTAURANT_ID}/dishes`)
  await expect(page.getByRole('heading', { level: 1, name: 'Platos' })).toBeVisible()
  await pause(page, 1000)
  await tabTo(page, 'Nuevo plato')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('form', { name: 'Nuevo plato' })).toBeVisible()
  await pause(page, 900)

  // 3. Rellenar y modificar datos
  await tabTo(page, 'Nombre del plato')
  await type(page, 'Plato provisional')
  await page.keyboard.press('Tab')
  await type(page, '8.5')
  await page.keyboard.press('Tab') // categoría: se elige escribiendo la inicial
  await type(page, 'Postre')
  await pause(page, 500)
  await type(page, 'Bebida') // se cambia de opinión
  await page.keyboard.press('Tab') // disponible
  await page.keyboard.press('Tab') // descripción
  await type(page, 'Tarta cremosa al horno con base de galleta.')

  // 4. Ingredientes: añadir dos y quitar uno
  const options = await page.getByRole('combobox', { name: 'Ingrediente a añadir' }).locator('option').allTextContents()
  await page.keyboard.press('Tab') // selector de ingrediente
  for (const option of options.slice(1, 3)) {
    await tabTo(page, 'Ingrediente a añadir')
    await page.keyboard.type(option.slice(0, 3), { delay: 120 })
    await page.keyboard.press('Tab') // cantidad
    await page.keyboard.press('ControlOrMeta+A')
    await type(page, '2')
    await page.keyboard.press('Enter') // Enter en la cantidad añade el ingrediente
    await pause(page, 900)
  }
  await tabTo(page, 'Quitar', true) // Shift+Tab hasta el botón de quitar
  await pause(page, 700)
  await page.keyboard.press('Enter')
  await pause(page, 1200)

  // 5. Enviar incompleto: sin nombre y sin precio -> errores y foco en el primero
  await tabTo(page, 'Nombre del plato', true)
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Backspace')
  await page.keyboard.press('Tab')
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Backspace')
  await pause(page, 600)
  await tabTo(page, 'Guardar')
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Nombre del plato')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('Precio (€)')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('Nombre del plato')).toBeFocused()
  await pause(page, 2500)

  // 6. Corregir y crear bien el plato
  await type(page, DISH_NAME)
  await page.keyboard.press('Tab')
  await type(page, '9.5')
  await pause(page, 600)
  await tabTo(page, 'Guardar')
  await page.keyboard.press('Enter')

  // 7. El plato aparece en el listado
  await expect(page).toHaveURL(/\/restaurants\/[^/]+\/dishes$/)
  await expect(page.getByRole('cell', { name: new RegExp(DISH_NAME.replace(/[()]/g, '\\$&')) })).toBeVisible()
  await pause(page, 3000)

  // 8. Guardar el vídeo en e2e-videos/
  const video = page.video()!
  await page.close()
  await video.saveAs(VIDEO_FILE)
})
