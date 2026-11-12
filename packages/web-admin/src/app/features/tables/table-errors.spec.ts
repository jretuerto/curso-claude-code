import { tableErrorMessage, validateTableForm } from './table-errors'

describe('tableErrorMessage', () => {
  it('traduce los errores de dominio por el campo error', () => {
    expect(tableErrorMessage({ error: { error: 'DuplicatedTableNumberError', message: 'x' } }))
      .toBe('Ya existe otra mesa con ese número en el restaurante.')
    expect(tableErrorMessage({ error: { error: 'InvalidCapacityError' } }))
      .toBe('La capacidad debe ser un número entero mayor que 0.')
  })

  it('usa message como respaldo y luego el texto por defecto', () => {
    expect(tableErrorMessage({ error: { error: 'Otro', message: 'Detalle' } })).toBe('Detalle')
    expect(tableErrorMessage({})).toBe('Error al guardar la mesa.')
  })
})

describe('validateTableForm', () => {
  it('acepta enteros mayores que 0', () => {
    expect(validateTableForm({ number: 3, capacity: 4 })).toBeNull()
  })

  it('rechaza número o capacidad nulos, decimales o <= 0', () => {
    expect(validateTableForm({ number: null, capacity: 4 })).toBe('El número de mesa debe ser un entero mayor que 0.')
    expect(validateTableForm({ number: 0, capacity: 4 })).toBe('El número de mesa debe ser un entero mayor que 0.')
    expect(validateTableForm({ number: 1, capacity: 2.5 })).toBe('La capacidad debe ser un número entero mayor que 0.')
    expect(validateTableForm({ number: 1, capacity: null })).toBe('La capacidad debe ser un número entero mayor que 0.')
  })
})
