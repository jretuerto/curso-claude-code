import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app.js'
import { dbConfig } from '@config/database.js'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-resttek-key'

const tokenFor = (role: string, restaurantId: string | null = 'r1') =>
    `Bearer ${jwt.sign({ id: `${role}-id`, role, restaurantId }, JWT_SECRET, { expiresIn: '8h' })}`

const admin = tokenFor('admin', null)
const manager = tokenFor('manager')
const camarero = tokenFor('camarero')
const cocinero = tokenFor('cocinero')
const cliente = tokenFor('cliente', null)

const BASE = '/api/v1/restaurants/r1/tables'

describe('Table routes (HTTP)', () => {
    beforeAll(async () => {
        await dbConfig.initialize()
        const now = new Date().toISOString()
        for (const id of ['r1', 'r2']) {
            await dbConfig.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, 'Restaurante ' + id, 'Calle Mayor 10', 'info@r.com', '912345678', 'Carlos', 'García', now, now]
            )
        }
    })

    afterAll(async () => {
        await dbConfig.close()
    })

    const createTable = (body: object, restaurant = 'r1') =>
        request(app).post(`/api/v1/restaurants/${restaurant}/tables`).set('Authorization', admin).send(body)

    describe('POST /', () => {
        it('should create a table as admin with status libre by default (201)', async () => {
            const res = await createTable({ number: 1, capacity: 4 })

            expect(res.status).toBe(201)
            expect(res.body).toEqual({
                id: expect.any(String),
                restaurantId: 'r1',
                number: 1,
                description: null,
                capacity: 4,
                status: 'libre',
                createdAt: expect.any(String),
                updatedAt: expect.any(String)
            })
        })

        it('should return 403 for other roles and 401 without token', async () => {
            for (const token of [manager, camarero, cocinero, cliente]) {
                const res = await request(app).post(BASE).set('Authorization', token).send({ number: 50, capacity: 2 })
                expect(res.status).toBe(403)
                expect(res.body).toEqual({ error: 'Forbidden: Insufficient permissions' })
            }
            const res = await request(app).post(BASE).send({ number: 50, capacity: 2 })
            expect(res.status).toBe(401)
            expect(res.body).toEqual({ error: 'Unauthorized: No token provided' })
        })

        it('should return 400 for invalid number, capacity or status', async () => {
            const cases = [
                [{ number: 0, capacity: 4 }, 'InvalidTableNumberError'],
                [{ number: '2', capacity: 4 }, 'InvalidTableNumberError'],
                [{ number: 2, capacity: 1.5 }, 'InvalidCapacityError'],
                [{ number: 2, capacity: 4, status: 'cerrada' }, 'InvalidTableStatusError']
            ] as const
            for (const [body, error] of cases) {
                const res = await createTable(body)
                expect(res.status).toBe(400)
                expect(res.body.error).toBe(error)
                expect(typeof res.body.message).toBe('string')
            }
        })

        it('should return 409 for a repeated number in the same restaurant', async () => {
            const res = await createTable({ number: 1, capacity: 2 })
            expect(res.status).toBe(409)
            expect(res.body).toEqual({ error: 'DuplicatedTableNumberError', message: 'Table number already exists in this restaurant' })
        })
    })

    describe('GET / and GET /:id', () => {
        it('should list the tables ordered by number for employee roles', async () => {
            await createTable({ number: 3, description: ' Terraza ', capacity: 6, status: 'Reservada' })
            await createTable({ number: 1, capacity: 4 }, 'r2')

            for (const token of [admin, manager, camarero, cocinero]) {
                const res = await request(app).get(BASE).set('Authorization', token)
                expect(res.status).toBe(200)
                expect(res.body.map((t: { number: number }) => t.number)).toEqual([1, 3])
            }
            const res = await request(app).get(BASE).set('Authorization', admin)
            expect(res.body[1]).toMatchObject({ description: 'Terraza', status: 'reservada' })
        })

        it('should return 403 to a cliente', async () => {
            const res = await request(app).get(BASE).set('Authorization', cliente)
            expect(res.status).toBe(403)
        })

        it('should get a table by id and 404 when missing or from another restaurant', async () => {
            const created = await createTable({ number: 4, capacity: 2 })

            const ok = await request(app).get(`${BASE}/${created.body.id}`).set('Authorization', camarero)
            expect(ok.status).toBe(200)
            expect(ok.body).toEqual(created.body)

            const missing = await request(app).get(`${BASE}/nope`).set('Authorization', camarero)
            expect(missing.status).toBe(404)
            expect(missing.body).toEqual({ error: 'TableNotFoundError', message: 'Table not found' })

            const other = await request(app).get(`/api/v1/restaurants/r2/tables/${created.body.id}`).set('Authorization', admin)
            expect(other.status).toBe(404)
        })
    })

    describe('PUT /:id and DELETE /:id', () => {
        it('should update a table as admin keeping the status when not sent', async () => {
            const created = await createTable({ number: 5, capacity: 2, status: 'ocupada' })

            const res = await request(app).put(`${BASE}/${created.body.id}`).set('Authorization', admin)
                .send({ number: 6, description: 'Salón', capacity: 8 })

            expect(res.status).toBe(200)
            expect(res.body).toMatchObject({ id: created.body.id, number: 6, description: 'Salón', capacity: 8, status: 'ocupada' })
        })

        it('should return 403, 404 and 409 on update when appropriate', async () => {
            const created = await createTable({ number: 7, capacity: 2 })
            const url = `${BASE}/${created.body.id}`

            expect((await request(app).put(url).set('Authorization', manager).send({ number: 7, capacity: 2 })).status).toBe(403)
            expect((await request(app).put(`${BASE}/nope`).set('Authorization', admin).send({ number: 7, capacity: 2 })).status).toBe(404)
            expect((await request(app).put(url).set('Authorization', admin).send({ number: 1, capacity: 2 })).status).toBe(409)
            expect((await request(app).put(url).set('Authorization', admin).send({ capacity: 2 })).status).toBe(400)
        })

        it('should delete a table as admin (204) and 404 afterwards', async () => {
            const created = await createTable({ number: 8, capacity: 2 })
            const url = `${BASE}/${created.body.id}`

            expect((await request(app).delete(url).set('Authorization', camarero)).status).toBe(403)

            const res = await request(app).delete(url).set('Authorization', admin)
            expect(res.status).toBe(204)
            expect(res.body).toEqual({})

            expect((await request(app).delete(url).set('Authorization', admin)).status).toBe(404)
        })
    })

    describe('PATCH /:id/status', () => {
        it('should let employee roles change the status', async () => {
            const created = await createTable({ number: 9, capacity: 2 })
            const url = `${BASE}/${created.body.id}/status`

            for (const [token, status] of [[manager, 'ocupada'], [camarero, 'reservada'], [cocinero, 'LIBRE'], [admin, 'ocupada']] as const) {
                const res = await request(app).patch(url).set('Authorization', token).send({ status })
                expect(res.status).toBe(200)
                expect(res.body.status).toBe(status.toLowerCase())
            }
        })

        it('should return 403 to a cliente, 400 for an invalid status and 404 when missing', async () => {
            const created = await createTable({ number: 10, capacity: 2 })
            const url = `${BASE}/${created.body.id}/status`

            expect((await request(app).patch(url).set('Authorization', cliente).send({ status: 'libre' })).status).toBe(403)

            const invalid = await request(app).patch(url).set('Authorization', camarero).send({ status: 'cerrada' })
            expect(invalid.status).toBe(400)
            expect(invalid.body.error).toBe('InvalidTableStatusError')

            expect((await request(app).patch(url).set('Authorization', camarero).send({})).status).toBe(400)
            expect((await request(app).patch(`${BASE}/nope/status`).set('Authorization', camarero).send({ status: 'libre' })).status).toBe(404)
        })
    })

    describe('GET /available and POST /:id/occupy', () => {
        it('should list only free tables with enough capacity for a cliente', async () => {
            for (const [number, capacity, status] of [[20, 4, 'libre'], [21, 10, 'libre'], [22, 12, 'ocupada'], [23, 2, 'libre']] as const) {
                await createTable({ number, capacity, status })
            }

            const res = await request(app).get(`${BASE}/available?people=4`).set('Authorization', cliente)

            expect(res.status).toBe(200)
            for (const table of res.body) {
                expect(table.status).toBe('libre')
                expect(table.capacity).toBeGreaterThanOrEqual(4)
            }
            const capacities = res.body.map((t: { capacity: number }) => t.capacity)
            expect(capacities).toEqual([...capacities].sort((a: number, b: number) => a - b))
            expect(res.body.map((t: { number: number }) => t.number)).toContain(21)
            expect(res.body.map((t: { number: number }) => t.number)).not.toContain(22)
        })

        it('should return 400 for an invalid people value and 403 to employees', async () => {
            for (const query of ['', '?people=0', '?people=2.5', '?people=abc']) {
                const res = await request(app).get(`${BASE}/available${query}`).set('Authorization', cliente)
                expect(res.status).toBe(400)
                expect(res.body).toEqual({ error: 'InvalidPeopleCountError', message: 'People must be a positive integer' })
            }
            expect((await request(app).get(`${BASE}/available?people=2`).set('Authorization', camarero)).status).toBe(403)
        })

        it('should occupy a free table once and return 409 the second time', async () => {
            const created = await createTable({ number: 30, capacity: 4 })
            const url = `${BASE}/${created.body.id}/occupy`

            const first = await request(app).post(url).set('Authorization', cliente)
            expect(first.status).toBe(200)
            expect(first.body).toMatchObject({ id: created.body.id, status: 'ocupada' })

            const second = await request(app).post(url).set('Authorization', cliente)
            expect(second.status).toBe(409)
            expect(second.body).toEqual({ error: 'TableNotAvailableError', message: 'Table is not available' })
        })

        it('should return 403 to employees and 404 for a table of another restaurant', async () => {
            const created = await createTable({ number: 31, capacity: 4 })

            expect((await request(app).post(`${BASE}/${created.body.id}/occupy`).set('Authorization', camarero)).status).toBe(403)
            expect((await request(app).post(`/api/v1/restaurants/r2/tables/${created.body.id}/occupy`).set('Authorization', cliente)).status).toBe(404)
        })
    })
})
