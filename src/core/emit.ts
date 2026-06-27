import { nodes as N, writeType, writeDecl } from '@essensio/engine'
import type { JsonValue, Names, Path } from './types'
import { branchesOf, flattenArrays, unionKeys, valuesForKey } from './merge'
import { mutedNames } from './shape'

/**
 * Тип множества значений одной логической позиции. Разнородное множество даёт
 * union ветвей: кортеж (объекты), отношение (массивы), скалярные домены и Пусто.
 *
 * Именование по пути (имена дают КОРТЕЖУ, СКАЛЯРУ, `Пусто` и СОЮЗУ; отношение — нет):
 *   - один тип — по пути позиции: кортеж/скаляр/`Пусто` именуемы, отношение нет
 *     (его таблица в нотации неявна — имя получает лишь элемент);
 *   - союз именуем двояко: **весь союз** — по пути позиции (`T = A | B`), и **каждый
 *     именуемый член** — по пути `путь|тег` (`(A | B)`, где A, B — имена членов).
 *     Тег члена канонический: `{}` кортеж, `[]` отношение, имя домена, `Пусто`.
 * Порядок членов union канонический (как в `signature`): кортеж, отношение,
 * домены, `Пусто`.
 */
// Контекст печати: имена, накопитель деклараций, защита от повтора одной
// декларации (`seen`) и множество имён, снятых с печати (накрыли несколько форм).
type EmitCtx = { names: Names; decls: N.Decl[]; seen: Set<string>; muted: Set<string> }

function typeAt(values: JsonValue[], path: Path, ctx: EmitCtx): N.TypeExpr {
  const b = branchesOf(values)
  const tuple = b.objects.length
    ? N.TTuple(
        unionKeys(b.objects).map(
          (k) => [k, typeAt(valuesForKey(b.objects, k), `${path}.${k}`, ctx)] as [string, N.TypeExpr],
        ),
      )
    : null
  const rel = b.arrays.length ? N.TRel(typeAt(flattenArrays(b.arrays), `${path}[]`, ctx)) : null

  // Члены в каноническом порядке: тип, тег пути имени, и можно ли члену дать имя
  // (отношение в союзе не именуется — таблица неявна).
  const members: Array<{ type: N.TypeExpr; tag: string; nameable: boolean }> = []
  if (tuple) members.push({ type: tuple, tag: '{}', nameable: true })
  if (rel) members.push({ type: rel, tag: '[]', nameable: false })
  for (const d of b.domains) members.push({ type: N.TName(d), tag: d, nameable: true })
  if (b.hasNull) members.push({ type: N.TName('Пусто'), tag: 'Пусто', nameable: true })

  // Пустой массив: элемент пока не наблюдался — пустой кортеж (именуемая заглушка).
  if (members.length === 0) return named(N.TTuple([]), path, ctx)

  // Один тип — по пути позиции (отношение неявно, имени не даётся).
  if (members.length === 1) {
    const m = members[0]
    return m.nameable ? named(m.type, path, ctx) : m.type
  }
  // Союз: каждый именуемый член — по пути `путь|тег`; весь союз — по пути позиции.
  const memberTypes = members.map((m) => (m.nameable ? named(m.type, `${path}|${m.tag}`, ctx) : m.type))
  return named(N.TUnion(memberTypes), path, ctx)
}

/**
 * Именование типа по пути: есть имя для пути и оно не снято с печати — поднять
 * отдельной декларацией и сослаться по имени; иначе вернуть тип как есть.
 * Имя, накрывшее несколько форм (в `ctx.muted`), к печати не применяется — узел
 * печатается анонимно (Точка 2 спеки). Декларации идут в пост-порядке
 * (зависимости раньше).
 */
function named(body: N.TypeExpr, path: Path, ctx: EmitCtx): N.TypeExpr {
  const name = ctx.names[path]
  if (!name || ctx.muted.has(name)) return body
  if (!ctx.seen.has(name)) {
    ctx.seen.add(name)
    ctx.decls.push(N.Decl(name, body))
  }
  return N.TName(name)
}

/**
 * Описание схемы essensio: декларации именованных типов сверху, затем корневой
 * тип. Печать — движком (`writeDecl` / `writeType`). Имена, накрывшие под текущим
 * текстом несколько форм, снимаются с печати (`mutedNames`), поэтому печатается
 * только непротиворечивый набор имён — независимо от порядка обхода.
 */
export function emitEssensio(value: JsonValue, names: Names): string {
  const ctx: EmitCtx = { names, decls: [], seen: new Set(), muted: mutedNames(value, names) }
  const root = writeType(typeAt([value], '$', ctx))
  return ctx.decls.length ? `${ctx.decls.map(writeDecl).join('\n')}\n\n${root}` : root
}
