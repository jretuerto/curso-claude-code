import { Component, inject, OnInit, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { firstValueFrom } from 'rxjs'
import { TableStore } from '../../store/table.store'
import { TableService } from '../../services/table.service'
import { tableErrorMessage, validateTableForm } from '../../table-errors'
import type { TableStatus } from '../../models/table.model'

@Component({
  selector: 'app-table-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './table-form.component.html',
  styleUrl: './table-form.component.css'
})
export class TableFormComponent implements OnInit {
  private readonly store = inject(TableStore)
  private readonly service = inject(TableService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)

  isEditing = false
  tableId: string | null = null
  restaurantId = ''
  loading = signal(false)
  error = signal<string | null>(null)

  statuses: TableStatus[] = ['libre', 'ocupada', 'reservada']

  form: { number: number | null; description: string; capacity: number | null; status: TableStatus } = {
    number: null,
    description: '',
    capacity: null,
    status: 'libre'
  }

  get pageTitle(): string {
    return this.isEditing ? 'Editar mesa' : 'Nueva mesa'
  }

  get listUrl(): string {
    return `/restaurants/${this.restaurantId}/tables`
  }

  ngOnInit(): void {
    this.restaurantId = this.route.parent?.snapshot.params['restaurantId'] ?? ''
    const id = this.route.snapshot.paramMap.get('id')

    if (id && this.restaurantId) {
      this.isEditing = true
      this.tableId = id
      this.loadTable()
    }
  }

  private async loadTable(): Promise<void> {
    this.loading.set(true)
    try {
      const tables = await firstValueFrom(this.service.getAll(this.restaurantId))
      const found = tables.find(t => t.id === this.tableId)
      if (found) {
        this.form = {
          number: found.number,
          description: found.description ?? '',
          capacity: found.capacity,
          status: found.status
        }
      } else {
        this.error.set('La mesa no existe.')
      }
    } catch {
      this.error.set('No se pudo cargar la mesa.')
    } finally {
      this.loading.set(false)
    }
  }

  async onSubmit(): Promise<void> {
    this.error.set(null)
    const invalid = validateTableForm(this.form)
    if (invalid) {
      this.error.set(invalid)
      return
    }
    const dto = {
      number: this.form.number as number,
      capacity: this.form.capacity as number,
      description: this.form.description.trim() || null
    }
    this.loading.set(true)
    try {
      if (this.isEditing && this.tableId) {
        // En edición se reenvía el estado cargado para no cambiarlo por accidente.
        await this.store.update(this.restaurantId, this.tableId, { ...dto, status: this.form.status })
      } else {
        await this.store.create(this.restaurantId, { ...dto, status: this.form.status })
      }
      this.router.navigate(['/restaurants', this.restaurantId, 'tables'])
    } catch (err) {
      this.error.set(tableErrorMessage(err))
    } finally {
      this.loading.set(false)
    }
  }
}
