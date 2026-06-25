import type { JsonValue } from './types'
import { classifySet, isObjectValue } from './merge'

// Вид одного значения для отрисовки UI. Массив объектов с разными полями — это
// 'relation' (поля объединяются), а не 'raw': 'raw' остаётся только для реально
// несводимых массивов (объект+скаляр, разные скаляры).
export type ValueKind = 'scalar' | 'tuple' | 'relation' | 'empty' | 'raw'

export function valueKind(value: JsonValue): ValueKind {
  if (!isObjectValue(value) && !Array.isArray(value)) return 'scalar'
  if (Array.isArray(value)) {
    if (value.length === 0) return 'empty'
    return classifySet(value) === 'mixed' ? 'raw' : 'relation'
  }
  return 'tuple'
}
