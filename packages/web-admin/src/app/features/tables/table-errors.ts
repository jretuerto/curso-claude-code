const MESSAGES: Record<string, string> = {
  DuplicatedTableNumberError: 'Ya existe otra mesa con ese número en el restaurante.',
  InvalidTableNumberError: 'El número de mesa debe ser un entero mayor que 0.',
  InvalidCapacityError: 'La capacidad debe ser un número entero mayor que 0.',
  InvalidTableStatusError: 'El estado de la mesa no es válido.',
  TableNotFoundError: 'La mesa no existe.'
}

/** Traduce el error de la API por su campo `error`; si no se conoce, usa `message` y después un texto genérico. */
export function tableErrorMessage(err: unknown): string {
  const body = (err as { error?: { error?: string; message?: string } } | null)?.error
  return (body?.error && MESSAGES[body.error]) || body?.message || 'Error al guardar la mesa.'
}

/** Validación en cliente: la API exige enteros > 0 (no admite cadenas ni decimales). */
export function validateTableForm(form: { number: number | null; capacity: number | null }): string | null {
  const isPositiveInt = (n: number | null) => typeof n === 'number' && Number.isInteger(n) && n > 0
  if (!isPositiveInt(form.number)) return MESSAGES['InvalidTableNumberError']
  if (!isPositiveInt(form.capacity)) return MESSAGES['InvalidCapacityError']
  return null
}
