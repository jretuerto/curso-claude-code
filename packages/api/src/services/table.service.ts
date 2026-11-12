import { randomUUID } from 'crypto'
import type { RestaurantTable, TableStatusType } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import {
    InvalidTableNumberError,
    InvalidCapacityError,
    DuplicatedTableNumberError,
    TableNotFoundError
} from '@errors/DomainErrors.js'

export interface CreateTableDTO {
    restaurantId: string
    number: number
    description?: string | null
    capacity: number
    status?: string
}

export interface UpdateTableDTO {
    number: number
    description?: string | null
    capacity: number
    status?: string
}

export class TableService {
    constructor(private readonly tableRepository: TableRepository) {}

    async create(dto: CreateTableDTO): Promise<RestaurantTable> {
        const now = new Date().toISOString()
        const table = this.buildTable({
            id: randomUUID(),
            restaurantId: dto.restaurantId,
            number: dto.number,
            description: dto.description,
            capacity: dto.capacity,
            status: dto.status === undefined ? 'libre' : normalizeTableStatus(dto.status),
            createdAt: now,
            updatedAt: now
        })

        await this.ensureNumberIsFree(table)
        await this.tableRepository.save(table)
        return table
    }

    async update(restaurantId: string, id: string, dto: UpdateTableDTO): Promise<RestaurantTable> {
        const existing = await this.getOwnedTable(restaurantId, id)

        const updated = this.buildTable({
            id: existing.id,
            restaurantId: existing.restaurantId,
            number: dto.number,
            description: dto.description,
            capacity: dto.capacity,
            status: dto.status === undefined ? existing.status : normalizeTableStatus(dto.status),
            createdAt: existing.createdAt,
            updatedAt: new Date().toISOString()
        })

        await this.ensureNumberIsFree(updated)
        await this.tableRepository.save(updated)
        return updated
    }

    private async getOwnedTable(restaurantId: string, id: string): Promise<RestaurantTable> {
        const table = await this.tableRepository.findById(id)
        if (!table || table.restaurantId !== restaurantId) {
            throw new TableNotFoundError()
        }
        return table
    }

    private async ensureNumberIsFree(table: RestaurantTable): Promise<void> {
        const sameNumber = await this.tableRepository.findByNumber(table.restaurantId, table.number)
        if (sameNumber && sameNumber.id !== table.id) {
            throw new DuplicatedTableNumberError()
        }
    }

    private buildTable(props: {
        id: string
        restaurantId: string
        number: unknown
        description: unknown
        capacity: unknown
        status: TableStatusType
        createdAt: string
        updatedAt: string
    }): RestaurantTable {
        if (!isPositiveInteger(props.number)) {
            throw new InvalidTableNumberError()
        }
        if (!isPositiveInteger(props.capacity)) {
            throw new InvalidCapacityError()
        }

        return {
            id: props.id,
            restaurantId: props.restaurantId,
            number: props.number,
            description: normalizeDescription(props.description),
            capacity: props.capacity,
            status: props.status,
            createdAt: props.createdAt,
            updatedAt: props.updatedAt
        }
    }
}

function isPositiveInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function normalizeDescription(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
}
