import type { JsonValue } from './types'
import { isObjectValue } from './merge'

// Вид одного значения для отрисовки UI. Массив любой формы — это 'relation'
// (разнородный даёт union элемента, отдельного «сырья» нет); пустой — 'empty'.
export type ValueKind = 'scalar' | 'tuple' | 'relation' | 'empty'

export function valueKind(value: JsonValue): ValueKind {
  if (isObjectValue(value)) return 'tuple'
  if (Array.isArray(value)) return value.length === 0 ? 'empty' : 'relation'
  return 'scalar'
}
