import type { JsonValue } from './types'
import {
  classifySet,
  flattenArrays,
  scalarDomain,
  unionKeys,
  valuesForKey,
  type JsonObject,
} from './merge'

/**
 * Канонический ключ формы. Совпадение сигнатур означает узлы одной формы —
 * независимо от порядка ключей и с учётом объединения разнополевых объектов.
 */
export function signatureOfValue(value: JsonValue): string {
  return signatureOfSet([value])
}

/** Сигнатура слитой формы множества значений одной логической позиции. */
export function signatureOfSet(values: JsonValue[]): string {
  switch (classifySet(values)) {
    case 'empty':
      return '?'
    case 'mixed':
      return '[mixed]'
    case 'scalar':
      return scalarDomain(values[0])
    case 'array':
      return `${signatureOfSet(flattenArrays(values))}[]`
    case 'object': {
      const objs = values as JsonObject[]
      const keys = unionKeys(objs).sort()
      const fields = keys.map((k) => `${JSON.stringify(k)}:${signatureOfSet(valuesForKey(objs, k))}`)
      return `{${fields.join(',')}}`
    }
  }
}
