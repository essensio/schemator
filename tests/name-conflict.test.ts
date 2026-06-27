// Раздел SPEC «Имя описывает форму: конфликт имён». Тесты ядра (чистые функции):
// форма позиции из пути, предусловие ввода (Точка 1), снятие имени с печати на
// пересчёте (Точка 2). Покрывает «Закрытые сценарии» + три пути коллизии +
// обязательные кейсы приёмки (clear→переприсвоение, T|Пусто≠T).
import { describe, it, expect } from 'vitest'
import { shapeAt, valuesAt, nameFreeFor, mutedNames, emitEssensio } from '../src/core'
import type { JsonValue } from '../src/core'

// ── Форма позиции из пути: shapeAt = signatureOfSet(значения_в(path)) ─────────
describe('форма позиции из пути (shapeAt)', () => {
  it('корень, поле кортежа, элемент отношения', () => {
    const v: JsonValue = { orders: [{ qty: 1 }, { qty: 2 }] }
    expect(shapeAt(v, '$')).toBe('{"orders":{"qty":Число}[]}')
    expect(shapeAt(v, '$.orders[]')).toBe('{"qty":Число}')
    expect(shapeAt(v, '$.orders[].qty')).toBe('Число')
  })

  it('форма всего союза ≠ форма члена (член считается по его ветви)', () => {
    const v: JsonValue = [1, 'a']
    expect(shapeAt(v, '$[]')).toBe('(Число|Строка)') // весь союз
    expect(shapeAt(v, '$[]|Строка')).toBe('Строка') // член
    expect(shapeAt(v, '$[]')).not.toBe(shapeAt(v, '$[]|Строка'))
  })

  it('кортеж-член союза: форма = форма кортежа, не всего союза', () => {
    const v: JsonValue = [{ a: 1 }, null]
    expect(shapeAt(v, '$[]')).toBe('({"a":Число}|Пусто)')
    expect(shapeAt(v, '$[]|{}')).toBe('{"a":Число}')
  })

  it('T | Пусто ≠ T (необязательность — другая форма)', () => {
    // форма поля, которое то есть, то null, отличается от формы всегда-присутствующего поля
    const optional: JsonValue = [{ x: 1 }, { x: null }] // x: (Число|Пусто)
    const always: JsonValue = [{ x: 1 }, { x: 2 }] //     x: Число
    expect(shapeAt(optional, '$[].x')).toBe('(Число|Пусто)')
    expect(shapeAt(always, '$[].x')).toBe('Число')
    expect(shapeAt(optional, '$[].x')).not.toBe(shapeAt(always, '$[].x'))
  })

  it('исчезнувший путь — форма не вычислима (null)', () => {
    const v: JsonValue = { a: 1 }
    expect(shapeAt(v, '$.b')).toBeNull() // поля b нет
    expect(shapeAt(v, '$[]')).toBeNull() // не массив
    expect(valuesAt(v, '$.b')).toEqual([])
  })

  it('независимость формы от порядка ключей', () => {
    expect(shapeAt({ x: 1, y: 2 }, '$')).toBe(shapeAt({ y: 9, x: 8 }, '$'))
  })
})

// ── Точка 1: предусловие ввода (nameFreeFor) ─────────────────────────────────
describe('предусловие ввода: имя свободно для формы позиции (nameFreeFor)', () => {
  const v: JsonValue = { t: [{ a: 1 }], s: ['x', 'y'] } // $.t[] кортеж {a}; $.s[] Строка

  it('свободно: имя ещё не занято', () => {
    expect(nameFreeFor(v, {}, '$.t[]', 'Х')).toBe(true)
  })

  it('занято другой формой → не свободно (кортеж vs скаляр)', () => {
    expect(nameFreeFor(v, { '$.t[]': 'Х' }, '$.s[]', 'Х')).toBe(false)
  })

  it('та же форма под одним именем → свободно (повторное ручное именование)', () => {
    const two: JsonValue = { a: [{ x: 1 }], b: [{ x: 2 }] } // обе позиции {x:Число}
    expect(nameFreeFor(two, { '$.a[]': 'Точка' }, '$.b[]', 'Точка')).toBe(true)
  })

  it('коллизия внутри одного союза: член ≠ весь союз', () => {
    const u: JsonValue = [1, 'a']
    expect(nameFreeFor(u, { '$[]': 'Зн' }, '$[]|Строка', 'Зн')).toBe(false)
    expect(nameFreeFor(u, { '$[]|Строка': 'Зн' }, '$[]', 'Зн')).toBe(false)
  })

  it('исчезнувший из текста путь имя не занимает', () => {
    // имя «Х» висит на $.gone (нет в тексте) — позицию $.s[] не блокирует
    expect(nameFreeFor(v, { '$.gone': 'Х' }, '$.s[]', 'Х')).toBe(true)
  })

  it('имя, снятое с печати, не занимает форму (стык ввод↔снятие)', () => {
    // «N» стоит на двух разных формах одновременно → снято с печати; новый ввод «N» проходит
    const both: JsonValue = { t: [{ a: 1 }], s: ['x'] }
    const names = { '$.t[]': 'N', '$.s[]': 'N' } // N накрыло {a:Число} и Строку → снято
    expect(mutedNames(both, names).has('N')).toBe(true)
    // присвоение N на ещё одну позицию третьей формы — обязано пройти
    const v3: JsonValue = { t: [{ a: 1 }], s: ['x'], n: [1, 2] }
    const names3 = { '$.t[]': 'N', '$.s[]': 'N' }
    expect(nameFreeFor(v3, names3, '$.n[]', 'N')).toBe(true)
  })
})

