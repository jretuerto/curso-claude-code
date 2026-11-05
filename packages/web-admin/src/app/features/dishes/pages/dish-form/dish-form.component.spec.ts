import { ApplicationRef, provideZonelessChangeDetection, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, provideRouter, Router } from '@angular/router'
import { LucideAngularModule, ChevronLeft, Plus, Trash2 } from 'lucide-angular'
import { Observable, of } from 'rxjs'
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
})

