import { nodes as N, writeType, writeDecl } from '@essensio/engine'
import type { JsonValue, Names, Path } from './types'
import {
  classifySet,
  flattenArrays,
  scalarDomain,
  unionKeys,
  valuesForKey,
  type JsonObject,
} from './merge'

// Неизвестный элемент (пустой/несводимый массив) — не выражается типом нотации;
// печатаем маркером `?` (схему он не пройдёт парсером, но честно сигналит).
const UNKNOWN = N.TName('?')

/** Структурный тип множества значений одной позиции (без учёта имени узла). */
function structural(
  values: JsonValue[],
  path: Path,
  names: Names,
  decls: N.Decl[],
  seen: Set<string>,
): N.TypeExpr {
  const kind = classifySet(values)
  switch (kind) {
    case 'empty':
    case 'mixed':
      return UNKNOWN
    case 'scalar':
      return N.TName(scalarDomain(values[0]))
    case 'array':
      return N.TRel(inferType(flattenArrays(values), `${path}[]`, names, decls, seen))
    case 'object': {
      const objs = values as JsonObject[]
      return N.TTuple(
        unionKeys(objs).map(
          (k) =>
            [k, inferType(valuesForKey(objs, k), `${path}.${k}`, names, decls, seen)] as [
              string,
              N.TypeExpr,
            ],
        ),
      )
    }
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

/**
 * Тип позиции: имя (если узел назван по пути) или его структура. Именование
 * единообразно для любого узла. Декларации — в пост-порядке (зависимости раньше).
 */
function inferType(
  values: JsonValue[],
  path: Path,
  names: Names,
  decls: N.Decl[],
  seen: Set<string>,
): N.TypeExpr {
  const body = structural(values, path, names, decls, seen)
  const name = names[path]
  if (!name) return body
  if (!seen.has(name)) {
    seen.add(name)
    decls.push(N.Decl(name, body))
  }
  return N.TName(name)
}

/**
 * Описание схемы essensio: декларации именованных типов сверху, затем корневой
 * тип. Печать — движком (`writeDecl` / `writeType`).
 */
export function emitEssensio(value: JsonValue, names: Names): string {
  const decls: N.Decl[] = []
  const root = writeType(inferType([value], '$', names, decls, new Set()))
  return decls.length ? `${decls.map(writeDecl).join('\n')}\n\n${root}` : root
}
