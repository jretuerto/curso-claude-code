import { Database } from '@config/database.js'
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
