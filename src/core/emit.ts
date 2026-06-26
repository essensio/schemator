import { nodes as N, writeType, writeDecl } from '@essensio/engine'
import type { JsonValue, Names, Path } from './types'
import { branchesOf, flattenArrays, unionKeys, valuesForKey } from './merge'

/**
 * Тип множества значений одной логической позиции. Разнородное множество даёт
 * union ветвей: кортеж (объекты), отношение (массивы), скалярные домены и Пусто.
 *
 * Именование по пути (имена дают только КОРТЕЖУ и СКАЛЯРУ):
 *   - кортеж — именуемый тип; скаляр — подтип-домен (`Количество = Число`);
 *   - **отношение НЕ именуется**: таблица сущности в нотации неявна (подразумевается
 *     `#` элемента), отдельного «типа-массива» нет — имя получает лишь его элемент;
 *   - в union имя получает только кортеж-ветвь; домены/Пусто/отношение — нет.
 * Порядок членов union канонический (как в `signature`): кортеж, отношение,
 * домены, Пусто.
 */
function typeAt(values: JsonValue[], path: Path, names: Names, decls: N.Decl[], seen: Set<string>): N.TypeExpr {
  const b = branchesOf(values)
  const tuple = b.objects.length
    ? N.TTuple(
        unionKeys(b.objects).map(
          (k) => [k, typeAt(valuesForKey(b.objects, k), `${path}.${k}`, names, decls, seen)] as [string, N.TypeExpr],
        ),
      )
    : null
  const rel = b.arrays.length ? N.TRel(typeAt(flattenArrays(b.arrays), `${path}[]`, names, decls, seen)) : null

  const members: N.TypeExpr[] = []
  if (tuple) members.push(tuple)
  if (rel) members.push(rel)
  for (const d of b.domains) members.push(N.TName(d))
  if (b.hasNull) members.push(N.TName('Пусто'))

  // Пустой массив: элемент пока не наблюдался — пустой кортеж (именуемая заглушка).
  if (members.length === 0) return named(N.TTuple([]), path, names, decls, seen)

  // Однородно: кортеж и скаляр именуемы; отношение — нет (оно неявно).
  if (members.length === 1) {
    const t = members[0]
    return t.kind === 'TRel' ? t : named(t, path, names, decls, seen)
  }
  // Union: имя получает только кортеж-ветвь.
  return N.TUnion(members.map((t) => (t === tuple ? named(t, path, names, decls, seen) : t)))
}

/**
 * Именование типа по пути: есть имя для пути — поднять отдельной декларацией и
 * сослаться по имени; иначе вернуть тип как есть. Декларации идут в пост-порядке
 * (зависимости раньше).
 */
function named(body: N.TypeExpr, path: Path, names: Names, decls: N.Decl[], seen: Set<string>): N.TypeExpr {
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
  const root = writeType(typeAt([value], '$', names, decls, new Set()))
  return decls.length ? `${decls.map(writeDecl).join('\n')}\n\n${root}` : root
}
