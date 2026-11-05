import { ApplicationRef, provideZonelessChangeDetection, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, provideRouter, Router } from '@angular/router'
import { LucideAngularModule, ChevronLeft, Plus, Trash2 } from 'lucide-angular'
import { NEVER, Observable, of } from 'rxjs'
import { vi } from 'vitest'
import { IngredientStore } from '../../../ingredients/store/ingredient.store'
import type { Ingredient } from '../../../ingredients/models/ingredient.model'
import { DishService } from '../../services/dish.service'
import { DishStore } from '../../store/dish.store'
import { DishFormComponent } from './dish-form.component'

export const INGREDIENTS: Ingredient[] = [
  { id: 'ing-1', name: 'Tomate', unit: 'kg', currentStock: 10, restaurantId: 'rest-1', createdAt: '', updatedAt: '' },
  { id: 'ing-2', name: 'Queso', unit: 'kg', currentStock: 5, restaurantId: 'rest-1', createdAt: '', updatedAt: '' }
]

export interface Harness {
  fixture: ComponentFixture<DishFormComponent>
  component: DishFormComponent
  el: HTMLElement
  dishStore: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
  dishService: { getById: ReturnType<typeof vi.fn> }
  navigate: ReturnType<typeof vi.spyOn>
  query<T extends HTMLElement>(selector: string): T
  settle(): Promise<void>
}

/** Monta el componente con dependencias falsas. `dishId` activa el modo edición. */
export async function setup(options: { dishId?: string; dish?: unknown; dish$?: Observable<unknown> } = {}): Promise<Harness> {
  const dishStore = { create: vi.fn().mockResolvedValue(undefined), update: vi.fn().mockResolvedValue(undefined) }
  const dishService = { getById: vi.fn().mockReturnValue(options.dish$ ?? of(options.dish)) }
  const ingredientStore = { ingredients: signal(INGREDIENTS).asReadonly(), loadByRestaurant: vi.fn() }
  const route = {
    parent: { snapshot: { params: { restaurantId: 'rest-1' } } },
    snapshot: { paramMap: { get: () => options.dishId ?? null } }
  }

  TestBed.configureTestingModule({
    imports: [DishFormComponent, LucideAngularModule.pick({ ChevronLeft, Plus, Trash2 })],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: DishStore, useValue: dishStore },
      { provide: DishService, useValue: dishService },
      { provide: IngredientStore, useValue: ingredientStore },
      { provide: ActivatedRoute, useValue: route }
    ]
  })

  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true)
  const fixture = TestBed.createComponent(DishFormComponent)
  document.body.appendChild(fixture.nativeElement) // el foco solo funciona con el DOM adjunto
  fixture.detectChanges()
  await fixture.whenStable()
  const el = fixture.nativeElement as HTMLElement
  const settle = async () => {
    fixture.detectChanges()
    TestBed.inject(ApplicationRef).tick() // ejecuta también los afterNextRender
    await fixture.whenStable()
    fixture.detectChanges()
  }
  const query = <T extends HTMLElement>(selector: string) => el.querySelector(selector) as T
  return { fixture, component: fixture.componentInstance, el, dishStore, dishService, navigate, query, settle }
}

