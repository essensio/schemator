import { nodes as N, writeType, writeDecl } from '@essensio/engine'
import type { JsonValue, Names, Path } from './types'
import { foldBranches, type BranchAlg } from './merge'
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

// Тип позиции — алгебра типа над теми же ветвями, что и сигнатура (foldBranches),
// поэтому тип и сигнатура согласованы by construction. Носитель — функция
// (позиция, контекст) → тип: рекурсия в детей задаёт им путь (`path.k` поле,
// `path[]` элемент), а именование по пути решает combine.
//
// Отношение в союзе не именуется — его таблица в нотации неявна (имя получает лишь
// элемент); кортеж/скаляр/`Пусто` именуемы.
type TypeR = (path: Path, ctx: EmitCtx) => N.TypeExpr
const nameable = (tag: string): boolean => tag !== '[]'

const typeAlg: BranchAlg<TypeR> = {
  tuple: (fields) => (path, ctx) =>
    N.TTuple(fields.map(([k, child]) => [k, child(`${path}.${k}`, ctx)] as [string, N.TypeExpr])),
  relation: (elem) => (path, ctx) => N.TRel(elem(`${path}[]`, ctx)),
  domain: (d) => () => N.TName(d),
  empty: () => () => N.TName('Пусто'),
  combine: (parts) => (path, ctx) => {
    // Пустой массив/множество: элемент пока не наблюдался — пустой кортеж (заглушка).
    if (parts.length === 0) return named(N.TTuple([]), path, ctx)
    // Фаза 1 — построить тип каждого члена (рекурсия в детей; их декларации раньше,
    // пост-порядок). Фаза 2 — именование членов и союза (декларации этого уровня).
    const built = parts.map(({ tag, value }) => ({ tag, type: value(path, ctx) }))
    if (built.length === 1) {
      const m = built[0]
      return nameable(m.tag) ? named(m.type, path, ctx) : m.type
    }
    const members = built.map((m) => (nameable(m.tag) ? named(m.type, `${path}|${m.tag}`, ctx) : m.type))
    return named(N.TUnion(members), path, ctx)
  },
}

function typeAt(values: JsonValue[], path: Path, ctx: EmitCtx): N.TypeExpr {
  return foldBranches(values, typeAlg)(path, ctx)
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
