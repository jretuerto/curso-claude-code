import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { errorHandler } from './errorHandler.js'
import {
    TableNotFoundError,
    TableNotAvailableError,
    DuplicatedTableNumberError,
    InvalidTableNumberError,
    InvalidPeopleCountError
} from '@errors/DomainErrors.js'

function run(error: unknown) {
    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
    }
    errorHandler(error, {} as Request, res as unknown as Response, (() => {}) as NextFunction)
    return res
}

describe('errorHandler', () => {
    it('should map TableNotFoundError to 404', () => {
        const res = run(new TableNotFoundError())
        expect(res.status).toHaveBeenCalledWith(404)
        expect(res.json).toHaveBeenCalledWith({ error: 'TableNotFoundError', message: 'Table not found' })
    })

    it('should map TableNotAvailableError to 409', () => {
        const res = run(new TableNotAvailableError())
        expect(res.status).toHaveBeenCalledWith(409)
        expect(res.json).toHaveBeenCalledWith({ error: 'TableNotAvailableError', message: 'Table is not available' })
    })

    it('should map DuplicatedTableNumberError to 409', () => {
        const res = run(new DuplicatedTableNumberError())
        expect(res.status).toHaveBeenCalledWith(409)
    })

    it('should map table validation errors to 400', () => {
        expect(run(new InvalidTableNumberError()).status).toHaveBeenCalledWith(400)
        expect(run(new InvalidPeopleCountError()).status).toHaveBeenCalledWith(400)
    })

    it('should map unknown errors to 500', () => {
        expect(run(new Error('boom')).status).toHaveBeenCalledWith(500)
    })
})
