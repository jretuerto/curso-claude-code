import { describe, it, expect, beforeEach } from 'vitest'
import { normalizeTableStatus } from '@models/table.model.js'
import {
    InvalidTableStatusError,
    InvalidTableNumberError,
    InvalidCapacityError,
    DuplicatedTableNumberError,
    TableNotFoundError
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
})
