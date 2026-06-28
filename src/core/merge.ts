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

// ─────────────────────── свёртка по ветвям множества ───────────────────────
//
// Локальный аналог свёрток движка (foldExpr/…), но носитель — множество значений
// JsonValue, а не AST: движку про JSON знать незачем. Один обход ветвей
// (branchesOf) в каноническом порядке кортеж → отношение → домены → Пусто, с
// рекурсией в ключи кортежа и элементы отношения. Прячет «как разложено и в каком
// порядке» — алгебра задаёт лишь смысл на ветви и сборку. На нём согласованы
// signature (сигнатура формы) и emit (тип позиции): один обход — оба не разойдутся.
//
// combine получает части с тегом (`{}` кортеж, `[]` отношение, имя домена, `Пусто`):
// одна часть → она сама, несколько → союз; ноль частей (пустое множество/массив)
// — combine([]) сам решает (пустой кортеж).
export type BranchAlg<R> = {
  tuple: (fields: Array<[string, R]>) => R // поля в порядке первой встречи (unionKeys)
  relation: (elem: R) => R
  domain: (name: string) => R
  empty: () => R // ветвь null (домен Пусто)
  combine: (parts: Array<{ tag: string; value: R }>) => R
}

export function foldBranches<R>(values: JsonValue[], alg: BranchAlg<R>): R {
  const b = branchesOf(values)
  const parts: Array<{ tag: string; value: R }> = []
  if (b.objects.length) {
    const fields = unionKeys(b.objects).map(
      (k) => [k, foldBranches(valuesForKey(b.objects, k), alg)] as [string, R],
    )
    parts.push({ tag: '{}', value: alg.tuple(fields) })
  }
  if (b.arrays.length) parts.push({ tag: '[]', value: alg.relation(foldBranches(flattenArrays(b.arrays), alg)) })
  for (const d of b.domains) parts.push({ tag: d, value: alg.domain(d) })
  if (b.hasNull) parts.push({ tag: 'Пусто', value: alg.empty() })
  return alg.combine(parts)
}
