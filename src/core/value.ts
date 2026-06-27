import type { JsonValue } from './types'
import { branchesOf, isObjectValue } from './merge'

// Вид одного значения для отрисовки UI. Массив любой формы — это 'relation'
// (разнородный даёт union элемента, отдельного «сырья» нет); пустой — 'empty'.
export type ValueKind = 'scalar' | 'tuple' | 'relation' | 'empty'

export function valueKind(value: JsonValue): ValueKind {
  if (isObjectValue(value)) return 'tuple'
  if (Array.isArray(value)) return value.length === 0 ? 'empty' : 'relation'
  return 'scalar'
}

/**
 * Какой именуемый тип несёт элемент-тип массива на ВЕРХНЕМ уровне — чтобы UI знал,
 * показывать ли у массива контрол имени и какого вида.
 *
 * ВХОД   values — элементы массива (множество значений одной логической позиции).
 * ВЫХОД  'tuple' | 'scalar' | null.
 *
 * Согласовано с эмиттером (`emit.ts`): в союзе имя получает только кортеж-ветвь;
 * одиночный скаляр (или `Пусто`) именуется подтипом-доменом; отношение само не
 * именуется (таблица неявна); союз без кортежа именовать нечем.
 *
 * Правила (порядок важен):
 *   - есть объекты → 'tuple' (кортеж-ветвь, при любом порядке элементов);
 *   - иначе ровно один член-скаляр или `Пусто` (без массивов) → 'scalar';
 *   - иначе (отношение, разнородные скаляры, `T | Пусто`, пусто) → null.
 */
export function elementNameKind(values: JsonValue[]): 'tuple' | 'scalar' | null {
  const b = branchesOf(values)
  if (b.objects.length > 0) return 'tuple'
  const members = b.domains.length + (b.hasNull ? 1 : 0)
  if (b.arrays.length === 0 && members === 1) return 'scalar'
  return null
}

export type UnionMember = {
  /** Суффикс пути имени члена: `путь|тег`. Канонический: `{}`, `[]`, домен, `Пусто`. */
  tag: string
  /** Как член показывается в UI. */
  label: string
  /** Кортеж/`Пусто`/домен — именуемы; отношение — нет (таблица неявна). */
  kind: 'tuple' | 'scalar' | 'relation'
  nameable: boolean
}

/**
 * Члены союза элемент-типа массива — для UI: показать каждый член и дать ему имя
 * (путь `путь|тег`), плюс имя всему союзу (путь позиции). Согласовано с эмиттером.
 *
 * ВХОД   values — элементы массива.
 * ВЫХОД  члены в каноническом порядке (кортеж, отношение, домены, `Пусто`), ЕСЛИ это
 *        союз (≥2 членов); один тип или пусто → `[]` (союза нет, UI даёт один контрол).
 */
export function unionMembers(values: JsonValue[]): UnionMember[] {
  const b = branchesOf(values)
  const ms: UnionMember[] = []
  if (b.objects.length) ms.push({ tag: '{}', label: '{…}', kind: 'tuple', nameable: true })
  if (b.arrays.length) ms.push({ tag: '[]', label: '…[]', kind: 'relation', nameable: false })
  for (const d of b.domains) ms.push({ tag: d, label: d, kind: 'scalar', nameable: true })
  if (b.hasNull) ms.push({ tag: 'Пусто', label: 'Пусто', kind: 'scalar', nameable: true })
  return ms.length > 1 ? ms : []
}
