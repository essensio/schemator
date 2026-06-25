import type { JsonValue } from './types'

// Слияние множества значений в один тип. Массив объектов с РАЗНЫМ набором полей
// сводится к кортежу с ОБЪЕДИНЕНИЕМ полей (а не к «сырью»). Здесь — единственный
// источник классификации множества; сигнатура, эмиттер и группы берут отсюда.

export type JsonObject = { [k: string]: JsonValue }

export function isObjectValue(v: JsonValue): v is JsonObject {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

export function scalarDomain(v: JsonValue): string {
  if (v === null) return 'Пусто'
  switch (typeof v) {
    case 'boolean':
      return 'Булево'
    case 'number':
      return 'Число'
    default:
      return 'Строка'
  }
}

// Вид множества значений, стоящих в одной логической позиции:
//   object — все объекты (объединяем поля); array — все массивы (сливаем элементы);
//   scalar — все скаляры одного домена; empty — пусто; mixed — несводимо (сырьё).
export type SetKind = 'empty' | 'object' | 'array' | 'scalar' | 'mixed'

export function classifySet(values: JsonValue[]): SetKind {
  if (values.length === 0) return 'empty'
  if (values.every(isObjectValue)) return 'object'
  if (values.every((v) => Array.isArray(v))) return 'array'
  const domain = scalarDomain(values[0])
  const allSameScalar = values.every(
    (v) => !isObjectValue(v) && !Array.isArray(v) && scalarDomain(v) === domain,
  )
  return allSameScalar ? 'scalar' : 'mixed'
}

/** Объединение ключей всех объектов в порядке первой встречи. */
export function unionKeys(objs: JsonObject[]): string[] {
  const keys: string[] = []
  const seen = new Set<string>()
  for (const o of objs) {
    for (const k of Object.keys(o)) {
      if (!seen.has(k)) {
        seen.add(k)
        keys.push(k)
      }
    }
  }
  return keys
}

/** Значения данного ключа из тех объектов, где он присутствует. */
export function valuesForKey(objs: JsonObject[], key: string): JsonValue[] {
  const out: JsonValue[] = []
  for (const o of objs) if (key in o) out.push(o[key])
  return out
}

export function flattenArrays(arrays: JsonValue[]): JsonValue[] {
  const out: JsonValue[] = []
  for (const a of arrays) out.push(...(a as JsonValue[]))
  return out
}