describe('DishFormComponent', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('se crea y muestra el título «Nuevo plato»', async () => {
    const { query } = await setup()
    expect(query('h1').textContent?.trim()).toBe('Nuevo plato')
  })

  describe('nombre accesible del formulario y aria-busy', () => {
    it('el <form> está etiquetado por el h1', async () => {
      const { query } = await setup()
      const h1 = query('h1')
      expect(h1.id).not.toBe('')
      expect(query('form').getAttribute('aria-labelledby')).toBe(h1.id)
    })

    it('aria-busy refleja el estado de carga', async () => {
      const { query, component, settle } = await setup()
      expect(query('form').getAttribute('aria-busy')).toBe('false')
      component.loading.set(true)
      await settle()
      expect(query('form').getAttribute('aria-busy')).toBe('true')
    })
  })

  describe('validación de nombre y precio', () => {
    it('con nombre vacío no guarda y enlaza el error al campo', async () => {
      const { query, component, dishStore, settle } = await setup()
      component.form.name = '   '
      component.form.price = 5
      await component.onSubmit()
      await settle()

      const input = query('#dish-name')
      expect(dishStore.create).not.toHaveBeenCalled()
      expect(input.getAttribute('aria-invalid')).toBe('true')
      expect(input.getAttribute('aria-describedby')).toBe('dish-name-error')
      expect(query('#dish-name-error').textContent?.trim()).toBe('El nombre es obligatorio.')
      expect(query('#dish-price').getAttribute('aria-invalid')).toBeNull()
    })

    it.each([[null], [-3]])('con precio %s no guarda y enlaza el error al campo', async price => {
      const { query, component, dishStore, settle } = await setup()
      component.form.name = 'Tortilla'
      component.form.price = price as unknown as number
      await component.onSubmit()
      await settle()

      const input = query('#dish-price')
      expect(dishStore.create).not.toHaveBeenCalled()
      expect(input.getAttribute('aria-invalid')).toBe('true')
      expect(input.getAttribute('aria-describedby')).toBe('dish-price-error')
      expect(query('#dish-price-error').textContent?.trim()).toBe('Introduce un precio igual o mayor que 0.')
    })

    it('con datos válidos guarda, no muestra errores y vuelve al listado', async () => {
      const { query, component, dishStore, navigate, settle } = await setup()
      component.form.name = 'Tortilla'
      component.form.price = 0
      await component.onSubmit()
      await settle()

      expect(dishStore.create).toHaveBeenCalledWith('rest-1', component.form)
      expect(navigate).toHaveBeenCalledWith(['/restaurants', 'rest-1', 'dishes'])
      expect(query('#dish-name').getAttribute('aria-invalid')).toBeNull()
      expect(query('.field-error')).toBeNull()
    })
  })

  describe('foco al primer campo inválido', () => {
    it('con nombre vacío el foco va al nombre', async () => {
      const { component, settle } = await setup()
      component.form.name = ''
      component.form.price = -1
      await component.onSubmit()
      await settle()
      expect(document.activeElement?.id).toBe('dish-name')
    })

    it('si solo falla el precio el foco va al precio', async () => {
      const { component, settle } = await setup()
      component.form.name = 'Tortilla'
      component.form.price = -1
      await component.onSubmit()
      await settle()
      expect(document.activeElement?.id).toBe('dish-price')
    })

    it('con datos válidos no se mueve el foco a ningún campo', async () => {
      const { component, settle } = await setup()
      component.form.name = 'Tortilla'
      component.form.price = 3
      await component.onSubmit()
      await settle()
      expect(document.activeElement?.id).not.toBe('dish-name')
      expect(document.activeElement?.id).not.toBe('dish-price')
    })
  })

  describe('región de estado de carga y guardado', () => {
    it('existe una región role=status aria-live=polite, vacía al inicio', async () => {
      const { query } = await setup()
      const status = query('[role="status"]')
      expect(status).not.toBeNull()
      expect(status.getAttribute('aria-live')).toBe('polite')
      expect(status.textContent?.trim()).toBe('')
    })

    it('anuncia «Guardando el plato…» mientras se guarda', async () => {
      const { query, component, dishStore, settle } = await setup()
      dishStore.create.mockReturnValue(new Promise(() => {})) // guardado en curso
      component.form.name = 'Tortilla'
      component.form.price = 3
      void component.onSubmit()
      await settle()
      expect(query('[role="status"]').textContent?.trim()).toBe('Guardando el plato…')
    })

    it('anuncia «Cargando el plato…» al abrir la edición', async () => {
      const { query } = await setup({ dishId: 'dish-1', dish$: NEVER })
      expect(query('[role="status"]').textContent?.trim()).toBe('Cargando el plato…')
    })

    it('el error general se anuncia con role=alert', async () => {
      const { query, component, dishStore, settle } = await setup()
      dishStore.create.mockRejectedValue({ error: { message: 'Fallo del servidor' } })
      component.form.name = 'Tortilla'
      component.form.price = 3
      await component.onSubmit()
      await settle()
      expect(query('[role="alert"]').textContent?.trim()).toBe('Fallo del servidor')
    })
  })

  describe('ingredientes: avisos y foco', () => {
    async function addTwo(h: Harness): Promise<void> {
      for (const id of ['ing-1', 'ing-2']) {
        h.component.newIngredientId = id
        h.component.newIngredientQty = 2
        h.component.addIngredient()
      }
      await h.settle()
    }

    it('añadir un ingrediente lo anuncia y lo muestra como chip', async () => {
      const h = await setup()
      h.component.newIngredientId = 'ing-1'
      h.component.newIngredientQty = 2
      h.component.addIngredient()
      await h.settle()
      expect(h.query('[role="status"]').textContent?.trim()).toBe('Tomate (kg) añadido.')
      expect(h.el.querySelectorAll('.ingredient-chip')).toHaveLength(1)
    })

    it('quitar un ingrediente lo anuncia y pasa el foco al chip que ocupa su lugar', async () => {
      const h = await setup()
      await addTwo(h)
      h.component.removeIngredient('ing-1')
      await h.settle()
      expect(h.query('[role="status"]').textContent?.trim()).toBe('Tomate (kg) quitado.')
      expect(document.activeElement?.id).toBe('remove-ingredient-ing-2')
    })

    it('quitar el último chip devuelve el foco al selector de ingrediente', async () => {
      const h = await setup()
      await addTwo(h)
      h.component.removeIngredient('ing-2')
      h.component.removeIngredient('ing-1')
      await h.settle()
      expect(document.activeElement?.id).toBe('new-ingredient')
    })

    it('cada botón de quitar tiene id y nombre accesible con el ingrediente', async () => {
      const h = await setup()
      await addTwo(h)
      const button = h.query('#remove-ingredient-ing-1')
      expect(button.getAttribute('aria-label')).toBe('Quitar Tomate (kg)')
    })
  })

  describe('feedback al no poder añadir un ingrediente', () => {
    it('sin ingrediente seleccionado enlaza el error al selector y le da el foco', async () => {
      const h = await setup()
      h.component.newIngredientId = ''
      h.component.addIngredient()
      await h.settle()
      const select = h.query('#new-ingredient')
      expect(select.getAttribute('aria-invalid')).toBe('true')
      expect(select.getAttribute('aria-describedby')).toBe('ingredient-error')
      expect(h.query('#ingredient-error').textContent?.trim()).toBe('Selecciona un ingrediente.')
      expect(document.activeElement).toBe(select)
      expect(h.el.querySelectorAll('.ingredient-chip')).toHaveLength(0)
    })

    it('con cantidad 0 enlaza el error a la cantidad y le da el foco', async () => {
      const h = await setup()
      h.component.newIngredientId = 'ing-1'
      h.component.newIngredientQty = 0
      h.component.addIngredient()
      await h.settle()
      const qty = h.query('#new-ingredient-qty')
      expect(qty.getAttribute('aria-invalid')).toBe('true')
      expect(qty.getAttribute('aria-describedby')).toBe('ingredient-error')
      expect(h.query('#ingredient-error').textContent?.trim()).toBe('La cantidad debe ser mayor que 0.')
      expect(document.activeElement).toBe(qty)
      expect(h.query('#new-ingredient').getAttribute('aria-invalid')).toBeNull()
    })

    it('un ingrediente repetido muestra el error y no se duplica', async () => {
      const h = await setup()
      h.component.newIngredientId = 'ing-1'
      h.component.addIngredient()
      h.component.newIngredientId = 'ing-1'
      h.component.addIngredient()
      await h.settle()
      expect(h.query('#ingredient-error').textContent?.trim()).toBe('Este ingrediente ya está añadido.')
      expect(h.component.form.ingredients).toHaveLength(1)
    })

    it('un añadido correcto limpia el error anterior', async () => {
      const h = await setup()
      h.component.newIngredientId = ''
      h.component.addIngredient()
      h.component.newIngredientId = 'ing-2'
      h.component.addIngredient()
      await h.settle()
      expect(h.query('#ingredient-error')).toBeNull()
      expect(h.query('#new-ingredient').getAttribute('aria-invalid')).toBeNull()
    })
  })
})

