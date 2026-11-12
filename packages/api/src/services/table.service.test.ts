import { describe, it, expect, beforeEach } from 'vitest'
import { normalizeTableStatus } from '@models/table.model.js'
import {
    InvalidTableStatusError,
    InvalidTableNumberError,
    InvalidCapacityError,
    DuplicatedTableNumberError,
    TableNotFoundError,
    TableNotAvailableError,
    InvalidPeopleCountError
} from '@errors/DomainErrors.js'
import { TableService } from './table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'

describe('normalizeTableStatus', () => {
    it('should accept all valid statuses', () => {
        for (const s of ['libre', 'ocupada', 'reservada']) {
            expect(normalizeTableStatus(s)).toBe(s)
        }
    })

    it('should normalize uppercase and surrounding spaces', () => {
        expect(normalizeTableStatus('  OCUPADA ')).toBe('ocupada')
    })

    it('should throw InvalidTableStatusError for an invalid status', () => {
        expect(() => normalizeTableStatus('cerrada')).toThrow(InvalidTableStatusError)
        expect(() => normalizeTableStatus('cerrada'))
            .toThrow('Invalid table status: cerrada. Must be one of: libre, ocupada, reservada')
    })

    it('should throw InvalidTableStatusError for an empty or missing status', () => {
        expect(() => normalizeTableStatus('')).toThrow('Table status must be provided')
        expect(() => normalizeTableStatus(undefined as unknown as string)).toThrow(InvalidTableStatusError)
    })
})

