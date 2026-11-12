import { TestBed } from '@angular/core/testing'
import { of, throwError } from 'rxjs'
import { vi } from 'vitest'
import { TableService } from '../services/table.service'
import type { RestaurantTable } from '../models/table.model'
import { TableStore } from './table.store'

function table(id: string, number: number, extra: Partial<RestaurantTable> = {}): RestaurantTable {
  return {
    id, restaurantId: 'rest-1', number, description: null, capacity: 4,
    status: 'libre', createdAt: '', updatedAt: '', ...extra
  }
}

describe('TableStore', () => {
  let service: {
    getAll: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
  let store: TableStore

  beforeEach(() => {
    service = { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() }
    TestBed.configureTestingModule({ providers: [{ provide: TableService, useValue: service }] })
    store = TestBed.inject(TableStore)
  })

  it('loadByRestaurant carga las mesas', async () => {
    service.getAll.mockReturnValue(of([table('t1', 1), table('t2', 2)]))
    await store.loadByRestaurant('rest-1')
    expect(service.getAll).toHaveBeenCalledWith('rest-1')
    expect(store.tables().map(t => t.id)).toEqual(['t1', 't2'])
    expect(store.loading()).toBe(false)
    expect(store.error()).toBeNull()
  })

  it('loadByRestaurant expone un error si falla', async () => {
    service.getAll.mockReturnValue(throwError(() => new Error('x')))
    await store.loadByRestaurant('rest-1')
    expect(store.error()).toBe('No se pudieron cargar las mesas.')
    expect(store.loading()).toBe(false)
  })

  it('loadByRestaurant vacía la lista al cambiar de restaurante', async () => {
    service.getAll.mockReturnValueOnce(of([table('t1', 1)]))
    await store.loadByRestaurant('rest-1')
    service.getAll.mockReturnValueOnce(of([]))
    await store.loadByRestaurant('rest-2')
    expect(store.tables()).toEqual([])
  })

  it('create añade la mesa a la lista', async () => {
    service.create.mockReturnValue(of(table('t3', 3)))
    await store.create('rest-1', { number: 3, capacity: 4 })
    expect(service.create).toHaveBeenCalledWith('rest-1', { number: 3, capacity: 4 })
    expect(store.tables().map(t => t.id)).toEqual(['t3'])
  })

  it('create propaga el error de la API y no modifica la lista', async () => {
    const err = { error: { error: 'DuplicatedTableNumberError' } }
    service.create.mockReturnValue(throwError(() => err))
    await expect(store.create('rest-1', { number: 3, capacity: 4 })).rejects.toBe(err)
    expect(store.tables()).toEqual([])
  })

  it('update reemplaza la mesa en la lista', async () => {
    service.getAll.mockReturnValue(of([table('t1', 1), table('t2', 2)]))
    await store.loadByRestaurant('rest-1')
    service.update.mockReturnValue(of(table('t2', 5, { capacity: 6 })))
    await store.update('rest-1', 't2', { number: 5, capacity: 6 })
    expect(service.update).toHaveBeenCalledWith('rest-1', 't2', { number: 5, capacity: 6 })
    expect(store.tables().find(t => t.id === 't2')?.number).toBe(5)
    expect(store.tables()).toHaveLength(2)
  })

  it('delete elimina la mesa de la lista', async () => {
    service.getAll.mockReturnValue(of([table('t1', 1), table('t2', 2)]))
    await store.loadByRestaurant('rest-1')
    service.delete.mockReturnValue(of(undefined))
    await store.delete('rest-1', 't1')
    expect(service.delete).toHaveBeenCalledWith('rest-1', 't1')
    expect(store.tables().map(t => t.id)).toEqual(['t2'])
  })
})
