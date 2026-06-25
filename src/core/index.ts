// Публичный API ядра: разбор JSON, классификация значений и печать схемы essensio.
// Чистый TypeScript, без Vue. AST типов и их сериализация — из @essensio/engine;
// schemator своих типов essensio НЕ заводит.

import type { JsonValue, Names, Path } from './types'
import { classifySet, flattenArrays, unionKeys, valuesForKey, type JsonObject } from './merge'
import { signatureOfSet } from './signature'
import { emitEssensio } from './emit'

export type { JsonValue, Path, Names } from './types'
export type { ValueKind } from './value'
export { valueKind } from './value'
export { signatureOfValue } from './signature'
export { emitEssensio } from './emit'
// Проверка имени типа — по грамматике движка, без своей регулярки.
export { isName as isValidTypeName } from '@essensio/engine'

export type Analysis =
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | {
      status: 'ok'
      value: JsonValue
      essensio: string
      /** Сигнатура формы → пути всех узлов этой формы (для «применить ко всем»). */
      groups: Map<string, Path[]>
    }

// Группы одинаковых форм (кортежи и отношения, по слитой сигнатуре) — для
// «применить ко всем похожим». Обходит ту же слитую структуру, что и эмиттер.
function collectGroups(values: JsonValue[], path: Path, groups: Map<string, Path[]>): void {
  const add = () => {
    const sig = signatureOfSet(values)
    const paths = groups.get(sig) ?? []
    paths.push(path)
    groups.set(sig, paths)
  }
  const kind = classifySet(values)
  if (kind === 'object') {
    add()
    const objs = values as JsonObject[]
    for (const k of unionKeys(objs)) collectGroups(valuesForKey(objs, k), `${path}.${k}`, groups)
  } else if (kind === 'array') {
    add()
    collectGroups(flattenArrays(values), `${path}[]`, groups)
  }
  // scalar / empty / mixed — не группируем (скаляры без bulk; сырьё/пусто не тип).
}

/**
 * Полный разбор: из текста JSON и карты имён — значение, текст схемы и группы
 * одинаковых форм. Чистая функция: одни и те же вход и имена дают тот же результат.
 */
export function analyze(source: string, names: Names): Analysis {
  if (source.trim() === '') return { status: 'empty' }

  let value: JsonValue
  try {
    value = JSON.parse(source) as JsonValue
  } catch (e) {
    return { status: 'error', message: (e as Error).message }
  }

  const groups = new Map<string, Path[]>()
  collectGroups([value], '$', groups)
  return { status: 'ok', value, essensio: emitEssensio(value, names), groups }
}