describe('TableService', () => {
    let repo: MockTableRepository
    let service: TableService

    const validInput = { restaurantId: 'r1', number: 1, description: 'Terraza', capacity: 4 }

    beforeEach(() => {
        repo = new MockTableRepository()
        service = new TableService(repo)
    })

    describe('create', () => {
        it('should create a table with status libre by default', async () => {
            const result = await service.create(validInput)

            expect(result.id).toBeDefined()
            expect(result).toMatchObject({ restaurantId: 'r1', number: 1, description: 'Terraza', capacity: 4, status: 'libre' })
            expect(result.createdAt).toBe(result.updatedAt)
            expect(await repo.findById(result.id)).toEqual(result)
        })

        it('should accept and normalize an explicit status', async () => {
            const result = await service.create({ ...validInput, status: ' RESERVADA ' })
            expect(result.status).toBe('reservada')
        })

        it('should throw InvalidTableStatusError for an invalid status', async () => {
            await expect(service.create({ ...validInput, status: 'cerrada' })).rejects.toThrow(InvalidTableStatusError)
        })

        it('should store a trimmed description and null when empty or missing', async () => {
            expect((await service.create({ ...validInput, number: 1, description: '  Salón  ' })).description).toBe('Salón')
            expect((await service.create({ ...validInput, number: 2, description: '   ' })).description).toBeNull()
            expect((await service.create({ restaurantId: 'r1', number: 3, capacity: 2 })).description).toBeNull()
        })

        it.each([0, -1, 2.5, '4', null, undefined])('should throw InvalidTableNumberError for number %s', async (number) => {
            await expect(service.create({ ...validInput, number: number as unknown as number }))
                .rejects.toThrow(InvalidTableNumberError)
        })

        it.each([0, -3, 1.5, '4', null, undefined])('should throw InvalidCapacityError for capacity %s', async (capacity) => {
            await expect(service.create({ ...validInput, capacity: capacity as unknown as number }))
                .rejects.toThrow(InvalidCapacityError)
        })

        it('should throw DuplicatedTableNumberError when the number exists in the restaurant', async () => {
            await service.create(validInput)
            await expect(service.create(validInput)).rejects.toThrow(DuplicatedTableNumberError)
        })

        it('should allow the same number in another restaurant', async () => {
            await service.create(validInput)
            const other = await service.create({ ...validInput, restaurantId: 'r2' })
            expect(other.number).toBe(1)
        })
    })

    describe('update', () => {
        it('should replace the editable fields and keep the status when not sent', async () => {
            const created = await service.create({ ...validInput, status: 'ocupada' })

            const updated = await service.update('r1', created.id, { number: 7, capacity: 6 })

            expect(updated).toMatchObject({
                id: created.id,
                restaurantId: 'r1',
                number: 7,
                description: null,
                capacity: 6,
                status: 'ocupada',
                createdAt: created.createdAt
            })
            expect(await repo.findById(created.id)).toEqual(updated)
        })

        it('should change the status when sent', async () => {
            const created = await service.create(validInput)
            const updated = await service.update('r1', created.id, { ...validInput, status: 'Reservada' })
            expect(updated.status).toBe('reservada')
        })

        it('should allow keeping its own number', async () => {
            const created = await service.create(validInput)
            const updated = await service.update('r1', created.id, { number: 1, capacity: 8 })
            expect(updated.capacity).toBe(8)
        })

        it('should throw DuplicatedTableNumberError when the number belongs to another table', async () => {
            await service.create(validInput)
            const second = await service.create({ ...validInput, number: 2 })
            await expect(service.update('r1', second.id, { number: 1, capacity: 4 }))
                .rejects.toThrow(DuplicatedTableNumberError)
        })

        it('should validate number and capacity', async () => {
            const created = await service.create(validInput)
            await expect(service.update('r1', created.id, { number: 0, capacity: 4 })).rejects.toThrow(InvalidTableNumberError)
            await expect(service.update('r1', created.id, { number: 1, capacity: 0 })).rejects.toThrow(InvalidCapacityError)
        })

        it('should throw TableNotFoundError when the table does not exist', async () => {
            await expect(service.update('r1', 'nope', { number: 1, capacity: 4 })).rejects.toThrow(TableNotFoundError)
        })

        it('should throw TableNotFoundError when the table belongs to another restaurant', async () => {
            const created = await service.create(validInput)
            await expect(service.update('r2', created.id, { number: 1, capacity: 4 })).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('findById', () => {
        it('should return the table of the restaurant', async () => {
            const created = await service.create(validInput)
            expect(await service.findById('r1', created.id)).toEqual(created)
        })

        it('should throw TableNotFoundError when missing or from another restaurant', async () => {
            const created = await service.create(validInput)
            await expect(service.findById('r1', 'nope')).rejects.toThrow(TableNotFoundError)
            await expect(service.findById('r2', created.id)).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('findByRestaurantId', () => {
        it('should return only the tables of the restaurant ordered by number', async () => {
            await service.create({ ...validInput, number: 3 })
            await service.create({ ...validInput, number: 1 })
            await service.create({ ...validInput, restaurantId: 'r2', number: 2 })

            const result = await service.findByRestaurantId('r1')
            expect(result.map(t => t.number)).toEqual([1, 3])
        })

        it('should return an empty list for a restaurant without tables', async () => {
            expect(await service.findByRestaurantId('unknown')).toEqual([])
        })
    })

    describe('delete', () => {
        it('should delete a table in any status', async () => {
            const created = await service.create({ ...validInput, status: 'ocupada' })
            await service.delete('r1', created.id)
            expect(await repo.findById(created.id)).toBeNull()
        })

        it('should throw TableNotFoundError when missing or from another restaurant', async () => {
            const created = await service.create(validInput)
            await expect(service.delete('r1', 'nope')).rejects.toThrow(TableNotFoundError)
            await expect(service.delete('r2', created.id)).rejects.toThrow(TableNotFoundError)
            expect(await repo.findById(created.id)).not.toBeNull()
        })
    })

    describe('updateStatus', () => {
        it('should change the status and return the updated table', async () => {
            const created = await service.create({ ...validInput, status: 'ocupada' })
            const updated = await service.updateStatus('r1', created.id, ' LIBRE ')
            expect(updated.status).toBe('libre')
            expect((await repo.findById(created.id))?.status).toBe('libre')
        })

        it('should throw InvalidTableStatusError for an invalid or missing status', async () => {
            const created = await service.create(validInput)
            await expect(service.updateStatus('r1', created.id, 'cerrada')).rejects.toThrow(InvalidTableStatusError)
            await expect(service.updateStatus('r1', created.id, undefined as unknown as string)).rejects.toThrow(InvalidTableStatusError)
        })

        it('should throw TableNotFoundError when missing or from another restaurant', async () => {
            const created = await service.create(validInput)
            await expect(service.updateStatus('r1', 'nope', 'libre')).rejects.toThrow(TableNotFoundError)
            await expect(service.updateStatus('r2', created.id, 'libre')).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('findAvailable', () => {
        beforeEach(async () => {
            await service.create({ ...validInput, number: 1, capacity: 6 })
            await service.create({ ...validInput, number: 2, capacity: 2 })
            await service.create({ ...validInput, number: 3, capacity: 4 })
            await service.create({ ...validInput, number: 4, capacity: 8, status: 'ocupada' })
        })

        it('should return free tables with enough capacity ordered by capacity', async () => {
            const result = await service.findAvailable('r1', 3)
            expect(result.map(t => t.number)).toEqual([3, 1])
        })

        it('should accept people as a numeric string (query param)', async () => {
            const result = await service.findAvailable('r1', '4')
            expect(result.map(t => t.number)).toEqual([3, 1])
        })

        it.each([0, -1, 2.5, '0', '2.5', 'abc', '', ' ', '4abc', null, undefined])('should throw InvalidPeopleCountError for people %s', async (people) => {
            await expect(service.findAvailable('r1', people)).rejects.toThrow(InvalidPeopleCountError)
        })
    })

    describe('occupy', () => {
        it('should occupy a free table and return it', async () => {
            const created = await service.create(validInput)
            const occupied = await service.occupy('r1', created.id)
            expect(occupied.status).toBe('ocupada')
            expect((await repo.findById(created.id))?.status).toBe('ocupada')
        })

        it('should throw TableNotAvailableError when the table is not free', async () => {
            const created = await service.create(validInput)
            await service.occupy('r1', created.id)
            await expect(service.occupy('r1', created.id)).rejects.toThrow(TableNotAvailableError)

            const reserved = await service.create({ ...validInput, number: 2, status: 'reservada' })
            await expect(service.occupy('r1', reserved.id)).rejects.toThrow(TableNotAvailableError)
        })

        it('should throw TableNotFoundError when missing or from another restaurant', async () => {
            const created = await service.create(validInput)
            await expect(service.occupy('r1', 'nope')).rejects.toThrow(TableNotFoundError)
            await expect(service.occupy('r2', created.id)).rejects.toThrow(TableNotFoundError)
            expect((await repo.findById(created.id))?.status).toBe('libre')
        })
    })
})
