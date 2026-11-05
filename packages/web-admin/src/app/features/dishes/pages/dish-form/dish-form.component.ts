import { afterNextRender, Component, ElementRef, inject, Injector, OnInit, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { firstValueFrom } from 'rxjs'
import { DishStore } from '../../store/dish.store'
import { DishService } from '../../services/dish.service'
import { IngredientStore } from '../../../ingredients/store/ingredient.store'
import type { CreateDishDto, DishCategory } from '../../models/dish.model'

@Component({
  selector: 'app-dish-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './dish-form.component.html',
  styleUrl: './dish-form.component.css'
})
export class DishFormComponent implements OnInit {
  private readonly store = inject(DishStore)
  private readonly service = inject(DishService)
  readonly ingredientStore = inject(IngredientStore)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)
  private readonly injector = inject(Injector)

  isEditing = false
  dishId: string | null = null
  restaurantId: string = ''
  loading = signal(false)
  error = signal<string | null>(null)
  nameError = signal<string | null>(null)
  priceError = signal<string | null>(null)
  announcement = signal('')

  categories: DishCategory[] = ['entrante', 'principal', 'postre', 'bebida']

  form: CreateDishDto = {
    name: '',
    description: null,
    price: 0,
    category: 'principal',
    available: true,
    ingredients: []
  }

  newIngredientId = ''
  newIngredientQty = 1

  get pageTitle(): string {
    return this.isEditing ? 'Editar plato' : 'Nuevo plato'
  }

  get listUrl(): string {
    return `/restaurants/${this.restaurantId}/dishes`
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'entrante': 'Entrante',
      'principal': 'Principal',
      'postre': 'Postre',
      'bebida': 'Bebida'
    }
    return labels[category] ?? category
  }

  ngOnInit(): void {
    this.restaurantId = this.route.parent?.snapshot.params['restaurantId'] ?? ''
    const id = this.route.snapshot.paramMap.get('id')

    if (this.restaurantId) {
      this.ingredientStore.loadByRestaurant(this.restaurantId)
    }

    if (id && this.restaurantId) {
      this.isEditing = true
      this.dishId = id
      this.loadDish()
    }
  }

  private async loadDish(): Promise<void> {
    this.loading.set(true)
    try {
      const dish = await firstValueFrom(this.service.getById(this.restaurantId, this.dishId!))
      this.form = {
        name: dish.name,
        description: dish.description,
        price: dish.price,
        category: dish.category,
        available: dish.available,
        ingredients: [...dish.ingredients]
      }
    } catch {
      this.error.set('No se pudo cargar el plato.')
    } finally {
      this.loading.set(false)
    }
  }

  addIngredient(): void {
    if (!this.newIngredientId || this.newIngredientQty <= 0) return
    const exists = this.form.ingredients.find(i => i.ingredientId === this.newIngredientId)
    if (exists) return

    this.form.ingredients = [
      ...this.form.ingredients,
      { ingredientId: this.newIngredientId, quantity: this.newIngredientQty }
    ]
    this.announcement.set(`${this.getIngredientName(this.newIngredientId)} añadido.`)
    this.newIngredientId = ''
    this.newIngredientQty = 1
  }

  removeIngredient(ingredientId: string): void {
    const index = this.form.ingredients.findIndex(i => i.ingredientId === ingredientId)
    const name = this.getIngredientName(ingredientId)
    this.form.ingredients = this.form.ingredients.filter(i => i.ingredientId !== ingredientId)
    this.announcement.set(`${name} quitado.`)

    // El foco no debe perderse al desaparecer el botón: pasa al chip que ocupa su lugar
    // o, si no quedan chips, al selector de ingrediente
    const next = this.form.ingredients[Math.min(index, this.form.ingredients.length - 1)]
    afterNextRender(
      () => this.focusField(next ? `remove-ingredient-${next.ingredientId}` : 'new-ingredient'),
      { injector: this.injector }
    )
  }

  getIngredientName(ingredientId: string): string {
    const ingredient = this.ingredientStore.ingredients().find(i => i.id === ingredientId)
    return ingredient ? `${ingredient.name} (${ingredient.unit})` : ingredientId
  }

  private validate(): boolean {
    const nameValid = (this.form.name ?? '').trim().length > 0
    const price = this.form.price as number | null
    const priceValid = typeof price === 'number' && Number.isFinite(price) && price >= 0
    this.nameError.set(nameValid ? null : 'El nombre es obligatorio.')
    this.priceError.set(priceValid ? null : 'Introduce un precio igual o mayor que 0.')
    if (!nameValid) this.focusField('dish-name')
    else if (!priceValid) this.focusField('dish-price')
    return nameValid && priceValid
  }

  private focusField(id: string): void {
    this.host.nativeElement.querySelector<HTMLElement>(`#${id}`)?.focus()
  }

  async onSubmit(): Promise<void> {
    this.error.set(null)
    if (!this.validate()) return
    this.loading.set(true)
    try {
      if (this.isEditing && this.dishId) {
        await this.store.update(this.restaurantId, this.dishId, this.form)
      } else {
        await this.store.create(this.restaurantId, this.form)
      }
      this.router.navigate(['/restaurants', this.restaurantId, 'dishes'])
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Error al guardar el plato.')
    } finally {
      this.loading.set(false)
    }
  }
}
