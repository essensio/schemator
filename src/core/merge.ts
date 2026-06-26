import type { JsonValue } from './types'

// Разбор множества значений на ветви (`branchesOf`) — единственный источник
// структуры; эмиттер, сигнатура и группы берут отсюда. Объекты с РАЗНЫМ набором
// полей сливаются в кортеж с ОБЪЕДИНЕНИЕМ полей; разнородные виды дают несколько
// ветвей (union). Никакого «сырья» — типизируется любое множество.

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

// Ветви множества значений одной логической позиции. Разнородное множество даёт
// несколько ветвей → union:
//   objects — все объекты (сливаются в один кортеж по объединению полей);
//   arrays  — все массивы (сливаются в одно отношение);
//   domains — различные скалярные домены (без Пусто), в каноне Число<Строка<Булево;
//   hasNull — присутствует ли null (домен Пусто — всегда последний член union).
// Одна ветвь → однородный тип; несколько → union; ноль ветвей → пустое множество.
const DOMAIN_RANK: Record<string, number> = { Число: 0, Строка: 1, Булево: 2 }

export type Branches = {
  objects: JsonObject[]
  arrays: JsonValue[]
  domains: string[]
  hasNull: boolean
}

export function branchesOf(values: JsonValue[]): Branches {
  const objects: JsonObject[] = []
  const arrays: JsonValue[] = []
  const domains = new Set<string>()
  let hasNull = false
  for (const v of values) {
    if (v === null) hasNull = true
    else if (isObjectValue(v)) objects.push(v)
    else if (Array.isArray(v)) arrays.push(v)
    else domains.add(scalarDomain(v))
  }
  return {
    objects,
    arrays,
    domains: [...domains].sort((a, b) => DOMAIN_RANK[a] - DOMAIN_RANK[b]),
    hasNull,
  }
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
