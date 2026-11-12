import { Database } from '@config/database.js'
import { SqliteTableRepository } from './table.repository.js'
import type { RestaurantTable } from '@models/table.model.js'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

describe('restaurant_tables schema', () => {
    let db: Database

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        await db.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['r1', 'La Trattoria', 'Calle Mayor 10', 'info@trattoria.com', '+34 612345678', 'Carlos', 'García', new Date().toISOString(), new Date().toISOString()]
        )
    })

    afterAll(async () => {
        await db.close()
    })

    const insert = (id: string, number: number) => db.run(
        'INSERT INTO restaurant_tables (id, restaurant_id, number, description, capacity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, 'r1', number, null, 4, 'libre', new Date().toISOString(), new Date().toISOString()]
    )

    it('should create the restaurant_tables table', async () => {
        await insert('s1', 1)
        const row = await db.get<{ id: string }>('SELECT id FROM restaurant_tables WHERE id = ?', ['s1'])
        expect(row?.id).toBe('s1')
    })

    it('should enforce a unique number per restaurant', async () => {
        await expect(insert('s2', 1)).rejects.toThrow(/UNIQUE/)
    })
})

describe('SqliteTableRepository (Integration)', () => {
    let db: Database
    let repo: SqliteTableRepository

    const now = new Date().toISOString()
    const table = (overrides: Partial<RestaurantTable> = {}): RestaurantTable => ({
        id: 't1',
        restaurantId: 'r1',
        number: 2,
        description: 'Terraza',
        capacity: 4,
        status: 'libre',
        createdAt: now,
        updatedAt: now,
        ...overrides
    })

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteTableRepository(db)
        for (const id of ['r1', 'r2']) {
            await db.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, 'Restaurante ' + id, 'Calle Mayor 10', 'info@trattoria.com', '+34 612345678', 'Carlos', 'García', now, now]
            )
        }
    })

    afterAll(async () => {
        await db.close()
    })

    it('should save and find a table by id', async () => {
        await repo.save(table())
        const found = await repo.findById('t1')
        expect(found).toEqual(table())
    })

    it('should return null when the table does not exist', async () => {
        expect(await repo.findById('nope')).toBeNull()
    })

    it('should find the tables of a restaurant ordered by number', async () => {
        await repo.save(table({ id: 't2', number: 1, description: null }))
        await repo.save(table({ id: 't3', restaurantId: 'r2', number: 1 }))
        const results = await repo.findByRestaurantId('r1')
        expect(results.map(t => t.id)).toEqual(['t2', 't1'])
    })

    it('should find a table by restaurant and number', async () => {
        expect((await repo.findByNumber('r1', 2))?.id).toBe('t1')
        expect((await repo.findByNumber('r2', 1))?.id).toBe('t3')
        expect(await repo.findByNumber('r1', 99)).toBeNull()
    })

    it('should update an existing table', async () => {
        await repo.save(table({ number: 5, description: null, capacity: 6, status: 'reservada', updatedAt: 'later' }))
        const found = await repo.findById('t1')
        expect(found).toMatchObject({ number: 5, description: null, capacity: 6, status: 'reservada', updatedAt: 'later', createdAt: now })
    })

    it('should delete a table', async () => {
        await repo.delete('t1')
        expect(await repo.findById('t1')).toBeNull()
    })
})
