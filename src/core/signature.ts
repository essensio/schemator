import type { JsonValue } from './types'
import { branchesOf, flattenArrays, unionKeys, valuesForKey } from './merge'

/**
 * Канонический ключ формы. Совпадение сигнатур означает узлы одной формы —
 * независимо от порядка ключей, объединения разнополевых объектов и порядка
 * элементов разнородного массива.
 */
export function signatureOfValue(value: JsonValue): string {
  return signatureOfSet([value])
}

/**
 * Сигнатура формы множества значений одной логической позиции. Строится из ветвей
 * (как и тип в эмиттере), поэтому сигнатура и печатаемый тип согласованы; union
 * ветвей даёт `(a|b)`, пустой массив — `{}[]` (элемент = пустой кортеж).
 */
export function signatureOfSet(values: JsonValue[]): string {
  const b = branchesOf(values)
  const parts: string[] = []
  if (b.objects.length) {
    const keys = unionKeys(b.objects).sort()
    parts.push(`{${keys.map((k) => `${JSON.stringify(k)}:${signatureOfSet(valuesForKey(b.objects, k))}`).join(',')}}`)
  }
  if (b.arrays.length) parts.push(`${signatureOfSet(flattenArrays(b.arrays))}[]`)
  for (const d of b.domains) parts.push(d)
  if (b.hasNull) parts.push('Пусто')
  if (parts.length === 0) return '{}'
  return parts.length === 1 ? parts[0] : `(${parts.join('|')})`
}
