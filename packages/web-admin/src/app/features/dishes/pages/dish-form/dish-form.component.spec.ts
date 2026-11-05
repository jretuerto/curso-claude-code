import { provideZonelessChangeDetection, signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, provideRouter, Router } from '@angular/router'
import { LucideAngularModule, ChevronLeft, Plus, Trash2 } from 'lucide-angular'
import { of } from 'rxjs'
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
export async function setup(options: { dishId?: string; dish?: unknown } = {}): Promise<Harness> {
  const dishStore = { create: vi.fn().mockResolvedValue(undefined), update: vi.fn().mockResolvedValue(undefined) }
  const dishService = { getById: vi.fn().mockReturnValue(of(options.dish)) }
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
})
