import type { JsonValue } from './types'
import { foldBranches, type BranchAlg } from './merge'

/**
 * Канонический ключ формы. Совпадение сигнатур означает узлы одной формы —
 * независимо от порядка ключей, объединения разнополевых объектов и порядка
 * элементов разнородного массива.
 */
export function signatureOfValue(value: JsonValue): string {
  return signatureOfSet([value])
}

// Алгебра сигнатуры над ветвями: кортеж — ключи в каноническом (отсортированном)
// порядке, чтобы сигнатура не зависела от порядка полей; союз ветвей — `(a|b)`;
// ноль ветвей (пустое множество/массив) — `{}` (элемент = пустой кортеж).
const sigAlg: BranchAlg<string> = {
  tuple: (fields) =>
    `{${fields
      .slice()
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([k, s]) => `${JSON.stringify(k)}:${s}`)
      .join(',')}}`,
  relation: (elem) => `${elem}[]`,
  domain: (d) => d,
  empty: () => 'Пусто',
  combine: (parts) =>
    parts.length === 0 ? '{}' : parts.length === 1 ? parts[0].value : `(${parts.map((p) => p.value).join('|')})`,
}

/**
 * Сигнатура формы множества значений одной логической позиции. Строится из ветвей
 * (тем же обходом foldBranches, что и тип в эмиттере), поэтому сигнатура и
 * печатаемый тип согласованы by construction.
 */
export function signatureOfSet(values: JsonValue[]): string {
  return foldBranches(values, sigAlg)
}
