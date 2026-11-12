import { describe, it, expect } from 'vitest'
import { normalizeTableStatus } from '@models/table.model.js'
import { InvalidTableStatusError } from '@errors/DomainErrors.js'

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
