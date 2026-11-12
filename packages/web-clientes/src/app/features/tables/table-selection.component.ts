import { Component, inject, OnInit, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { HttpErrorResponse } from '@angular/common/http'
import { FormsModule } from '@angular/forms'
import { RestaurantService } from '../../core/services/restaurant.service'
import { TableService } from '../../core/services/table.service'
import { CartStore } from '../../core/store/cart.store'
import { Restaurant } from '../../core/models/restaurant.model'
import { RestaurantTable } from '../../core/models/table.model'

@Component({
  selector: 'app-table-selection',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="container">
      <div class="page-header">
        <div>
          <a routerLink="/restaurants" class="back-link">← Volver a restaurantes</a>
          <h1>{{ restaurant()?.name || 'Elige tu mesa' }}</h1>
          <p>Indica cuántas personas sois y elige una mesa libre</p>
        </div>
      </div>

      <form class="people-form card" (ngSubmit)="search()">
        <div class="form-group">
          <label for="people">Número de personas</label>
          <input id="people" name="people" type="number" min="1" step="1" class="form-control"
                 [ngModel]="people()" (ngModelChange)="people.set($event)" />
        </div>
        <button type="submit" class="btn btn-primary" [disabled]="loading()">Buscar mesas</button>
      </form>

      @if (error()) {
        <div class="alert-error">{{ error() }}</div>
      }
      @if (notice()) {
        <div class="alert-error">{{ notice() }}</div>
      }

      @if (loading()) {
        <div class="spinner"></div>
      } @else if (searched()) {
        @if (tables().length === 0) {
          <div class="empty-state card">
            <p>No hay mesas libres para {{ searchedPeople() }} personas</p>
          </div>
        } @else {
          <div class="tables-grid">
            @for (table of tables(); track table.id) {
              <button type="button" class="table-card card" [class.selected]="selectedId() === table.id"
                      (click)="selectedId.set(table.id)">
                <strong>Mesa {{ table.number }}</strong>
                <span>{{ table.capacity }} personas</span>
                @if (table.description) {
                  <span class="desc">{{ table.description }}</span>
                }
              </button>
            }
          </div>
          <button type="button" class="btn btn-primary continue" [disabled]="!selectedId() || occupying()"
                  (click)="continue()">
            @if (occupying()) { Reservando mesa... } @else { Continuar }
          </button>
        }
      }
    </div>
  `,
  styles: [`
    .container { max-width: 800px; margin: 0 auto; }
    .back-link { color: var(--text-muted); font-size: 14px; }
    .people-form { display: flex; gap: 16px; align-items: flex-end; margin-bottom: 20px; }
    .people-form .form-group { flex: 1; margin-bottom: 0; }
    .tables-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin: 16px 0; }
    .table-card { display: flex; flex-direction: column; gap: 4px; padding: 16px; text-align: left; cursor: pointer; }
    .table-card.selected { border-color: var(--green-medium); background: var(--green-glow); }
    .table-card .desc { color: var(--text-muted); font-size: 13px; }
    .continue { margin-top: 8px; }
  `]
})
export class TableSelectionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly restaurantService = inject(RestaurantService)
  private readonly tableService = inject(TableService)
  private readonly cartStore = inject(CartStore)

  private restaurantId = ''

  readonly restaurant = signal<Restaurant | null>(null)
  readonly people = signal<number | null>(2)
  readonly tables = signal<RestaurantTable[]>([])
  readonly selectedId = signal<string | null>(null)
  readonly searched = signal(false)
  readonly searchedPeople = signal(0)
  readonly loading = signal(false)
  readonly occupying = signal(false)
  readonly error = signal<string | null>(null)
  readonly notice = signal<string | null>(null)

  ngOnInit(): void {
    this.restaurantId = this.route.snapshot.paramMap.get('id')!
    this.restaurantService.getById(this.restaurantId).subscribe({
      next: (restaurant) => this.restaurant.set(restaurant),
      error: () => this.error.set('Error al cargar el restaurante')
    })
  }

  search(): void {
    this.notice.set(null)
    this.loadAvailable()
  }

  private loadAvailable(): void {
    const people = Number(this.people())
    if (!Number.isInteger(people) || people < 1) {
      this.error.set('Indica un número de personas válido (entero mayor que 0)')
      return
    }
    this.error.set(null)
    this.loading.set(true)
    this.selectedId.set(null)
    this.tableService.getAvailable(this.restaurantId, people).subscribe({
      next: (tables) => {
        this.tables.set(tables)
        this.searchedPeople.set(people)
        this.searched.set(true)
        this.loading.set(false)
      },
      error: () => {
        this.error.set('Error al cargar las mesas disponibles')
        this.loading.set(false)
      }
    })
  }

  continue(): void {
    const tableId = this.selectedId()
    if (!tableId) return
    this.occupying.set(true)
    this.error.set(null)
    this.notice.set(null)
    this.tableService.occupy(this.restaurantId, tableId).subscribe({
      next: (table) => {
        this.cartStore.setTable(this.restaurantId, table.id)
        this.occupying.set(false)
        this.router.navigate(['/restaurants', this.restaurantId])
      },
      error: (err: HttpErrorResponse) => {
        this.occupying.set(false)
        if (err.status === 409) {
          this.notice.set('Esa mesa se acaba de ocupar. Elige otra de las mesas disponibles.')
          this.loadAvailable()
        } else {
          this.error.set('Error al ocupar la mesa. Inténtalo de nuevo.')
        }
      }
    })
  }
}