// ── Точка 2: снятие имени с печати на пересчёте (emitEssensio) ────────────────
describe('пересчёт: имя на двух формах снимается с печати (emitEssensio)', () => {
  it('одно имя на кортеж и строку — обе позиции печатаются анонимно', () => {
    // «Х» накрыл {a:Число} ($.t[]) и Строку ($.s[]) → имя не печатается нигде
    const out = emitEssensio({ t: [{ a: 1 }], s: ['x'] }, { '$.t[]': 'Х', '$.s[]': 'Х' })
    expect(out).toBe('{t: {a: Число}[], s: Строка[]}')
    expect(out).not.toContain('Х')
  })

  it('результат снятия не зависит от порядка ключей', () => {
    const names = { '$.t[]': 'Х', '$.s[]': 'Х' }
    const a = emitEssensio({ t: [{ a: 1 }], s: ['x'] }, names)
    const b = emitEssensio({ s: ['x'], t: [{ a: 1 }] }, names)
    // обе печати анонимны и согласованы (имя снято), а не «побеждает» одна форма
    expect(a).toContain('{a: Число}[]')
    expect(a).toContain('Строка[]')
    expect(b).toContain('{a: Число}[]')
    expect(b).toContain('Строка[]')
    expect(a).not.toContain('Х')
    expect(b).not.toContain('Х')
  })

  it('коллизия внутри союза: весь союз и член под одним именем — имя снято', () => {
    // «Зн» на всём союзе и на члене-Строка — две разные формы → имя не печатается
    const out = emitEssensio([1, 'a'], { '$[]': 'Зн', '$[]|Строка': 'Зн' })
    expect(out).toBe('(Число | Строка)[]')
    expect(out).not.toContain('Зн')
  })

  it('та же форма под одним именем — печатается (НЕ снимается)', () => {
    const out = emitEssensio({ a: [{ x: 1 }], b: [{ x: 2 }] }, { '$.a[]': 'Точка', '$.b[]': 'Точка' })
    expect(out).toBe('Точка = {x: Число}\n\n{a: Точка[], b: Точка[]}')
  })

  it('вернули текст к совместимой форме — имя снова применяется', () => {
    const names = { '$.t[]': 'Х', '$.s[]': 'Х' }
    // несовместимо: кортеж vs строка → снято
    expect(emitEssensio({ t: [{ a: 1 }], s: ['x'] }, names)).not.toContain('Х')
    // совместимо: обе позиции — кортеж {a:Число} → имя печатается на обеих
    const ok = emitEssensio({ t: [{ a: 1 }], s: [{ a: 9 }] }, names)
    expect(ok).toBe('Х = {a: Число}\n\n{t: Х[], s: Х[]}')
  })
})

// ── Обязательный кейс приёмки: clear → переприсвоение того же имени ───────────
describe('clear → переприсвоение того же имени (исчезнувший путь не занимает форму)', () => {
  it('сняли имя с одной позиции — то же имя свободно для другой формы', () => {
    const v: JsonValue = { t: [{ a: 1 }], s: ['x'] }
    // «Х» стоит на кортеже; снят (clear = удалить из names); затем дать «Х» строке
    const afterClear = {} // имитируем состояние после clear($.t[])
    expect(nameFreeFor(v, afterClear, '$.s[]', 'Х')).toBe(true)
    expect(emitEssensio(v, { '$.s[]': 'Х' })).toBe('Х = Строка\n\n{t: {a: Число}[], s: Х[]}')
  })
})
