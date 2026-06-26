// Публичный API ядра: разбор JSON, классификация значений и печать схемы essensio.
// Чистый TypeScript, без Vue. AST типов и их сериализация — из @essensio/engine;
// schemator своих типов essensio НЕ заводит.

import type { JsonValue, Names, Path } from './types'
import { branchesOf, flattenArrays, unionKeys, valuesForKey } from './merge'
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

// Группы одинаковых форм — для «применить ко всем похожим». Группируются только
// КОРТЕЖИ (по сигнатуре кортежа-ветви): отношение не именуется (таблица неявна), а
// скаляры/Пусто bulk-именования не имеют. Обходит те же ветви, что и эмиттер.
function collectGroups(values: JsonValue[], path: Path, groups: Map<string, Path[]>): void {
  const b = branchesOf(values)
  if (b.objects.length) {
    const sig = signatureOfSet(b.objects)
    groups.set(sig, [...(groups.get(sig) ?? []), path])
    for (const k of unionKeys(b.objects)) collectGroups(valuesForKey(b.objects, k), `${path}.${k}`, groups)
  }
  if (b.arrays.length) {
    collectGroups(flattenArrays(b.arrays), `${path}[]`, groups)
  }
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
