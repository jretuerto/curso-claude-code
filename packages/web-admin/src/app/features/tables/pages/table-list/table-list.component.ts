import { Component, DestroyRef, inject, OnInit } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TableStore } from '../../store/table.store'
import type { RestaurantTable } from '../../models/table.model'

@Component({
  selector: 'app-table-list',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './table-list.component.html',
  styleUrl: './table-list.component.css'
})
export class TableListComponent implements OnInit {
  readonly store = inject(TableStore)
  private readonly route = inject(ActivatedRoute)
  private readonly destroyRef = inject(DestroyRef)
  restaurantId = ''

  ngOnInit(): void {
    // El componente se reutiliza al cambiar de restaurante, así que hay que escuchar el parámetro.
    this.route.parent?.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.restaurantId = params.get('restaurantId') ?? ''
      if (this.restaurantId) {
        this.store.loadByRestaurant(this.restaurantId)
      }
    })
  }

  async onDelete(table: RestaurantTable): Promise<void> {
    if (!this.restaurantId) return
    const aviso = table.status === 'ocupada' ? ' Está ocupada ahora mismo.' : ''
    if (confirm(`¿Estás seguro de eliminar la mesa ${table.number}?${aviso}`)) {
      try {
        await this.store.delete(this.restaurantId, table.id)
      } catch {
        alert('Error al eliminar la mesa.')
      }
    }
  }
}
