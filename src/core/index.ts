// Публичный API ядра: разбор JSON, классификация значений и печать схемы essensio.
// Чистый TypeScript, без Vue. AST типов и их сериализация — из @essensio/engine;
// schemator своих типов essensio НЕ заводит.

import type { JsonValue, Names } from './types'
import { emitEssensio } from './emit'

export type { JsonValue, Path, Names } from './types'
export type { ValueKind, UnionMember } from './value'
export { valueKind, elementNameKind, unionMembers } from './value'
export { signatureOfValue } from './signature'
export { emitEssensio } from './emit'
// Форма позиции из пути и предусловие свободы имени для ввода (см. shape.ts).
export { shapeAt, valuesAt, mutedNames, nameFreeFor } from './shape'
// Проверка имени типа — по грамматике движка, без своей регулярки.
export { isName as isValidTypeName } from '@essensio/engine'

export type Analysis =
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | { status: 'ok'; value: JsonValue; essensio: string }

/**
 * Полный разбор: из текста JSON и карты имён — значение и текст схемы. Чистая
 * функция: одни и те же вход и имена дают тот же результат. Имена, накрывшие
 * несколько форм, эмиттер снимает с печати (см. `emitEssensio`).
 */
export function analyze(source: string, names: Names): Analysis {
  if (source.trim() === '') return { status: 'empty' }

  let value: JsonValue
  try {
    value = JSON.parse(source) as JsonValue
  } catch (e) {
    return { status: 'error', message: (e as Error).message }
  }

  return { status: 'ok', value, essensio: emitEssensio(value, names) }
}
